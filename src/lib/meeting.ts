import { z } from "zod"

const NOTION_TEXT_LIMIT = 1900
const SUMMARY_LIMIT = 900
const LIST_ITEM_LIMIT = 160
const ACTION_TASK_LIMIT = 140
const MAX_KEY_POINTS = 8
const MAX_DECISIONS = 6
const MAX_ACTION_ITEMS = 8
const MAX_TAGS = 8

export const ActionItemSchema = z
  .object({
    task: z.string().describe("실행 가능한 작업 단위"),
    owner: z
      .string()
      .nullable()
      .describe("담당자가 명확하지 않으면 null"),
    dueDate: z
      .string()
      .nullable()
      .describe("마감일이 명확하지 않으면 null"),
  })
  .strict()

export const MeetingSummarySchema = z
  .object({
    title: z.string().describe("회의 제목"),
    summary: z.string().describe("업무용 회의록 형식의 요약"),
    keyPoints: z.array(z.string()).describe("핵심 논의 내용"),
    decisions: z.array(z.string()).describe("결정사항"),
    actionItems: z.array(ActionItemSchema).describe("액션 아이템 목록"),
    tags: z.array(z.string()).describe("회의 태그"),
  })
  .strict()

export const AnalyzeRequestSchema = z
  .object({
    meetingText: z.string(),
  })
  .strict()

export type ActionItem = z.infer<typeof ActionItemSchema>
export type MeetingSummary = z.infer<typeof MeetingSummarySchema>

export function validateMeetingText(input: unknown): string {
  const parsed = AnalyzeRequestSchema.safeParse(input)

  if (!parsed.success) {
    throw new Error("회의 텍스트를 문자열로 입력해주세요.")
  }

  const meetingText = parsed.data.meetingText.trim()

  if (!meetingText) {
    throw new Error("회의 텍스트를 입력해주세요.")
  }

  return meetingText
}

export function parseMeetingSummaryJson(input: unknown): MeetingSummary {
  const payload = typeof input === "string" ? parseJsonString(input) : input
  const parsed = MeetingSummarySchema.safeParse(payload)

  if (!parsed.success) {
    throw new Error("AI 분석 결과 JSON 형식이 올바르지 않습니다.")
  }

  return parsed.data
}

function parseJsonString(raw: string): unknown {
  const trimmed = raw.trim()
  const withoutFence =
    trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim() ??
    trimmed

  if (!withoutFence) {
    throw new Error("AI 분석 결과가 비어 있습니다.")
  }

  try {
    return JSON.parse(withoutFence)
  } catch {
    throw new Error("AI 분석 결과를 JSON으로 파싱할 수 없습니다.")
  }
}

export function convertToN8nPayload(summary: MeetingSummary, transcriptText = "") {
  const keyPoints = truncateList(
    summary.keyPoints,
    MAX_KEY_POINTS,
    LIST_ITEM_LIMIT
  )
  const decisions = truncateList(
    summary.decisions,
    MAX_DECISIONS,
    LIST_ITEM_LIMIT
  )

  return {
    title: truncateText(summary.title, 120) || "회의록 자동 생성",
    summary: truncateText(summary.summary || "요약 정보 없음", SUMMARY_LIMIT),
    key_points: fitJoinedText(keyPoints, NOTION_TEXT_LIMIT),
    decisions: fitJoinedText(decisions, NOTION_TEXT_LIMIT),
    action_items: (summary.actionItems || []).slice(0, MAX_ACTION_ITEMS).map((item) => ({
      assignee: item.owner || "미지정",
      task: truncateText(item.task || "", ACTION_TASK_LIMIT),
      due_date: item.dueDate || null,
    })),
    tags: truncateList(summary.tags, MAX_TAGS, 24),
    transcript: truncateText(transcriptText, NOTION_TEXT_LIMIT),
  }
}

function truncateList(items: string[] = [], maxItems: number, maxLength: number) {
  return items
    .slice(0, maxItems)
    .map((item) => truncateText(item, maxLength))
    .filter(Boolean)
}

function fitJoinedText(items: string[], maxLength: number) {
  const fitted: string[] = []
  let currentLength = 0

  for (const item of items) {
    const nextLength = currentLength + (fitted.length > 0 ? 1 : 0) + item.length

    if (nextLength > maxLength) {
      break
    }

    fitted.push(item)
    currentLength = nextLength
  }

  return fitted
}

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim()

  if (trimmed.length <= maxLength) {
    return trimmed
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}
