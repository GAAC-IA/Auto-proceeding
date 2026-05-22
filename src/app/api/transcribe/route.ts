import OpenAI from "openai"

import { requireAuthenticatedUser } from "@/lib/server-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.ok) {
      return auth.response
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: "OpenAI API key가 설정되지 않았습니다." },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json(
        { error: "업로드된 오디오 파일이 없습니다." },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey })

    // Send to OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ko", // Transcribe specifically in Korean
    })

    return Response.json({
      text: transcription.text,
    })
  } catch (error: unknown) {
    console.error("Whisper transcription API error:", error)
    const errorMessage = error instanceof Error ? error.message : "음성 전사 중 에러가 발생했습니다."
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
