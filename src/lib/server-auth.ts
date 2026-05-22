import { createClient } from "@supabase/supabase-js"

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response }

export async function requireAuthenticatedUser(request: Request): Promise<AuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      response: Response.json(
        { error: "Supabase 인증 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      ),
    }
  }

  const token = getBearerToken(request)
  if (!token) {
    return {
      ok: false,
      response: Response.json(
        { error: "로그인이 필요한 요청입니다." },
        { status: 401 }
      ),
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return {
      ok: false,
      response: Response.json(
        { error: "인증 세션이 만료되었거나 유효하지 않습니다." },
        { status: 401 }
      ),
    }
  }

  return { ok: true, userId: data.user.id }
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization")
  const match = header?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}
