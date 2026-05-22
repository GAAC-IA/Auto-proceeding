import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"

import {
  MeetingSummarySchema,
  parseMeetingSummaryJson,
  validateMeetingText,
} from "@/lib/meeting"
import { requireAuthenticatedUser } from "@/lib/server-auth"

export const runtime = "nodejs"

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini"

const ANALYZE_INSTRUCTIONS = `
너는 업무 회의록을 작성하는 전문 어시스턴트다.
회의 내용을 단순 요약하지 말고 실무자가 바로 활용할 수 있는 회의록으로 정리한다.
반드시 JSON만 반환한다.
markdown 코드블럭은 절대 사용하지 않는다.
없는 담당자나 마감일은 null로 처리한다.
액션 아이템은 실행 가능한 작업 단위로 분리한다.
`.trim()

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.ok) {
      return auth.response
    }

    const meetingText = validateMeetingText(await request.json())

    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await openai.responses.parse({
      model: OPENAI_MODEL,
      instructions: ANALYZE_INSTRUCTIONS,
      input: `회의 원문:\n${meetingText}`,
      text: {
        format: zodTextFormat(MeetingSummarySchema, "meeting_summary"),
      },
    })

    if (!response.output_parsed) {
      return Response.json(
        { error: "AI 분석 결과를 생성하지 못했습니다." },
        { status: 502 }
      )
    }

    const summary = parseMeetingSummaryJson(response.output_parsed)

    return Response.json({ summary })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "회의록 분석 중 알 수 없는 오류가 발생했습니다."

    return Response.json({ error: message }, { status: 400 })
  }
}
