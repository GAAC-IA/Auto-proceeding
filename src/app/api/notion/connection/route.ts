import {
  deleteNotionConnection,
  getNotionConnection,
  toPublicNotionConnection,
  updateNotionDatabaseId,
} from "@/lib/notion-connections"
import { requireAuthenticatedUser } from "@/lib/server-auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const connection = await getNotionConnection(auth.userId)
    return Response.json({ connection: toPublicNotionConnection(connection) })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Notion 연결 상태 조회에 실패했습니다."

    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthenticatedUser(request)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const body = (await request.json()) as { notionDatabaseId?: unknown }
    const notionDatabaseId =
      typeof body.notionDatabaseId === "string" ? body.notionDatabaseId.trim() : ""

    if (!notionDatabaseId) {
      return Response.json(
        { error: "Notion 데이터베이스 ID를 입력해주세요." },
        { status: 400 }
      )
    }

    const connection = await getNotionConnection(auth.userId)
    if (!connection) {
      return Response.json(
        { error: "Notion을 먼저 연결해주세요." },
        { status: 409 }
      )
    }

    await updateNotionDatabaseId(auth.userId, notionDatabaseId)
    const updatedConnection = await getNotionConnection(auth.userId)

    return Response.json({
      connection: toPublicNotionConnection(updatedConnection),
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Notion 데이터베이스 ID 저장에 실패했습니다."

    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuthenticatedUser(request)
  if (!auth.ok) {
    return auth.response
  }

  try {
    await deleteNotionConnection(auth.userId)
    return Response.json({ connection: null })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Notion 연결 해제에 실패했습니다."

    return Response.json({ error: message }, { status: 500 })
  }
}
