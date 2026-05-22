"use client"

import {
  Archive,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  Mic,
  CalendarClock,
  Sparkles,
  Tags,
  Network,
  Trash2,
  Square,
  Play,
} from "lucide-react"
import { useState, type ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { MeetingSummary } from "@/lib/meeting"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"

type ApiError = {
  error?: string
}

type AnalyzeResponse = {
  summary?: MeetingSummary
  error?: string
}

const sidebarItems = ["대시보드", "회의 분석", "회의 기록", "지식 아카이브"]

export function MeetingWorkspace() {
  const [activeTab, setActiveTab] = useState<"text" | "voice">("text")
  const [meetingText, setMeetingText] = useState("")
  const [summary, setSummary] = useState<MeetingSummary | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isN8nSending, setIsN8nSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Format milliseconds to MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // 단일 전체 오디오 파일 녹음 종료 시 호출되는 핸들러
  const handleAudioStop = async (blob: Blob) => {
    setIsTranscribing(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", blob, "audio.webm")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "음성 인식 중 에러가 발생했습니다.")
      }

      if (data.text && data.text.trim()) {
        const textResult = data.text.trim()
        setMeetingText(textResult)
        setSuccessMessage("음성 텍스트 변환이 완료되었습니다. 이어서 AI 회의 분석 및 n8n 전송을 시작합니다...")
        
        // 연쇄 반응: 텍스트 전사 결과를 가지고 즉시 AI 분석 및 n8n 백그라운드 전송 실행
        await handleAnalyze(textResult)
      } else {
        throw new Error("음성에서 인식된 텍스트가 없습니다. 마이크 입력을 확인해 주세요.")
      }
    } catch (err: unknown) {
      console.error("Transcription error:", err)
      const message = err instanceof Error ? err.message : String(err)
      setError(`음성 분석 실패: ${message}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  const recorder = useAudioRecorder({
    onStop: handleAudioStop,
    onError: (err) => {
      setError(`마이크 에러: ${err}`)
    },
  })

  // 백그라운드 n8n 웹훅 자동 전송 파이프라인
  async function triggerN8nAutomation(summaryData: MeetingSummary, transcriptText: string) {
    setIsN8nSending(true)
    try {
      const response = await fetch("/api/n8n", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: summaryData,
          transcriptText,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "n8n 자동 연동에 실패했습니다.")
      }

      setSuccessMessage(
        `AI 회의 분석이 완료되었으며, n8n 워크플로우로 성공적으로 연동되어 자동 백업되었습니다!`
      )
    } catch (automationError) {
      setError(`자동화 연동 실패: ${toErrorMessage(automationError)}`)
    } finally {
      setIsN8nSending(false)
    }
  }

  async function handleAnalyze(textToAnalyze?: string) {
    setError(null)
    setSuccessMessage(null)
    setIsAnalyzing(true)

    // 상태 업데이트 비동기 문제 해결을 위해 전달인자가 있으면 우선 사용하고 없으면 meetingText 사용
    const text = textToAnalyze !== undefined ? textToAnalyze : meetingText

    if (!text.trim()) {
      setError("회의 텍스트를 입력해주세요.")
      setIsAnalyzing(false)
      return
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meetingText: text }),
      })
      const data = (await response.json()) as AnalyzeResponse

      if (!response.ok || !data.summary) {
        throw new Error(data.error ?? "회의록 분석에 실패했습니다.")
      }

      setSummary(data.summary)
      setSuccessMessage("AI 회의록 분석이 완료되었습니다. n8n 워크플로우로 자동 전송을 시작합니다...")
      
      // AI 분석이 완료된 직후 사용자 개입 없이 곧바로 백그라운드에서 n8n 전송 실행
      await triggerN8nAutomation(data.summary, text)
    } catch (requestError) {
      setError(toErrorMessage(requestError))
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleReset() {
    recorder.resetRecorder()
    setMeetingText("")
    setSummary(null)
    setError(null)
    setSuccessMessage(null)
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white/85 px-5 py-6 shadow-[16px_0_50px_rgba(15,23,42,0.04)] backdrop-blur lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-black text-white shadow-lg shadow-blue-500/20">
              M
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">MeetAI</p>
              <p className="text-xs font-medium text-slate-500">Meeting OS</p>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            {sidebarItems.map((item, index) => (
              <div
                key={item}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                  index === 1
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                {index === 1 ? (
                  <Sparkles className="size-4" />
                ) : (
                  <FileText className="size-4" />
                )}
                {item}
              </div>
            ))}
          </nav>

          <Card className="mt-auto border-slate-200 bg-slate-50/80 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">실시간 자동화 상태</CardTitle>
              <CardDescription>n8n 백그라운드 파이프라인</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Metric
                icon={<Mic className="size-4" />}
                label="마이크 녹음"
                value={recorder.isRecording ? "녹음중" : (isTranscribing ? "전사중" : "대기")}
              />
              <Metric
                icon={<Network className="size-4" />}
                label="n8n 자동화"
                value={isN8nSending ? "전송중" : (summary ? "연동 완료" : "대기")}
              />
            </CardContent>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/80 px-5 py-5 backdrop-blur md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                    회의록 AI 분석
                  </h1>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    MVP
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  회의 텍스트 혹은 실시간 전체 음성을 입력하여 업무용 회의록으로 자동 정리하고 n8n 자동화 연동을 실행합니다.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-full bg-slate-100 px-3 py-2">
                <div className="flex size-9 items-center justify-center rounded-full bg-white text-sm font-bold shadow-sm">
                  JK
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold">Jane Kim</p>
                  <p className="text-xs text-slate-500">Admin</p>
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <section className="space-y-6">
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="size-5 text-blue-600" />
                        회의 입력 방식 선택
                      </CardTitle>
                      <CardDescription>
                        텍스트를 직접 입력하거나 전체 회의 음성을 녹음하여 원스톱 자동 파이프라인을 실행합니다.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      OpenAI JSON 분석 + n8n 연동
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Custom Styled Segmented Tabs */}
                  <div className="flex rounded-2xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("text")}
                      className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                        activeTab === "text"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      텍스트 입력
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("voice")}
                      className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                        activeTab === "voice"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      실시간 음성 녹음
                    </button>
                  </div>

                  {activeTab === "text" ? (
                    <Textarea
                      value={meetingText}
                      onChange={(event) => setMeetingText(event.target.value)}
                      placeholder="예: 오늘 회의에서는 AI 제품 킥오프 일정, 핵심 기능 정의, 실시간 번역 기능 검토, 문서 작성 담당자와 마감일을 논의했습니다..."
                      className="min-h-72 resize-y rounded-2xl border-slate-200 bg-slate-50/70 p-4 text-base leading-7 shadow-inner"
                    />
                  ) : (
                    <div className="space-y-4">
                      {/* Recording Control Panel */}
                      <div className="flex flex-col items-center justify-center p-8 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-4">
                        {recorder.isRecording ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 animate-pulse text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            전체 회의 녹음 중: {formatTime(recorder.elapsedMs)}
                          </div>
                        ) : isTranscribing ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold">
                            <Loader2 className="size-3 animate-spin text-blue-500" />
                            음성 텍스트 전사 분석 중...
                          </div>
                        ) : (
                          <div className="text-slate-500 text-xs font-medium">
                            마이크 버튼을 눌러 전체 녹음을 시작하세요 (종료 시 자동 전사 및 연동 수행)
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          {!recorder.isRecording ? (
                            <Button
                              onClick={recorder.startRecording}
                              disabled={isAnalyzing || isTranscribing}
                              className="bg-red-600 text-white hover:bg-red-700 px-6 py-5 rounded-2xl flex items-center gap-2"
                            >
                              <Play className="size-4 fill-white" />
                              녹음 시작
                            </Button>
                          ) : (
                            <Button
                              onClick={recorder.stopRecording}
                              className="bg-slate-800 text-white hover:bg-slate-900 px-6 py-5 rounded-2xl flex items-center gap-2"
                            >
                              <Square className="size-4 fill-white" />
                              녹음 종료
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Transcribing Loader Panel */}
                      {isTranscribing && (
                        <div className="flex flex-col items-center justify-center h-44 border border-dashed border-blue-200 bg-blue-50/10 rounded-2xl p-4 space-y-3">
                          <Loader2 className="size-8 animate-spin text-blue-600" />
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-800">
                              전체 회의 음성을 텍스트로 변환 중입니다
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Whisper 전사가 완료되면 즉시 분석 파이프라인이 구동됩니다.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      {meetingText.trim().length.toLocaleString()}자 입력됨
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={isAnalyzing || isTranscribing || isN8nSending}
                      >
                        <Trash2 className="size-4 mr-1 text-slate-500" />
                        초기화
                      </Button>
                      <Button
                        onClick={() => handleAnalyze()}
                        disabled={isAnalyzing || isTranscribing || isN8nSending || !meetingText.trim()}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="animate-spin mr-1" />
                        ) : (
                          <Sparkles className="size-4 mr-1" />
                        )}
                        분석 실행
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="size-5 text-slate-700" />
                    자동화 워크플로우 파이프라인
                  </CardTitle>
                  <CardDescription>
                    단 한 번의 입력으로 AI 분석과 n8n 워크플로우 연동이 백그라운드에서 완전히 자동화되어 처리됩니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 text-sm font-semibold text-slate-600 md:grid-cols-4">
                    {["회의 입력 방식 선택", "Whisper 자동 전사", "OpenAI AI 요약", "n8n 백그라운드 동기화"].map(
                      (step, index) => (
                        <div
                          key={step}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <span className="text-blue-600">0{index + 1}</span>
                          <p className="mt-1">{step}</p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-6">
              {(error || successMessage) && (
                <Alert
                  variant={error ? "destructive" : "default"}
                  className={
                    error
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }
                >
                  {error ? <FileText className="size-4 text-red-600" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
                  <AlertTitle className="font-bold">{error ? "작업 중 오류 발생" : "작업 완료"}</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed">{error ?? successMessage}</AlertDescription>
                </Alert>
              )}

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-blue-600" />
                        AI 요약 및 액션 아이템
                      </CardTitle>
                      <CardDescription>
                        n8n 자동화 워크플로우를 통해 Notion 데이터베이스에 즉각 반영되는 요약 명세서입니다.
                      </CardDescription>
                    </div>
                    {isN8nSending && (
                      <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin text-blue-600" />
                        n8n 자동 동기화 중...
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {summary ? <SummaryPreview summary={summary} /> : <EmptyPreview />}
                </CardContent>
              </Card>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

function SummaryPreview({ summary }: { summary: MeetingSummary }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Meeting Title
        </p>
        <h2 className="mt-2 text-xl font-black tracking-tight">{summary.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{summary.summary}</p>
      </div>

      <div>
        <SectionTitle icon={<Tags className="size-4 text-blue-500" />} title="태그" />
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.tags.length > 0 ? (
            summary.tags.map((tag) => (
              <Badge key={tag} className="bg-blue-50 text-blue-700 hover:bg-blue-50/80">
                #{tag}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-slate-500">태그 없음</p>
          )}
        </div>
      </div>

      <Separator />

      <ListSection title="핵심 논의 내용" items={summary.keyPoints} />
      <ListSection title="결정사항" items={summary.decisions} />

      <div>
        <SectionTitle
          icon={<CalendarClock className="size-4 text-blue-500" />}
          title="액션 아이템"
        />
        <div className="mt-3 space-y-3">
          {summary.actionItems.length > 0 ? (
            summary.actionItems.map((item) => (
              <div
                key={`${item.task}-${item.owner ?? "none"}`}
                className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 hover:border-slate-300 transition-all"
              >
                <p className="font-semibold text-slate-900">{item.task}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <Badge variant="outline" className="border-slate-200 bg-white">담당자 {item.owner ?? "미지정"}</Badge>
                  <Badge variant="outline" className="border-slate-200 bg-white">마감일 {item.dueDate ?? "미정"}</Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">액션 아이템 없음</p>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyPreview() {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Sparkles className="size-7 animate-pulse" />
      </div>
      <h2 className="mt-5 text-lg font-black">분석 결과가 아직 없습니다</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        회의 내용을 직접 입력하거나 실시간 전체 녹음을 종료하면, AI가 회의록을 자동 전사 및 요약하여 이곳에 보여주며 동시에 n8n 자동화 연동을 통해 Notion DB에 안전하게 자동 저장합니다.
      </p>
    </div>
  )
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <SectionTitle icon={<FileText className="size-4 text-blue-500" />} title={title} />
      <ul className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <li
              key={item}
              className="rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700 border border-slate-100"
            >
              {item}
            </li>
          ))
        ) : (
          <li className="text-sm text-slate-500">없음</li>
        )}
      </ul>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-black text-slate-900">
      {icon}
      {title}
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="flex size-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
          {icon}
        </span>
        {label}
      </div>
      <span className="font-black text-slate-900">{value}</span>
    </div>
  )
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (isApiError(error)) {
    return error.error
  }

  return "알 수 없는 오류가 발생했습니다."
}

function isApiError(error: unknown): error is Required<ApiError> {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "string"
  )
}
