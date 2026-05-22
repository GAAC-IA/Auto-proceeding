"use client"

import {
  Archive,
  Bot,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  Mic,
  NotebookText,
  Sparkles,
  Tags,
  Clock,
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

type NotionResponse = {
  success?: boolean
  pageId?: string
  error?: string
}

const sidebarItems = ["대시보드", "회의 분석", "회의 기록", "지식 아카이브"]

export function MeetingWorkspace() {
  const [activeTab, setActiveTab] = useState<"text" | "voice">("text")
  const [meetingText, setMeetingText] = useState("")
  const [summary, setSummary] = useState<MeetingSummary | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isN8nSaving, setIsN8nSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 실시간 받아쓰기 내역
  const [transcriptsList, setTranscriptsList] = useState<{ time: string; text: string }[]>([])
  const [transcribingSegments, setTranscribingSegments] = useState<number[]>([])

  const canSave = Boolean(summary) && !isSaving && !isAnalyzing && !isN8nSaving

  // Format milliseconds to MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const handleAudioSegment = async (segment: any) => {
    setTranscribingSegments((prev) => [...prev, segment.index])
    
    try {
      const formData = new FormData()
      formData.append("file", segment.blob, `segment-${segment.index}.webm`)

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "음성 인식 중 에러가 발생했습니다.")
      }

      if (data.text && data.text.trim()) {
        const timestamp = formatTime(segment.startTime)
        setTranscriptsList((prev) => [...prev, { time: timestamp, text: data.text }])
        setMeetingText((prev) => {
          const separator = prev ? "\n" : ""
          return `${prev}${separator}[${timestamp}] ${data.text}`
        })
      }
    } catch (err: any) {
      console.error("Segment transcription error:", err)
      setError(`[세그먼트 ${segment.index + 1}] 음성 분석 실패: ${err.message}`)
    } finally {
      setTranscribingSegments((prev) => prev.filter((idx) => idx !== segment.index))
    }
  }

  const recorder = useAudioRecorder({
    segmentIntervalMs: 30000,
    onSegment: handleAudioSegment,
    onError: (err) => {
      setError(`마이크 에러: ${err}`)
    }
  })

  async function handleAnalyze() {
    setError(null)
    setSuccessMessage(null)
    setIsAnalyzing(true)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meetingText }),
      })
      const data = (await response.json()) as AnalyzeResponse

      if (!response.ok || !data.summary) {
        throw new Error(data.error ?? "회의록 분석에 실패했습니다.")
      }

      setSummary(data.summary)
      setSuccessMessage("AI 회의록 분석이 완료되었습니다.")
    } catch (requestError) {
      setError(toErrorMessage(requestError))
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleSaveToNotion() {
    if (!summary) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    setIsSaving(true)

    try {
      const response = await fetch("/api/notion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ summary }),
      })
      const data = (await response.json()) as NotionResponse

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Notion 저장에 실패했습니다.")
      }

      setSuccessMessage("Notion 데이터베이스에 회의록을 저장했습니다.")
    } catch (requestError) {
      setError(toErrorMessage(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveToN8n() {
    if (!summary) {
      return
    }

    setError(null)
    setSuccessMessage(null)
    setIsN8nSaving(true)

    try {
      const response = await fetch("/api/n8n", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary,
          transcriptText: meetingText,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "n8n 전송에 실패했습니다.")
      }

      setSuccessMessage(data.message ?? "n8n 워크플로우로 성공적으로 전송되었습니다.")
    } catch (requestError) {
      setError(toErrorMessage(requestError))
    } finally {
      setIsN8nSaving(false)
    }
  }

  function handleReset() {
    recorder.resetRecorder()
    setMeetingText("")
    setTranscriptsList([])
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
              <CardTitle className="text-sm">오늘의 요약</CardTitle>
              <CardDescription>로컬 MVP 실행 기준</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Metric
                icon={<Mic className="size-4" />}
                label="분석 상태"
                value={isAnalyzing ? "분석중" : (meetingText ? "준비됨" : "대기")}
              />
              <Metric
                icon={<NotebookText className="size-4" />}
                label="Notion 저장"
                value={summary ? "준비됨" : "대기"}
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
                  회의 텍스트 혹은 실시간 음성을 입력하여 업무용 회의록으로 정리하고 Notion 및 n8n 연동을 지원합니다.
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
                        텍스트 입력 또는 마이크를 통한 실시간 음성 녹음을 지원합니다.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      OpenAI JSON 분석
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Custom Styled Segmented Tabs (Tailwind Slate Theme) */}
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
                      실시간 음성
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
                      <div className="flex flex-col items-center justify-center p-6 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-3">
                        {recorder.isRecording ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 animate-pulse text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            녹음 진행 중: {formatTime(recorder.elapsedMs)}
                          </div>
                        ) : (
                          <div className="text-slate-500 text-xs font-medium">
                            마이크 버튼을 눌러 녹음을 시작하세요 (30초 단위 자동 전사)
                          </div>
                        )}

                        <div className="flex items-center gap-3">
                          {!recorder.isRecording ? (
                            <Button
                              onClick={recorder.startRecording}
                              disabled={isAnalyzing}
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

                      {/* Transcripts List Panel */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          실시간 받아쓰기 내역 (Whisper 전사본)
                        </label>
                        <div className="h-60 border border-slate-200 bg-slate-50/30 rounded-2xl p-4 overflow-y-auto space-y-3 shadow-inner">
                          {transcriptsList.length === 0 && transcribingSegments.length === 0 && (
                            <div className="text-slate-400 text-sm italic text-center pt-16">
                              현재 음성 인식 데이터가 없습니다.
                            </div>
                          )}

                          {transcriptsList.map((tr, index) => (
                            <div key={index} className="flex gap-3 text-sm items-start leading-relaxed">
                              <Badge className="bg-slate-100 text-slate-600 border border-slate-200 shrink-0 font-mono hover:bg-slate-100">
                                {tr.time}
                              </Badge>
                              <span className="text-slate-700">{tr.text}</span>
                            </div>
                          ))}

                          {transcribingSegments.map((segmentIdx) => (
                            <div key={`pending-${segmentIdx}`} className="flex gap-2 text-sm items-center text-slate-400 italic">
                              <Clock className="size-3 animate-spin text-blue-500" />
                              <span>세그먼트 {segmentIdx + 1} 번역 및 전사 처리 중...</span>
                            </div>
                          ))}
                        </div>
                      </div>
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
                        disabled={isAnalyzing || isSaving || isN8nSaving}
                      >
                        <Trash2 className="size-4 mr-1 text-slate-500" />
                        초기화
                      </Button>
                      <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || isSaving || isN8nSaving || !meetingText.trim()}
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
                    텍스트 또는 실시간 음성을 구조화하여 Notion 데이터베이스 및 n8n 워크플로우에 통합 전송합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 text-sm font-semibold text-slate-600 md:grid-cols-4">
                    {["입력 방식 선택", "OpenAI AI 분석", "n8n / Notion 전송", "워크플로우 연동 완료"].map(
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
                        데이터 동기화 이전에 변환된 상세 명세를 확인하세요.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSaveToN8n}
                        disabled={!canSave}
                        variant="outline"
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                      >
                        {isN8nSaving ? <Loader2 className="animate-spin" /> : <Network className="size-4 text-blue-600" />}
                        n8n 전송
                      </Button>
                      <Button
                        onClick={handleSaveToNotion}
                        disabled={!canSave}
                        className="bg-slate-950 text-white hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        {isSaving ? <Loader2 className="animate-spin" /> : <NotebookText className="size-4" />}
                        Notion 저장
                      </Button>
                    </div>
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
        왼쪽 입력 영역에 회의 내용을 붙여넣거나 실시간 음성 녹음을 마친 후 분석을 실행하면 요약, 결정사항,
        액션 아이템이 이곳에 표시됩니다.
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
