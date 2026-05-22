import { describe, expect, it } from "vitest"

import {
  convertToN8nPayload,
  parseMeetingSummaryJson,
  validateMeetingText,
} from "./meeting"

const validSummary = {
  title: "AI Product Kick-off Meeting",
  summary: "AI 제품 킥오프 회의에서 핵심 기능과 일정이 논의되었습니다.",
  keyPoints: ["사용자 경험 개선", "실시간 번역 기능 검토"],
  decisions: ["핵심 기능 정의 문서를 작성한다."],
  actionItems: [
    {
      task: "핵심 기능 정의 문서 작성",
      owner: "Jane Kim",
      dueDate: "2026-05-22",
    },
    {
      task: "타임라인 초안 공유",
      owner: null,
      dueDate: null,
    },
  ],
  tags: ["제품 기획", "실시간 번역"],
}

describe("회의 분석 결과 JSON 파싱", () => {
  it("정상 JSON 응답을 MeetingSummary로 파싱한다", () => {
    expect(parseMeetingSummaryJson(JSON.stringify(validSummary))).toEqual(
      validSummary
    )
  })

  it("마크다운 코드블럭으로 감싸진 JSON도 방어적으로 파싱한다", () => {
    expect(
      parseMeetingSummaryJson(`\`\`\`json\n${JSON.stringify(validSummary)}\n\`\`\``)
    ).toEqual(validSummary)
  })

  it("필수 필드가 없는 JSON은 거부한다", () => {
    expect(() => parseMeetingSummaryJson('{"title":"누락된 회의록"}')).toThrow(
      "AI 분석 결과 JSON 형식이 올바르지 않습니다."
    )
  })
})

describe("빈 회의 텍스트 입력 처리", () => {
  it("공백뿐인 회의 텍스트는 거부한다", () => {
    expect(() => validateMeetingText({ meetingText: "   " })).toThrow(
      "회의 텍스트를 입력해주세요."
    )
  })

  it("정상 회의 텍스트는 앞뒤 공백을 제거해 반환한다", () => {
    expect(validateMeetingText({ meetingText: "  회의 내용입니다.  " })).toBe(
      "회의 내용입니다."
    )
  })
})

describe("n8n payload 길이 제한", () => {
  it("Notion paragraph 제한을 넘지 않도록 긴 목록과 요약을 줄인다", () => {
    const longText = "가".repeat(2500)
    const payload = convertToN8nPayload({
      ...validSummary,
      summary: longText,
      keyPoints: Array.from({ length: 20 }, (_, index) =>
        `${index + 1}. ${"핵심 논의 ".repeat(40)}`
      ),
      decisions: Array.from({ length: 20 }, (_, index) =>
        `${index + 1}. ${"결정 사항 ".repeat(40)}`
      ),
      actionItems: [
        {
          task: "작업 ".repeat(100),
          owner: "Jane Kim",
          dueDate: null,
        },
      ],
      tags: Array.from({ length: 20 }, (_, index) => `tag-${index}`),
    })

    expect(payload.summary.length).toBeLessThanOrEqual(900)
    expect(payload.key_points.join("\n").length).toBeLessThanOrEqual(1900)
    expect(payload.decisions.join("\n").length).toBeLessThanOrEqual(1900)
    expect(payload.action_items[0].task.length).toBeLessThanOrEqual(140)
    expect(payload.tags).toHaveLength(8)
    expect(payload.transcript).toBe("")
  })
})
