import { Client } from "@notionhq/client"

import {
  extractNotionPageSections,
  toNotionMeetingRecord,
  type NotionMeetingRecord,
} from "@/lib/notion"
import { getNotionConnection } from "@/lib/notion-connections"

type FetchNotionMeetingRecordsOptions = {
  userId: string
}

export async function fetchNotionMeetingRecords(
  options: FetchNotionMeetingRecordsOptions
): Promise<NotionMeetingRecord[]> {
  const credentials = await getUserNotionCredentials(options.userId)

  const notion = new Client({ auth: credentials.apiKey })
  const dataSourceId = await resolveDataSourceId(notion, credentials.databaseId)
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

async function getUserNotionCredentials(userId: string) {
  const connection = await getNotionConnection(userId)

  if (!connection) {
    throw new Error("Notion 연결이 필요합니다. 계정 정보에서 Notion을 먼저 연결해주세요.")
  }

  if (!connection.notionDatabaseId) {
    throw new Error("Notion 데이터베이스 ID가 필요합니다. 계정 정보에서 저장해주세요.")
  }

  return {
    apiKey: connection.accessToken,
    databaseId: connection.notionDatabaseId,
  }
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
