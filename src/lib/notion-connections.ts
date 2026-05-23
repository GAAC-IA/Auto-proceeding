import { randomUUID } from "node:crypto"

import { createSupabaseAdminClient } from "@/lib/supabase-admin"

export type NotionConnection = {
  userId: string
  accessToken: string
  refreshToken: string | null
  botId: string
  workspaceId: string | null
  workspaceName: string | null
  workspaceIcon: string | null
  duplicatedTemplateId: string | null
  notionDatabaseId: string | null
}

export type PublicNotionConnection = Omit<
  NotionConnection,
  "accessToken" | "refreshToken"
>

export type NotionOAuthUrlDebugInfo = {
  appBaseUrl: string | null
  redirectUri: string
  requestOrigin: string | null
  configuredAppBaseUrlHost: string | null
  configuredRedirectUriHost: string | null
}

type NotionTokenResponse = {
  access_token?: unknown
  refresh_token?: unknown
  bot_id?: unknown
  workspace_id?: unknown
  workspace_name?: unknown
  workspace_icon?: unknown
  duplicated_template_id?: unknown
}

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

export function getNotionOAuthConfig(request?: Request | string) {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET
  const appBaseUrl = getAppBaseUrl(request)
  const configuredRedirectUri = getConfiguredNotionRedirectUri()
  const redirectUri =
    appBaseUrl
      ? new URL("/api/notion/oauth/callback", appBaseUrl).toString()
      : configuredRedirectUri ?? null

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "NOTION_OAUTH_CLIENT_ID, NOTION_OAUTH_CLIENT_SECRET, APP_BASE_URL 또는 NOTION_OAUTH_REDIRECT_URI를 설정해주세요."
    )
  }

  return { clientId, clientSecret, redirectUri }
}

export function getNotionOAuthUrlDebugInfo(
  request: Request | string,
  redirectUri: string
): NotionOAuthUrlDebugInfo {
  const appBaseUrl = getAppBaseUrl(request)
  const configuredAppBaseUrl = getConfiguredAppBaseUrl()
  const configuredRedirectUri = getConfiguredNotionRedirectUri()

  return {
    appBaseUrl,
    redirectUri,
    requestOrigin: getRequestOrigin(request),
    configuredAppBaseUrlHost: configuredAppBaseUrl
      ? new URL(configuredAppBaseUrl).host
      : null,
    configuredRedirectUriHost: configuredRedirectUri
      ? new URL(configuredRedirectUri).host
      : null,
  }
}

export async function createNotionOAuthState(userId: string) {
  const state = randomUUID()
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString()
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase.from("notion_oauth_states").insert({
    state,
    user_id: userId,
    expires_at: expiresAt,
  })

  if (error) {
    throw new Error(`Notion OAuth 상태 저장 실패: ${error.message}`)
  }

  return state
}

export async function consumeNotionOAuthState(state: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("notion_oauth_states")
    .select("user_id, expires_at")
    .eq("state", state)
    .maybeSingle()

  await supabase.from("notion_oauth_states").delete().eq("state", state)

  if (error) {
    throw new Error(`Notion OAuth 상태 확인 실패: ${error.message}`)
  }

  if (!data) {
    throw new Error("Notion 연결 요청이 만료되었거나 유효하지 않습니다.")
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("Notion 연결 요청이 만료되었습니다. 다시 시도해주세요.")
  }

  return data.user_id as string
}

export async function exchangeNotionCode(code: string, request: Request | string) {
  const { clientId, clientSecret, redirectUri } = getNotionOAuthConfig(request)
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })

  const body = (await response.json()) as NotionTokenResponse & {
    error?: string
    error_description?: string
  }

  if (!response.ok) {
    throw new Error(
      body.error_description ?? body.error ?? "Notion 토큰 교환에 실패했습니다."
    )
  }

  return parseNotionTokenResponse(body)
}

export async function upsertNotionConnection(
  userId: string,
  token: Omit<NotionConnection, "userId" | "notionDatabaseId">
) {
  const supabase = createSupabaseAdminClient()
  const existing = await getNotionConnection(userId)
  const existingByBot = await getNotionConnectionByBotId(token.botId)
  const notionDatabaseId =
    existing?.notionDatabaseId ?? existingByBot?.notionDatabaseId ?? null

  if (existing && existing.botId !== token.botId) {
    const { error } = await supabase
      .from("user_notion_connections")
      .delete()
      .eq("user_id", userId)

    if (error) {
      throw new Error(`기존 Notion 연결 정리 실패: ${error.message}`)
    }
  }

  const { error } = await supabase.from("user_notion_connections").upsert(
    {
      user_id: userId,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      bot_id: token.botId,
      workspace_id: token.workspaceId,
      workspace_name: token.workspaceName,
      workspace_icon: token.workspaceIcon,
      duplicated_template_id: token.duplicatedTemplateId,
      notion_database_id: notionDatabaseId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: existingByBot ? "bot_id" : "user_id" }
  )

  if (error) {
    throw new Error(`Notion 연결 저장 실패: ${error.message}`)
  }
}

