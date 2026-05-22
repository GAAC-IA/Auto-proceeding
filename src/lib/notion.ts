import type { ActionItem } from "@/lib/meeting"

export type NotionMeetingRecord = {
  id: string
  title: string
  summary: string
  tags: string[]
  meetingDate: string | null
  url: string | null
  keyPoints?: string[]
  decisions?: string[]
  actionItems?: ActionItem[]
  transcript?: string
}

type NotionRichText = {
  plain_text?: string
}

type NotionSelectOption = {
  name?: string
}

type NotionDate = {
  start?: string | null
}

type NotionProperty = {
  type?: string
  title?: NotionRichText[]
  rich_text?: NotionRichText[]
  multi_select?: NotionSelectOption[]
  date?: NotionDate | null
}

type NotionPage = {
  id?: string
  url?: string
  created_time?: string
  properties?: Record<string, NotionProperty>
}

type NotionBlock = {
  type?: string
  paragraph?: { rich_text?: NotionRichText[] }
  heading_1?: { rich_text?: NotionRichText[] }
  heading_2?: { rich_text?: NotionRichText[] }
  heading_3?: { rich_text?: NotionRichText[] }
  bulleted_list_item?: { rich_text?: NotionRichText[] }
  numbered_list_item?: { rich_text?: NotionRichText[] }
}

type NotionPageSections = {
  keyPoints: string[]
  decisions: string[]
  actionItems: ActionItem[]
  transcript?: string
}

const PROPERTY_NAMES = {
  title: ["회의 제목", "Title", "title", "Name", "이름"],
  summary: ["요약", "Summary", "summary"],
  tags: ["태그", "Tags", "tags"],
  meetingDate: ["회의 일자", "Created At", "createdAt", "Date", "date"],
} as const

export function toNotionMeetingRecord(
  page: unknown,
  sections: Partial<NotionPageSections> = {}
): NotionMeetingRecord {
  const notionPage = asNotionPage(page)
  const properties = notionPage.properties ?? {}

  return {
    id: notionPage.id ?? `notion-${notionPage.created_time ?? "unknown"}`,
    title:
      getTextProperty(properties, PROPERTY_NAMES.title) || "제목 없는 회의록",
    summary: getTextProperty(properties, PROPERTY_NAMES.summary),
    tags: getMultiSelectProperty(properties, PROPERTY_NAMES.tags),
    meetingDate:
      getDateProperty(properties, PROPERTY_NAMES.meetingDate) ??
      notionPage.created_time ??
      null,
    url: notionPage.url ?? null,
    keyPoints: sections.keyPoints,
    decisions: sections.decisions,
    actionItems: sections.actionItems,
    transcript: sections.transcript,
  }
}

export function extractNotionPageSections(blocks: unknown[]): NotionPageSections {
  const sections: NotionPageSections = {
    keyPoints: [],
    decisions: [],
    actionItems: [],
  }
  let activeSection: keyof NotionPageSections | null = null

  for (const block of blocks) {
    const notionBlock = asNotionBlock(block)
    const text = getBlockText(notionBlock).trim()

    if (!text) {
      continue
    }

    if (isHeadingBlock(notionBlock)) {
      activeSection = getSectionFromHeading(text)
      continue
    }

    if (activeSection === "keyPoints") {
      const discussion = splitDiscussionText(text)
      sections.keyPoints.push(...discussion.keyPoints)
      sections.decisions.push(...discussion.decisions)
      continue
    }

    if (activeSection === "decisions") {
      sections.decisions.push(...splitListText(text))
      continue
    }

    if (activeSection === "actionItems") {
      sections.actionItems.push(...splitListText(text).map(parseActionItem))
      continue
    }

    if (activeSection === "transcript") {
      sections.transcript = [sections.transcript, text].filter(Boolean).join("\n")
    }
  }

  return sections
}

function asNotionPage(value: unknown): NotionPage {
  return typeof value === "object" && value !== null ? (value as NotionPage) : {}
}

