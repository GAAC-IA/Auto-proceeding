import { MeetingSummarySchema, convertToN8nPayload } from "@/lib/meeting"
import { getNotionConnection } from "@/lib/notion-connections"
import { requireAuthenticatedUser } from "@/lib/server-auth"

export const runtime = "nodejs"

const WEBHOOK_TIMEOUT_MS = 15000

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.ok) {
      return auth.response
    }

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nWebhookUrl) {
      return Response.json(
        { error: "N8N_WEBHOOK_URL 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const webhookUrl = parseWebhookUrl(n8nWebhookUrl)
    if (!webhookUrl.ok) {
      return Response.json({ error: webhookUrl.error }, { status: 500 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { error: "올바르지 않은 JSON 요청 본문입니다." },
        { status: 400 }
      )
    }

    const { summary } = body
    const transcriptText =
      typeof body.transcriptText === "string" ? body.transcriptText : ""

    if (!summary || typeof summary !== "object") {
      return Response.json(
        { error: "유효한 회의 요약 데이터가 필요합니다." },
        { status: 400 }
      )
    }

    const parsed = MeetingSummarySchema.safeParse(summary)
    if (!parsed.success) {
      return Response.json(
        { error: "회의 요약 JSON 형식이 올바르지 않습니다." },
        { status: 400 }
      )
    }

    const notionConnection = await getNotionConnection(auth.userId)
    if (!notionConnection) {
      return Response.json(
        { error: "Notion 연결이 필요합니다. 계정 정보에서 Notion을 먼저 연결해주세요." },
        { status: 409 }
      )
    }

    if (!notionConnection.notionDatabaseId) {
      return Response.json(
        { error: "Notion 데이터베이스 ID가 필요합니다. 계정 정보에서 저장해주세요." },
        { status: 409 }
      )
    }

    const mappedPayload = convertToN8nPayload(parsed.data, transcriptText)

    const payload = {
      ...mappedPayload,
      userId: auth.userId,
      notion: {
        accessToken: notionConnection.accessToken,
        databaseId: notionConnection.notionDatabaseId,
        workspaceId: notionConnection.workspaceId,
        workspaceName: notionConnection.workspaceName,
      },
      syncedAt: new Date().toISOString(),
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

    const headers = new Headers({
      "Content-Type": "application/json",
    })
    if (process.env.N8N_WEBHOOK_SECRET) {
      headers.set("X-AMA-Webhook-Secret", process.env.N8N_WEBHOOK_SECRET)
    }

    let response: Response
    try {
      response = await fetch(webhookUrl.url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } catch (error) {
      throw createWebhookConnectionError(error, webhookUrl.url)
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`n8n 웹훅 응답 에러 (상태 코드 ${response.status}): ${errorText}`)
    }

    return Response.json({
      success: true,
      message: "n8n 워크플로우로 성공적으로 연동되었습니다.",
    })
  } catch (error: unknown) {
    console.error("n8n Sync API error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "n8n 연동 중 알 수 없는 오류가 발생했습니다."

    return Response.json({ error: errorMessage }, { status: 500 })
  }
}

function parseWebhookUrl(
  rawUrl: string
): { ok: true; url: URL } | { ok: false; error: string } {
  try {
    const url = new URL(rawUrl)

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        ok: false,
        error: "N8N_WEBHOOK_URL은 http 또는 https URL이어야 합니다.",
      }
    }

    if (url.pathname.includes("/webhook-test/")) {
      return {
        ok: false,
        error:
          "N8N_WEBHOOK_URL이 /webhook-test/ 주소입니다. 테스트 웹훅은 n8n 에디터에서 'Listen for test event'를 켠 동안만 동작합니다. 운영 저장에는 활성화된 워크플로우의 /webhook/start-docs 주소를 사용해주세요.",
      }
    }

    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      return {
        ok: false,
        error:
          "N8N_WEBHOOK_URL이 localhost를 가리키고 있습니다. Next 서버에서 접근 가능한 실제 n8n 주소를 설정해주세요.",
      }
    }

    return { ok: true, url }
  } catch {
    return {
      ok: false,
      error: "N8N_WEBHOOK_URL이 올바른 URL 형식이 아닙니다.",
    }
  }
}

function createWebhookConnectionError(error: unknown, url: URL) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new Error(
      `n8n 웹훅 연결 시간이 초과되었습니다. ${url.origin}에 Next 서버가 접근할 수 있는지 확인해주세요.`
    )
  }

  const cause = error instanceof Error ? ` 원인: ${error.message}` : ""
  return new Error(
    `n8n 웹훅에 연결하지 못했습니다. ${url.origin}에 Next 서버가 접근할 수 있는지, n8n 워크플로우가 활성화되어 있는지 확인해주세요.${cause}`
  )
}
