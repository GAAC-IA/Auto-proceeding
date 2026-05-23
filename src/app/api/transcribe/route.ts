import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import OpenAI, { toFile } from "openai"

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

type NormalizedAudio = {
  bytes: Uint8Array
  extension: string
  mimeType: string
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

    const normalizedAudio = await normalizeAudioFile(file)
    if (!normalizedAudio.ok) {
      return Response.json({ error: normalizedAudio.error }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey })
    const text = await transcribeWithFallback(openai, normalizedAudio.audio)

    return Response.json({ text })
  } catch (error: unknown) {
    console.error("STT transcription API error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "음성 전사 중 오류가 발생했습니다."

    return Response.json({ error: errorMessage }, { status: 500 })
  }
}

async function transcribeWithFallback(openai: OpenAI, audio: NormalizedAudio) {
  try {
    return await transcribeAudio(openai, audio)
  } catch (error) {
    if (!isInvalidFileFormatError(error)) {
      throw error
    }

    const converted = await convertToMp3(audio)
    return transcribeAudio(openai, converted)
  }
}

async function transcribeAudio(openai: OpenAI, audio: NormalizedAudio) {
  const file = await toFile(audio.bytes, `audio.${audio.extension}`, {
    type: audio.mimeType,
  })

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "ko",
  })

  return transcription.text
}

async function normalizeAudioFile(
  file: File
): Promise<{ ok: true; audio: NormalizedAudio } | { ok: false; error: string }> {
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

  return {
    ok: true,
    audio: {
      bytes: new Uint8Array(await file.arrayBuffer()),
      extension,
      mimeType: getMimeType(extension),
    },
  }
}

async function convertToMp3(audio: NormalizedAudio): Promise<NormalizedAudio> {
  const jobId = randomUUID()
  const workDir = path.join(tmpdir(), `ama-stt-${jobId}`)
  const inputPath = path.join(workDir, `input.${audio.extension}`)
  const outputPath = path.join(workDir, "output.mp3")

  await mkdir(workDir, { recursive: true })

  try {
    await writeFile(inputPath, audio.bytes)
    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "64k",
      outputPath,
    ])

    return {
      bytes: new Uint8Array(await readFile(outputPath)),
      extension: "mp3",
      mimeType: "audio/mpeg",
    }
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : ""
    throw new Error(
      `오디오 파일을 OpenAI가 읽을 수 있는 mp3로 변환하지 못했습니다. 서버에 ffmpeg가 설치되어 있는지 확인해 주세요.${detail}`
    )
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, {
      windowsHide: true,
    })
    let stderr = ""

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk)
    })

    child.on("error", (error) => {
      reject(error)
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr.split("\n").slice(-8).join("\n").trim()))
    })
  })
}

function isInvalidFileFormatError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("invalid file format")
  )
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.trim().toLowerCase()
  return extension && extension !== fileName.toLowerCase() ? extension : ""
}

function getMimeType(extension: string) {
  if (extension === "m4a") {
    return "audio/m4a"
  }

  if (extension === "mp4") {
    return "video/mp4"
  }

  if (extension === "mp3" || extension === "mpeg" || extension === "mpga") {
    return "audio/mpeg"
  }

  return `audio/${extension}`
}
