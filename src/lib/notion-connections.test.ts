import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getAppBaseUrl, getNotionOAuthConfig } from "./notion-connections"

const originalEnv = { ...process.env }

function resetOAuthEnv() {
  process.env = { ...originalEnv }
  process.env.NOTION_OAUTH_CLIENT_ID = "notion-client-id"
  process.env.NOTION_OAUTH_CLIENT_SECRET = "notion-client-secret"
  delete process.env.APP_BASE_URL
  delete process.env.NEXT_PUBLIC_APP_URL
  delete process.env.VERCEL_URL
  delete process.env.NOTION_OAUTH_REDIRECT_URI
}

function requestFor(url: string, headers?: HeadersInit) {
  return new Request(url, { headers })
}

describe("Notion OAuth URL 설정", () => {
  beforeEach(() => {
    resetOAuthEnv()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("배포 APP_BASE_URL이 있으면 내부 localhost 요청보다 우선한다", () => {
    process.env.APP_BASE_URL = "https://ia-ama.site"
    process.env.NOTION_OAUTH_REDIRECT_URI =
      "http://localhost:3000/api/notion/oauth/callback"

    const config = getNotionOAuthConfig(
      requestFor("http://localhost:3000/api/notion/oauth/start")
    )

    expect(config.redirectUri).toBe(
      "https://ia-ama.site/api/notion/oauth/callback"
    )
  })

  it("APP_BASE_URL이 없어도 외부 Notion redirect URI가 내부 localhost 요청보다 우선한다", () => {
    process.env.NOTION_OAUTH_REDIRECT_URI =
      "https://ia-ama.site/api/notion/oauth/callback"

    const config = getNotionOAuthConfig(
      requestFor("http://localhost:3000/api/notion/oauth/start")
    )

    expect(config.redirectUri).toBe(
      "https://ia-ama.site/api/notion/oauth/callback"
    )
  })

  it("프록시 Host 헤더가 있으면 외부 origin으로 callback을 만든다", () => {
    process.env.NOTION_OAUTH_REDIRECT_URI =
      "http://localhost:3000/api/notion/oauth/callback"

    const request = requestFor("http://localhost:3000/api/notion/oauth/start", {
      host: "ia-ama.site",
      "x-forwarded-proto": "https",
    })

    expect(getAppBaseUrl(request)).toBe("https://ia-ama.site")
    expect(getNotionOAuthConfig(request).redirectUri).toBe(
      "https://ia-ama.site/api/notion/oauth/callback"
    )
  })
})
