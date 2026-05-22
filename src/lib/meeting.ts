import { z } from "zod"

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

export function convertToN8nPayload(summary: MeetingSummary, transcriptText?: string) {
  return {
    title: summary.title || "회의록 자동 생성",
    summary: summary.summary || "요약 정보 없음",
    key_points: summary.keyPoints || [],
    decisions: summary.decisions || [],
    action_items: (summary.actionItems || []).map((item) => ({
      assignee: item.owner || "미지정",
      task: item.task || "",
      due_date: item.dueDate || null,
    })),
    tags: summary.tags || [],
    transcript: transcriptText || "",
  }
}

