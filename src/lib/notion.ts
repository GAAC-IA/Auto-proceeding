import type { CreatePageParameters } from "@notionhq/client"

import type { ActionItem, MeetingSummary } from "@/lib/meeting"

type NotionProperties = NonNullable<CreatePageParameters["properties"]>
type RichTextItem = Extract<
  NotionProperties[string],
  { rich_text: unknown }
>["rich_text"][number]
type TitleItem = Extract<
  NotionProperties[string],
  { title: unknown }
>["title"][number]

const MAX_TEXT_CONTENT_LENGTH = 1900

export function meetingSummaryToNotionProperties(
  summary: MeetingSummary,
  createdAt: Date = new Date()
): NotionProperties {
  return {
    Title: {
      title: toTitle(summary.title || "Untitled Meeting"),
    },
    Summary: {
      rich_text: toRichText(summary.summary),
    },
    "Key Points": {
      rich_text: toRichText(formatList(summary.keyPoints)),
    },
    Decisions: {
      rich_text: toRichText(formatList(summary.decisions)),
    },
    "Action Items": {
      rich_text: toRichText(formatActionItems(summary.actionItems)),
    },
    Tags: {
      multi_select: uniqueTags(summary.tags).map((name) => ({ name })),
    },
    "Created At": {
      date: {
        start: createdAt.toISOString(),
      },
    },
  }
}

function toTitle(value: string): TitleItem[] {
  return chunkText(value).map((content) => ({
    text: { content },
  }))
}

function toRichText(value: string): RichTextItem[] {
  return chunkText(value).map((content) => ({
    text: { content },
  }))
}

function chunkText(value: string): string[] {
  const normalized = value.trim() || "-"
  const chunks: string[] = []

  for (
    let index = 0;
    index < normalized.length;
    index += MAX_TEXT_CONTENT_LENGTH
  ) {
    chunks.push(normalized.slice(index, index + MAX_TEXT_CONTENT_LENGTH))
  }

  return chunks
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "없음"
  }

  return items.map((item) => `- ${item}`).join("\n")
}

function formatActionItems(actionItems: ActionItem[]): string {
  if (actionItems.length === 0) {
    return "없음"
  }

  return actionItems
    .map((item) => {
      const owner = item.owner ?? "미지정"
      const dueDate = item.dueDate ?? "미정"

      return `- ${item.task} | 담당자: ${owner} | 마감일: ${dueDate}`
    })
    .join("\n")
}

function uniqueTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
  )
}
