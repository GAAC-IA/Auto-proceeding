import { Client } from "@notionhq/client"

import {
  extractNotionPageSections,
  toNotionMeetingRecord,
  type NotionMeetingRecord,
} from "@/lib/notion"

export async function fetchNotionMeetingRecords(): Promise<NotionMeetingRecord[]> {
  const notionApiKey = process.env.NOTION_API_KEY
  const notionDatabaseId = process.env.NOTION_DATABASE_ID

  if (!notionApiKey || !notionDatabaseId) {
    throw new Error("NOTION_API_KEY 또는 NOTION_DATABASE_ID가 설정되지 않았습니다.")
  }

  const notion = new Client({ auth: notionApiKey })
  const dataSourceId = await resolveDataSourceId(notion, notionDatabaseId)
  const response = await queryMeetings(notion, dataSourceId)
  const pages: unknown[] = Array.isArray(response.results)
    ? [...response.results]
    : []

  const records = await Promise.all(
    pages.map(async (page) => {
      const pageId = getPageId(page)
      const sections = pageId
        ? extractNotionPageSections(await listPageBlocks(notion, pageId))
        : {}

      return toNotionMeetingRecord(page, sections)
    })
  )

  return records.sort((a, b) => {
    const left = a.meetingDate ? new Date(a.meetingDate).getTime() : 0
    const right = b.meetingDate ? new Date(b.meetingDate).getTime() : 0
    return right - left
  })
}

async function resolveDataSourceId(notion: Client, databaseIdOrDataSourceId: string) {
  try {
    const database = await notion.databases.retrieve({
      database_id: databaseIdOrDataSourceId,
    })

    if ("data_sources" in database && database.data_sources[0]?.id) {
      return database.data_sources[0].id
    }
  } catch {
    return databaseIdOrDataSourceId
  }

  return databaseIdOrDataSourceId
}

async function queryMeetings(notion: Client, dataSourceId: string) {
  try {
    return await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 50,
      sorts: [{ property: "회의 일자", direction: "descending" }],
    })
  } catch {
    return notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 50,
    })
  }
}

async function listPageBlocks(notion: Client, pageId: string) {
  const response = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  })

  return Array.isArray(response.results) ? response.results : []
}

function getPageId(page: unknown) {
  if (typeof page === "object" && page !== null && "id" in page) {
    const id = (page as { id?: unknown }).id
    return typeof id === "string" ? id : null
  }

  return null
}
