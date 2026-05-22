import { NextResponse } from "next/server"

import {
  consumeNotionOAuthState,
  exchangeNotionCode,
  upsertNotionConnection,
} from "@/lib/notion-connections"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const appUrl = new URL("/", url.origin)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")

  if (oauthError) {
    appUrl.searchParams.set("notion", "denied")
    appUrl.searchParams.set("reason", oauthError)
    return NextResponse.redirect(appUrl)
  }

  if (!code || !state) {
    appUrl.searchParams.set("notion", "error")
    appUrl.searchParams.set("reason", "missing_code_or_state")
    return NextResponse.redirect(appUrl)
  }

  try {
    const userId = await consumeNotionOAuthState(state)
    const token = await exchangeNotionCode(code, request.url)
    await upsertNotionConnection(userId, token)

    appUrl.searchParams.set("notion", "connected")
    return NextResponse.redirect(appUrl)
  } catch (error) {
    console.error("Notion OAuth callback error:", error)
    appUrl.searchParams.set("notion", "error")
    appUrl.searchParams.set(
      "reason",
      error instanceof Error ? error.message : "unknown_error"
    )
    return NextResponse.redirect(appUrl)
  }
}
