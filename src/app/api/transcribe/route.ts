import OpenAI from "openai"

import { requireAuthenticatedUser } from "@/lib/server-auth"

export const runtime = "nodejs"

const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  "flac",
  "m4a",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "oga",
  "ogg",
  "wav",
  "webm",
])

const MIME_EXTENSION_HINTS: Record<string, string> = {
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/mpga": "mpga",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
  "video/mp4": "mp4",
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (!auth.ok) {
      return auth.response
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json(
        { error: "STT API key가 설정되지 않았습니다." },
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

    const normalizedFile = await normalizeAudioFile(file)
    if (!normalizedFile.ok) {
      return Response.json({ error: normalizedFile.error }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey })
    const transcription = await openai.audio.transcriptions.create({
      file: normalizedFile.file,
      model: "whisper-1",
      language: "ko",
    })

    return Response.json({
      text: transcription.text,
    })
  } catch (error: unknown) {
    console.error("STT transcription API error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "음성 전사 중 오류가 발생했습니다."

    return Response.json({ error: errorMessage }, { status: 500 })
  }
}

async function normalizeAudioFile(
  file: File
): Promise<{ ok: true; file: File } | { ok: false; error: string }> {
  const originalExtension = getFileExtension(file.name)
  const hintedExtension = MIME_EXTENSION_HINTS[file.type.toLowerCase()]
  const extension = originalExtension || hintedExtension

  if (!extension || !SUPPORTED_AUDIO_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error:
        "지원하지 않는 음성 파일 형식입니다. flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm 파일을 업로드해 주세요.",
    }
  }

  const arrayBuffer = await file.arrayBuffer()

  return {
    ok: true,
    file: new File([arrayBuffer], `audio.${extension}`, {
      type: file.type || getMimeType(extension),
    }),
  }
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase()
  return extension && extension !== fileName.toLowerCase() ? extension : ""
}

function getMimeType(extension: string) {
  if (extension === "m4a") {
    return "audio/mp4"
  }

  if (extension === "mp4") {
    return "video/mp4"
  }

  if (extension === "mp3" || extension === "mpeg" || extension === "mpga") {
    return "audio/mpeg"
  }

  return `audio/${extension}`
}
