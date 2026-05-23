import {
  createNotionOAuthState,
  getNotionOAuthConfig,
} from "@/lib/notion-connections"
import { requireAuthenticatedUser } from "@/lib/server-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request)
  if (!auth.ok) {
    return auth.response
  }

  try {
    const { clientId, redirectUri } = getNotionOAuthConfig(request)
    const state = await createNotionOAuthState(auth.userId)
    const authorizeUrl = new URL("https://api.notion.com/v1/oauth/authorize")

    authorizeUrl.searchParams.set("owner", "user")
    authorizeUrl.searchParams.set("client_id", clientId)
    authorizeUrl.searchParams.set("redirect_uri", redirectUri)
    authorizeUrl.searchParams.set("response_type", "code")
    authorizeUrl.searchParams.set("state", state)

    return Response.json({ url: authorizeUrl.toString() })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Notion 연결을 시작하는 중 오류가 발생했습니다."

    return Response.json({ error: message }, { status: 500 })
  }
}
