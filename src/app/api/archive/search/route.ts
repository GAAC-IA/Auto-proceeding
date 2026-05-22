import OpenAI from "openai"

import type { NotionMeetingRecord } from "@/lib/notion"
import { fetchNotionMeetingRecords } from "@/lib/notion-records"
import { requireAuthenticatedUser } from "@/lib/server-auth"

export const runtime = "nodejs"

const CHAT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini"
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
const MAX_CONTEXT_RECORDS = 5

type SearchRequest = {
  query?: unknown
}

type RankedRecord = {
  record: NotionMeetingRecord
  content: string
  score: number
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.ok) {
      return auth.response
    }

    const query = validateSearchQuery(await request.json())

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const records = await fetchNotionMeetingRecords()
    if (records.length === 0) {
      return Response.json({
        answer: "검색할 Notion 회의록이 아직 없습니다.",
        sources: [],
      })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const candidates = records
      .map((record) => ({
        record,
        content: buildSearchableText(record),
      }))
      .filter((item) => item.content.trim().length > 0)

    const embeddings = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: [query, ...candidates.map((candidate) => candidate.content)],
    })

    const [queryEmbedding, ...recordEmbeddings] = embeddings.data.map(
      (item) => item.embedding
    )
    const rankedRecords = candidates
      .map((candidate, index): RankedRecord => ({
        ...candidate,
        score: cosineSimilarity(queryEmbedding, recordEmbeddings[index] ?? []),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CONTEXT_RECORDS)

    const context = rankedRecords
      .map(({ record, content }, index) => {
        return [
          `[${index + 1}] ${record.title}`,
          `회의일: ${record.meetingDate ?? "날짜 없음"}`,
          `태그: ${record.tags.length > 0 ? record.tags.join(", ") : "없음"}`,
          content,
        ].join("\n")
      })
      .join("\n\n---\n\n")

    const response = await openai.responses.create({
      model: CHAT_MODEL,
      instructions: [
        "너는 Notion 회의록 아카이브를 검색하는 RAG 어시스턴트다.",
        "주어진 회의록 컨텍스트만 근거로 한국어로 답한다.",
        "확실하지 않은 내용은 추측하지 말고 확인이 필요하다고 말한다.",
        "답변 끝에 참고한 회의록 제목을 짧게 언급한다.",
      ].join("\n"),
      input: `질문:\n${query}\n\n회의록 컨텍스트:\n${context}`,
    })

    return Response.json({
      answer: response.output_text || "검색 결과를 바탕으로 답변을 생성하지 못했습니다.",
      sources: rankedRecords.map(({ record, content, score }) => ({
        id: record.id,
        title: record.title,
        summary: record.summary,
        meetingDate: record.meetingDate,
        tags: record.tags,
        url: record.url,
        snippet: content.slice(0, 500),
        score,
      })),
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "아카이브 검색 중 알 수 없는 오류가 발생했습니다."

    return Response.json({ error: message }, { status: 400 })
  }
}

function validateSearchQuery(body: SearchRequest) {
  if (typeof body.query !== "string" || body.query.trim().length < 2) {
    throw new Error("검색 질문을 2자 이상 입력해 주세요.")
  }

  return body.query.trim()
}

function buildSearchableText(record: NotionMeetingRecord) {
  return [
    `제목: ${record.title}`,
    `요약: ${record.summary}`,
    `태그: ${record.tags.join(", ")}`,
    record.keyPoints?.length ? `핵심 논의: ${record.keyPoints.join("\n")}` : "",
    record.decisions?.length ? `결정사항: ${record.decisions.join("\n")}` : "",
    record.actionItems?.length
      ? `액션 아이템: ${record.actionItems
          .map((item) => [item.task, item.owner, item.dueDate].filter(Boolean).join(" / "))
          .join("\n")}`
      : "",
    record.transcript ? `원문: ${record.transcript}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0
  }

  let dotProduct = 0
  let leftMagnitude = 0
  let rightMagnitude = 0

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0
    const rightValue = right[index] ?? 0
    dotProduct += leftValue * rightValue
    leftMagnitude += leftValue * leftValue
    rightMagnitude += rightValue * rightValue
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude))
}
