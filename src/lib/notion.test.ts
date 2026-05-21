import { describe, expect, it } from "vitest"

import type { MeetingSummary } from "./meeting"
import { meetingSummaryToNotionProperties } from "./notion"

const summary: MeetingSummary = {
  title: "AI Product Kick-off Meeting",
  summary: "AI 제품 킥오프 회의 요약입니다.",
  keyPoints: ["핵심 기능 정의", "실시간 번역 검토"],
  decisions: ["문서 작성 후 다음 회의에서 검토한다."],
  actionItems: [
    {
      task: "핵심 기능 정의 문서 작성",
      owner: "Jane Kim",
      dueDate: "2026-05-22",
    },
    {
      task: "마일스톤 초안 공유",
      owner: null,
      dueDate: null,
    },
  ],
  tags: ["제품 기획", "실시간 번역", "제품 기획"],
}

describe("Notion 저장용 데이터 변환", () => {
  it("회의 요약을 Notion Database 속성 형식으로 변환한다", () => {
    const properties = meetingSummaryToNotionProperties(
      summary,
      new Date("2026-05-21T00:00:00.000Z")
    )

    expect(properties.Title).toMatchObject({
      title: [{ text: { content: summary.title } }],
    })
    expect(properties.Summary).toMatchObject({
      rich_text: [{ text: { content: summary.summary } }],
    })
    expect(properties["Key Points"]).toMatchObject({
      rich_text: [
        { text: { content: "- 핵심 기능 정의\n- 실시간 번역 검토" } },
      ],
    })
    expect(properties.Decisions).toMatchObject({
      rich_text: [
        { text: { content: "- 문서 작성 후 다음 회의에서 검토한다." } },
      ],
    })
    expect(properties["Action Items"]).toMatchObject({
      rich_text: [
        {
          text: {
            content:
              "- 핵심 기능 정의 문서 작성 | 담당자: Jane Kim | 마감일: 2026-05-22\n- 마일스톤 초안 공유 | 담당자: 미지정 | 마감일: 미정",
          },
        },
      ],
    })
    expect(properties.Tags).toMatchObject({
      multi_select: [{ name: "제품 기획" }, { name: "실시간 번역" }],
    })
    expect(properties["Created At"]).toMatchObject({
      date: { start: "2026-05-21T00:00:00.000Z" },
    })
  })

  it("빈 배열은 Notion rich_text에 없음으로 변환한다", () => {
    const properties = meetingSummaryToNotionProperties({
      ...summary,
      keyPoints: [],
      decisions: [],
      actionItems: [],
      tags: [],
    })

    expect(properties["Key Points"]).toMatchObject({
      rich_text: [{ text: { content: "없음" } }],
    })
    expect(properties.Decisions).toMatchObject({
      rich_text: [{ text: { content: "없음" } }],
    })
    expect(properties["Action Items"]).toMatchObject({
      rich_text: [{ text: { content: "없음" } }],
    })
    expect(properties.Tags).toMatchObject({
      multi_select: [],
    })
  })
})
