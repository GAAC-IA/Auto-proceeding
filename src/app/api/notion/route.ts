import { Client } from "@notionhq/client"

import { MeetingSummarySchema } from "@/lib/meeting"
import { meetingSummaryToNotionProperties } from "@/lib/notion"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = MeetingSummarySchema.safeParse(body.summary ?? body)

    if (!parsed.success) {
      return Response.json(
        { error: "Notion에 저장할 회의록 JSON 형식이 올바르지 않습니다." },
        { status: 400 }
      )
    }

    const notionApiKey = process.env.NOTION_API_KEY
    const notionDatabaseId = process.env.NOTION_DATABASE_ID

    if (!notionApiKey || !notionDatabaseId) {
      return Response.json(
        {
          error:
            "NOTION_API_KEY 또는 NOTION_DATABASE_ID 환경변수가 설정되지 않았습니다.",
        },
        { status: 500 }
      )
    }

    const notion = new Client({ auth: notionApiKey })
    const page = await notion.pages.create({
      parent: {
        database_id: notionDatabaseId,
      },
      properties: meetingSummaryToNotionProperties(parsed.data),
    })

    return Response.json({
      success: true,
      pageId: page.id,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Notion 저장 중 알 수 없는 오류가 발생했습니다."

    return Response.json({ error: message }, { status: 400 })
  }
}
