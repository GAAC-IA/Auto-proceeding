import {
  fetchNotionMeetingRecords,
  NotionRecordsSetupError,
} from "@/lib/notion-records"
import { requireAuthenticatedUser } from "@/lib/server-auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const records = await fetchNotionMeetingRecords({ userId: auth.userId })
    return Response.json({ records })
  } catch (error) {
    if (error instanceof NotionRecordsSetupError) {
      return Response.json({ error: error.message }, { status: 409 })
    }

    const message =
      error instanceof Error
        ? error.message
        : "Notion 회의록을 불러오는 중 알 수 없는 오류가 발생했습니다."

    return Response.json({ error: message }, { status: 500 })
  }
}