export async function getNotionConnection(
  userId: string
): Promise<NotionConnection | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_notion_connections")
    .select(
      "user_id, access_token, refresh_token, bot_id, workspace_id, workspace_name, workspace_icon, duplicated_template_id, notion_database_id"
    )
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Notion 연결 조회 실패: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return {
    userId: data.user_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    botId: data.bot_id,
    workspaceId: data.workspace_id,
    workspaceName: data.workspace_name,
    workspaceIcon: data.workspace_icon,
    duplicatedTemplateId: data.duplicated_template_id,
    notionDatabaseId: data.notion_database_id,
  }
}

async function getNotionConnectionByBotId(
  botId: string
): Promise<NotionConnection | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("user_notion_connections")
    .select(
      "user_id, access_token, refresh_token, bot_id, workspace_id, workspace_name, workspace_icon, duplicated_template_id, notion_database_id"
    )
    .eq("bot_id", botId)
    .maybeSingle()

  if (error) {
    throw new Error(`Notion 봇 연결 조회 실패: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return {
    userId: data.user_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    botId: data.bot_id,
    workspaceId: data.workspace_id,
    workspaceName: data.workspace_name,
    workspaceIcon: data.workspace_icon,
    duplicatedTemplateId: data.duplicated_template_id,
    notionDatabaseId: data.notion_database_id,
  }
}

export async function updateNotionDatabaseId(userId: string, notionDatabaseId: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("user_notion_connections")
    .update({
      notion_database_id: notionDatabaseId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Notion 데이터베이스 저장 실패: ${error.message}`)
  }
}

export async function deleteNotionConnection(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("user_notion_connections")
    .delete()
    .eq("user_id", userId)

  if (error) {
    throw new Error(`Notion 연결 해제 실패: ${error.message}`)
  }
}

export function toPublicNotionConnection(
  connection: NotionConnection | null
): PublicNotionConnection | null {
  if (!connection) {
    return null
  }

  return {
    userId: connection.userId,
    botId: connection.botId,
    workspaceId: connection.workspaceId,
    workspaceName: connection.workspaceName,
    workspaceIcon: connection.workspaceIcon,
    duplicatedTemplateId: connection.duplicatedTemplateId,
    notionDatabaseId: connection.notionDatabaseId,
  }
}

function parseNotionTokenResponse(body: NotionTokenResponse) {
  const accessToken = asString(body.access_token)
  const botId = asString(body.bot_id)

  if (!accessToken || !botId) {
    throw new Error("Notion 토큰 응답에 필수 값이 없습니다.")
  }

  return {
    accessToken,
    refreshToken: asString(body.refresh_token),
    botId,
    workspaceId: asString(body.workspace_id),
    workspaceName: asString(body.workspace_name),
    workspaceIcon: asString(body.workspace_icon),
    duplicatedTemplateId: asString(body.duplicated_template_id),
  }
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null
}

export function getAppBaseUrl(request?: Request | string) {
  const explicitAppUrl = getConfiguredAppBaseUrl()
  const configuredRedirectOrigin = getConfiguredNotionRedirectOrigin()
  const requestOrigin = getRequestOrigin(request)

  if (explicitAppUrl) {
    if (
      requestOrigin &&
      isLocalHost(new URL(explicitAppUrl).hostname) &&
      !isLocalHost(new URL(requestOrigin).hostname)
    ) {
      return requestOrigin
    }

    return explicitAppUrl
  }

  if (configuredRedirectOrigin) {
    if (!requestOrigin) {
      return configuredRedirectOrigin
    }

    const requestIsLocal = isLocalHost(new URL(requestOrigin).hostname)
    const redirectIsLocal = isLocalHost(new URL(configuredRedirectOrigin).hostname)

    if (requestIsLocal && !redirectIsLocal) {
      return configuredRedirectOrigin
    }

    if (!requestIsLocal && redirectIsLocal) {
      return requestOrigin
    }
  }

  return requestOrigin
}

function getConfiguredAppBaseUrl() {
  const explicitAppUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  return explicitAppUrl ? normalizeOrigin(explicitAppUrl) : null
}

function getConfiguredNotionRedirectUri() {
  return process.env.NOTION_OAUTH_REDIRECT_URI || null
}

function getConfiguredNotionRedirectOrigin() {
  const redirectUri = getConfiguredNotionRedirectUri()
  return redirectUri ? normalizeOrigin(redirectUri) : null
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
}

function normalizeOrigin(url: string) {
  return new URL(url).origin
}

function getRequestOrigin(request?: Request | string) {
  if (request instanceof Request) {
    const forwardedHost =
      getFirstHeaderValue(request.headers.get("x-forwarded-host")) ??
      getForwardedHeaderValue(request.headers.get("forwarded"), "host") ??
      request.headers.get("host")
    const forwardedProto =
      getFirstHeaderValue(request.headers.get("x-forwarded-proto")) ??
      getForwardedHeaderValue(request.headers.get("forwarded"), "proto") ??
      "https"

    if (forwardedHost) {
      return normalizeOrigin(`${forwardedProto}://${forwardedHost}`)
    }

    return new URL(request.url).origin
  }

  return request ? new URL(request).origin : null
}

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null
}

function getForwardedHeaderValue(value: string | null, key: "host" | "proto") {
  const firstForwardedValue = getFirstHeaderValue(value)
  if (!firstForwardedValue) {
    return null
  }

  for (const part of firstForwardedValue.split(";")) {
    const [partKey, partValue] = part.split("=")
    if (partKey?.trim().toLowerCase() === key && partValue?.trim()) {
      return partValue.trim().replace(/^"|"$/g, "")
    }
  }

  return null
}
