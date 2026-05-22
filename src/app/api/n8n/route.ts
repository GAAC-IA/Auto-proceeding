import { MeetingSummarySchema, convertToN8nPayload } from "@/lib/meeting"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
    if (!n8nWebhookUrl) {
      return Response.json(
        { error: "N8N_WEBHOOK_URL 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      )
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

    const { summary, transcriptText } = body

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

    // Prepare payload using the shared mapping utility
    const mappedPayload = convertToN8nPayload(parsed.data, transcriptText)
    const payload = {
      ...mappedPayload,
      syncedAt: new Date().toISOString(),
    }

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

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
    const errorMessage = error instanceof Error ? error.message : "n8n 연동 중 알 수 없는 오류가 발생했습니다."
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