function asNotionBlock(value: unknown): NotionBlock {
  return typeof value === "object" && value !== null ? (value as NotionBlock) : {}
}

function getTextProperty(
  properties: Record<string, NotionProperty>,
  candidates: readonly string[]
) {
  const property = getProperty(properties, candidates)

  if (!property) {
    return ""
  }

  if (property.type === "title") {
    return richTextToPlainText(property.title)
  }

  if (property.type === "rich_text") {
    return richTextToPlainText(property.rich_text)
  }

  return richTextToPlainText(property.title) || richTextToPlainText(property.rich_text)
}

function getMultiSelectProperty(
  properties: Record<string, NotionProperty>,
  candidates: readonly string[]
) {
  const property = getProperty(properties, candidates)
  return (
    property?.multi_select
      ?.map((option) => option.name)
      .filter((name): name is string => Boolean(name)) ?? []
  )
}

function getDateProperty(
  properties: Record<string, NotionProperty>,
  candidates: readonly string[]
) {
  const property = getProperty(properties, candidates)
  return property?.date?.start ?? null
}

function getProperty(
  properties: Record<string, NotionProperty>,
  candidates: readonly string[]
) {
  return candidates.map((candidate) => properties[candidate]).find(Boolean)
}

function richTextToPlainText(richText: NotionRichText[] | undefined) {
  return richText?.map((text) => text.plain_text ?? "").join("").trim() ?? ""
}

function getBlockText(block: NotionBlock) {
  if (block.type === "paragraph") {
    return richTextToPlainText(block.paragraph?.rich_text)
  }

  if (block.type === "heading_1") {
    return richTextToPlainText(block.heading_1?.rich_text)
  }

  if (block.type === "heading_2") {
    return richTextToPlainText(block.heading_2?.rich_text)
  }

  if (block.type === "heading_3") {
    return richTextToPlainText(block.heading_3?.rich_text)
  }

  if (block.type === "bulleted_list_item") {
    return richTextToPlainText(block.bulleted_list_item?.rich_text)
  }

  if (block.type === "numbered_list_item") {
    return richTextToPlainText(block.numbered_list_item?.rich_text)
  }

  return ""
}

function isHeadingBlock(block: NotionBlock) {
  return (
    block.type === "heading_1" ||
    block.type === "heading_2" ||
    block.type === "heading_3"
  )
}

function getSectionFromHeading(text: string): keyof NotionPageSections | null {
  if (text.includes("결정") && !text.includes("핵심")) {
    return "decisions"
  }

  if (text.includes("핵심") || text.includes("결정")) {
    return "keyPoints"
  }

  if (text.includes("액션") || text.includes("담당")) {
    return "actionItems"
  }

  if (text.includes("스크립트") || text.includes("대화")) {
    return "transcript"
  }

  return null
}

function splitListText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean)
}

function splitDiscussionText(text: string) {
  const result = {
    keyPoints: [] as string[],
    decisions: [] as string[],
  }
  let active: "keyPoints" | "decisions" = "keyPoints"

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.replace(/^[-•*\s]+/, "").trim()

    if (!trimmed) {
      continue
    }

    if (trimmed.includes("핵심")) {
      active = "keyPoints"
      continue
    }

    if (trimmed.includes("결정")) {
      active = "decisions"
      continue
    }

    result[active].push(trimmed)
  }

  return result
}

function parseActionItem(text: string): ActionItem {
  const owner = text.match(/담당[:\s]+([^|)]+)/)?.[1]?.trim() ?? null
  const dueDate = text.match(/마감[:\s]+([^|)]+)/)?.[1]?.trim() ?? null

  return {
    task: text.replace(/\((담당|마감)[^)]+\)/g, "").trim() || text,
    owner: owner === "미정" ? null : owner,
    dueDate: dueDate === "미정" ? null : dueDate,
  }
}
