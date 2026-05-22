"use client"

import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  Mic,
  Network,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  Tags,
  Trash2,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

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
import { useAudioRecorder, type MicrophonePermissionState } from "@/hooks/use-audio-recorder"
import type { MeetingSummary } from "@/lib/meeting"
import type { NotionMeetingRecord } from "@/lib/notion"

type ApiError = {
  error?: string
}

type AnalyzeResponse = {
  summary?: MeetingSummary
  error?: string
}

type NotionResponse = {
  records?: NotionMeetingRecord[]
  error?: string
}

type WorkspaceView = "dashboard" | "analysis" | "records" | "archive"

const sidebarItems: Array<{
  id: WorkspaceView
  label: string
  description: string
  icon: ReactNode
}> = [
  {
    id: "dashboard",
    label: "대시보드",
    description: "Notion 회의록 현황",
    icon: <BarChart3 className="size-4" />,
  },
  {
    id: "analysis",
    label: "회의 분석",
    description: "텍스트와 음성 입력",
    icon: <Sparkles className="size-4" />,
  },
  {
    id: "records",
    label: "회의 기록",
    description: "Notion 저장 목록",
    icon: <FileText className="size-4" />,
  },
  {
    id: "archive",
    label: "지식 아카이브",
    description: "태그 기반 지식",
    icon: <Archive className="size-4" />,
  },
]

export function MeetingWorkspace() {
  const [activeView, setActiveView] = useState<WorkspaceView>("analysis")
  const [activeTab, setActiveTab] = useState<"text" | "voice">("text")
  const [meetingText, setMeetingText] = useState("")
  const [summary, setSummary] = useState<MeetingSummary | null>(null)
  const [records, setRecords] = useState<NotionMeetingRecord[]>([])
  const [isRecordsLoading, setIsRecordsLoading] = useState(false)
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isN8nSending, setIsN8nSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const activeItem =
    sidebarItems.find((item) => item.id === activeView) ?? sidebarItems[1]

  const loadNotionRecords = useCallback(async () => {
    setIsRecordsLoading(true)
    setRecordsError(null)

    try {
      const response = await fetch("/api/notion")
      const data = (await response.json()) as NotionResponse

      if (!response.ok) {
        throw new Error(data.error ?? "Notion 회의록을 불러오지 못했습니다.")
      }

      setRecords(data.records ?? [])
    } catch (requestError) {
      setRecordsError(toErrorMessage(requestError))
    } finally {
      setIsRecordsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotionRecords()
    }, 0)

    return () => clearTimeout(timer)
  }, [loadNotionRecords])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`
  }

  const handleAudioStop = async (blob: Blob) => {
    if (blob.size === 0) {
      setError("녹음된 오디오가 비어 있습니다. 다시 녹음해 주세요.")
      return
    }

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
        throw new Error(data.error || "음성 인식 중 오류가 발생했습니다.")
      }

      if (data.text && data.text.trim()) {
        const textResult = data.text.trim()
        setMeetingText(textResult)
        setSuccessMessage(
          "음성 텍스트 변환이 완료되었습니다. 이어서 AI 회의 분석 및 n8n 전송을 시작합니다."
        )

        await handleAnalyze(textResult)
      } else {
        throw new Error(
          "음성에서 인식된 텍스트가 없습니다. 마이크 입력을 확인해 주세요."
        )
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
      setError(`마이크 오류: ${err}`)
    },
  })

  async function triggerN8nAutomation(
    summaryData: MeetingSummary,
    transcriptText: string
  ) {
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
        "AI 회의 분석이 완료되었으며 n8n 워크플로우로 성공적으로 연동되었습니다."
      )
      void loadNotionRecords()
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
      setSuccessMessage(
        "AI 회의록 분석이 완료되었습니다. n8n 워크플로우로 자동 전송을 시작합니다."
      )

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
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-all ${
                  activeView === item.id
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <Card className="mt-auto border-slate-200 bg-slate-50/80 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">실시간 자동화 상태</CardTitle>
              <CardDescription>마이크, AI 분석, n8n 동기화</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Metric
                icon={<Mic className="size-4" />}
                label="마이크"
                value={
                  recorder.isRecording
                    ? "녹음 중"
                    : isTranscribing
                      ? "전사 중"
                      : getPermissionLabel(recorder.permissionState)
                }
              />
              <Metric
                icon={<Network className="size-4" />}
                label="n8n"
                value={isN8nSending ? "전송 중" : summary ? "연동 완료" : "대기"}
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
                    {activeItem.label}
                  </h1>
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    MVP
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {activeItem.description}
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

            <nav className="mt-5 grid grid-cols-2 gap-2 lg:hidden">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                    activeView === item.id
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          {activeView === "dashboard" && (
            <DashboardView
              records={records}
              isLoading={isRecordsLoading}
              error={recordsError}
              onRefresh={loadNotionRecords}
            />
          )}

          {activeView === "analysis" && (
            <AnalysisView
              activeTab={activeTab}
              error={error}
              formatTime={formatTime}
              handleAnalyze={handleAnalyze}
              handleReset={handleReset}
              isAnalyzing={isAnalyzing}
              isN8nSending={isN8nSending}
              isTranscribing={isTranscribing}
              meetingText={meetingText}
              recorder={recorder}
              setActiveTab={setActiveTab}
              setMeetingText={setMeetingText}
              successMessage={successMessage}
              summary={summary}
            />
          )}

          {activeView === "records" && (
            <RecordsView
              records={records}
              isLoading={isRecordsLoading}
              error={recordsError}
              onRefresh={loadNotionRecords}
            />
          )}

          {activeView === "archive" && (
            <KnowledgeArchiveView
              records={records}
              isLoading={isRecordsLoading}
              error={recordsError}
              onRefresh={loadNotionRecords}
            />
          )}
        </section>
      </div>
    </main>
  )
}

function AnalysisView({
  activeTab,
  error,
  formatTime,
  handleAnalyze,
  handleReset,
  isAnalyzing,
  isN8nSending,
  isTranscribing,
  meetingText,
  recorder,
  setActiveTab,
  setMeetingText,
  successMessage,
  summary,
}: {
  activeTab: "text" | "voice"
  error: string | null
  formatTime: (ms: number) => string
  handleAnalyze: (textToAnalyze?: string) => Promise<void>
  handleReset: () => void
  isAnalyzing: boolean
  isN8nSending: boolean
  isTranscribing: boolean
  meetingText: string
  recorder: ReturnType<typeof useAudioRecorder>
  setActiveTab: (tab: "text" | "voice") => void
  setMeetingText: (value: string) => void
  successMessage: string | null
  summary: MeetingSummary | null
}) {
  return (
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
                  텍스트를 직접 입력하거나 회의 음성을 녹음해 자동 전사와 AI 분석을 실행합니다.
                </CardDescription>
              </div>
              <Badge variant="outline" className="hidden sm:inline-flex">
                OpenAI JSON 분석 + n8n 연동
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-8">
                  {recorder.isRecording ? (
                    <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                      <span className="size-2 rounded-full bg-red-500" />
                      전체 회의 녹음 중 {formatTime(recorder.elapsedMs)}
                    </div>
                  ) : isTranscribing ? (
                    <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600">
                      <Loader2 className="size-3 animate-spin text-blue-500" />
                      음성을 텍스트로 전사 중
                    </div>
                  ) : (
                    <MicrophonePermissionNotice state={recorder.permissionState} />
                  )}

                  <div className="flex items-center gap-3">
                    {!recorder.isRecording ? (
                      <Button
                        onClick={recorder.startRecording}
                        disabled={
                          isAnalyzing ||
                          isTranscribing ||
                          recorder.permissionState === "requesting" ||
                          recorder.permissionState === "unsupported"
                        }
                        className="flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-5 text-white hover:bg-red-700"
                      >
                        {recorder.permissionState === "requesting" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Play className="size-4 fill-white" />
                        )}
                        {recorder.permissionState === "requesting"
                          ? "권한 확인 중"
                          : "녹음 시작"}
                      </Button>
                    ) : (
                      <Button
                        onClick={recorder.stopRecording}
                        className="flex items-center gap-2 rounded-2xl bg-slate-800 px-6 py-5 text-white hover:bg-slate-900"
                      >
                        <Square className="size-4 fill-white" />
                        녹음 종료
                      </Button>
                    )}
                  </div>
                </div>

                {isTranscribing && (
                  <div className="flex h-44 flex-col items-center justify-center space-y-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/10 p-4">
                    <Loader2 className="size-8 animate-spin text-blue-600" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800">
                        회의 음성을 텍스트로 변환 중입니다
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Whisper 전사가 완료되면 즉시 분석 파이프라인이 실행됩니다.
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
                  <Trash2 className="mr-1 size-4 text-slate-500" />
                  초기화
                </Button>
                <Button
                  onClick={() => handleAnalyze()}
                  disabled={
                    isAnalyzing ||
                    isTranscribing ||
                    isN8nSending ||
                    !meetingText.trim()
                  }
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isAnalyzing ? (
                    <Loader2 className="mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 size-4" />
                  )}
                  분석 실행
                </Button>
              </div>
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
            {error ? (
              <FileText className="size-4 text-red-600" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600" />
            )}
            <AlertTitle className="font-bold">
              {error ? "작업 중 오류 발생" : "작업 완료"}
            </AlertTitle>
            <AlertDescription className="text-xs leading-relaxed">
              {error ?? successMessage}
            </AlertDescription>
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
                  n8n 자동화 워크플로우를 통해 Notion 데이터베이스에 반영되는 요약 명세서입니다.
                </CardDescription>
              </div>
              {isN8nSending && (
                <Badge className="flex items-center gap-1 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
                  <Loader2 className="size-3 animate-spin text-blue-600" />
                  n8n 자동 동기화 중
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
  )
}

function DashboardView({
  records,
  isLoading,
  error,
  onRefresh,
}: NotionViewProps) {
  const latestRecord = records[0]
  const tagCounts = getTagCounts(records)
  const actionItemCount = records.reduce(
    (total, record) => total + (record.actionItems?.length ?? 0),
    0
  )

  return (
    <div className="space-y-6 p-5 md:p-8">
      <NotionStateBanner
        error={error}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Database className="size-5" />}
          label="전체 회의록"
          value={`${records.length}`}
        />
        <StatCard
          icon={<Tags className="size-5" />}
          label="사용 중인 태그"
          value={`${tagCounts.length}`}
        />
        <StatCard
          icon={<CheckCircle2 className="size-5" />}
          label="액션 아이템"
          value={`${actionItemCount}`}
        />
        <StatCard
          icon={<Clock className="size-5" />}
          label="최근 회의"
          value={latestRecord ? formatDate(latestRecord.meetingDate) : "없음"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-blue-600" />
              최근 회의록
            </CardTitle>
            <CardDescription>Notion에서 최신순으로 불러온 회의 기록입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {records.slice(0, 4).map((record) => (
              <RecordCard key={record.id} record={record} compact />
            ))}
            {!isLoading && records.length === 0 && <EmptyNotionRecords />}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="size-5 text-blue-600" />
              주요 태그
            </CardTitle>
            <CardDescription>회의록 태그가 지식 아카이브의 분류가 됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tagCounts.slice(0, 12).map(({ tag, count }) => (
                <Badge key={tag} className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                  #{tag} {count}
                </Badge>
              ))}
              {!isLoading && tagCounts.length === 0 && (
                <p className="text-sm text-slate-500">아직 태그가 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RecordsView({ records, isLoading, error, onRefresh }: NotionViewProps) {
  return (
    <div className="space-y-6 p-5 md:p-8">
      <NotionStateBanner
        error={error}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="size-5 text-blue-600" />
            Notion 회의 기록
          </CardTitle>
          <CardDescription>
            저장된 회의록의 제목, 요약, 태그, 회의 일자를 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {records.map((record) => (
            <RecordCard key={record.id} record={record} />
          ))}
          {!isLoading && records.length === 0 && <EmptyNotionRecords />}
        </CardContent>
      </Card>
    </div>
  )
}

function KnowledgeArchiveView({
  records,
  isLoading,
  error,
  onRefresh,
}: NotionViewProps) {
  const groupedRecords = useMemo(() => groupRecordsByTag(records), [records])

  return (
    <div className="space-y-6 p-5 md:p-8">
      <NotionStateBanner
        error={error}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {groupedRecords.map(({ tag, items }) => (
          <Card key={tag} className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Archive className="size-5 text-blue-600" />
                  #{tag}
                </span>
                <Badge variant="outline">{items.length}건</Badge>
              </CardTitle>
              <CardDescription>
                같은 주제로 묶인 회의 요약과 후속 액션입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-black tracking-tight text-slate-900">
                      {record.title}
                    </h3>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      {formatDate(record.meetingDate)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {record.summary || "요약 정보가 없습니다."}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && groupedRecords.length === 0 && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-10">
            <EmptyNotionRecords />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

type NotionViewProps = {
  records: NotionMeetingRecord[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}

function NotionStateBanner({
  error,
  isLoading,
  onRefresh,
}: {
  error: string | null
  isLoading: boolean
  onRefresh: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : error ? (
            <AlertTriangle className="size-4 text-red-600" />
          ) : (
            <Database className="size-4" />
          )}
        </span>
        <div>
          <p className="text-sm font-black text-slate-900">
            {isLoading
              ? "Notion 데이터를 불러오는 중"
              : error
                ? "Notion 연결 확인 필요"
                : "Notion 데이터 동기화 완료"}
          </p>
          <p className="text-xs font-medium text-slate-500">
            {error ?? "회의 기록과 지식 아카이브는 같은 Notion DB를 사용합니다."}
          </p>
        </div>
      </div>
      <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw className={`mr-1 size-4 ${isLoading ? "animate-spin" : ""}`} />
        새로고침
      </Button>
    </div>
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
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-slate-300"
              >
                <p className="font-semibold text-slate-900">{item.task}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <Badge variant="outline" className="border-slate-200 bg-white">
                    담당자 {item.owner ?? "미정"}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-white">
                    마감일 {item.dueDate ?? "미정"}
                  </Badge>
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
        회의 내용을 입력하거나 녹음을 종료하면 AI가 회의록을 전사 및 요약하고 Notion 저장 흐름으로 넘깁니다.
      </p>
    </div>
  )
}

function MicrophonePermissionNotice({
  state,
}: {
  state: MicrophonePermissionState
}) {
  const config = getPermissionNotice(state)

  return (
    <div
      className={`flex w-full max-w-xl items-start gap-3 rounded-2xl border px-4 py-3 text-left ${config.className}`}
    >
      {config.icon}
      <div>
        <p className="text-sm font-black">{config.title}</p>
        <p className="mt-1 text-xs leading-5">{config.description}</p>
      </div>
    </div>
  )
}

function RecordCard({
  record,
  compact = false,
}: {
  record: NotionMeetingRecord
  compact?: boolean
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black tracking-tight text-slate-900">
              {record.title}
            </h3>
            {record.url && (
              <a
                href={record.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                Notion
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {formatDate(record.meetingDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {record.tags.slice(0, compact ? 3 : 8).map((tag) => (
            <Badge key={tag} className="bg-blue-50 text-blue-700 hover:bg-blue-50">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>
      <p
        className={`mt-3 text-sm leading-6 text-slate-600 ${
          compact ? "line-clamp-2" : ""
        }`}
      >
        {record.summary || "요약 정보가 없습니다."}
      </p>
      {!compact && record.actionItems && record.actionItems.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Action Items
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {record.actionItems.slice(0, 3).map((item) => (
              <li key={`${record.id}-${item.task}`}>{item.task}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

function EmptyNotionRecords() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
        <Database className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-900">
        Notion 회의록이 아직 없습니다
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        회의 분석을 실행해 n8n 저장이 완료되면 이곳에 기록과 아카이브가 표시됩니다.
      </p>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          {icon}
        </span>
      </CardContent>
    </Card>
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
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
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

function getPermissionLabel(state: MicrophonePermissionState) {
  const labels: Record<MicrophonePermissionState, string> = {
    unknown: "확인 중",
    unsupported: "미지원",
    prompt: "권한 필요",
    requesting: "요청 중",
    granted: "허용됨",
    denied: "거부됨",
  }

  return labels[state]
}

function getPermissionNotice(state: MicrophonePermissionState) {
  if (state === "unsupported") {
    return {
      title: "이 브라우저에서는 녹음을 지원하지 않습니다",
      description: "Chrome, Edge 등 MediaRecorder와 마이크 권한을 지원하는 브라우저에서 다시 시도해 주세요.",
      icon: <AlertTriangle className="mt-0.5 size-4 text-red-600" />,
      className: "border-red-200 bg-red-50 text-red-900",
    }
  }

  if (state === "denied") {
    return {
      title: "마이크 권한이 거부되어 있습니다",
      description: "브라우저 주소창의 권한 설정에서 마이크를 허용한 뒤 다시 녹음 시작을 눌러 주세요.",
      icon: <AlertTriangle className="mt-0.5 size-4 text-red-600" />,
      className: "border-red-200 bg-red-50 text-red-900",
    }
  }

  if (state === "granted") {
    return {
      title: "마이크 권한이 허용되었습니다",
      description: "녹음 시작을 누르면 회의 음성을 캡처하고 종료 후 자동 전사를 진행합니다.",
      icon: <ShieldCheck className="mt-0.5 size-4 text-emerald-600" />,
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    }
  }

  if (state === "requesting") {
    return {
      title: "마이크 권한을 확인하고 있습니다",
      description: "브라우저 권한 팝업이 보이면 마이크 사용을 허용해 주세요.",
      icon: <Loader2 className="mt-0.5 size-4 animate-spin text-blue-600" />,
      className: "border-blue-200 bg-blue-50 text-blue-900",
    }
  }

  return {
    title: "녹음 전 마이크 권한이 필요합니다",
    description: "녹음 시작을 누른 뒤 브라우저 권한 팝업에서 마이크 사용을 허용해 주세요.",
    icon: <Mic className="mt-0.5 size-4 text-blue-600" />,
    className: "border-blue-200 bg-blue-50 text-blue-900",
  }
}

function getTagCounts(records: NotionMeetingRecord[]) {
  const counts = new Map<string, number>()

  for (const record of records) {
    for (const tag of record.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

function groupRecordsByTag(records: NotionMeetingRecord[]) {
  const groups = new Map<string, NotionMeetingRecord[]>()

  for (const record of records) {
    const tags = record.tags.length > 0 ? record.tags : ["분류 없음"]
    for (const tag of tags) {
      groups.set(tag, [...(groups.get(tag) ?? []), record])
    }
  }

  return [...groups.entries()]
    .map(([tag, items]) => ({ tag, items }))
    .sort((a, b) => b.items.length - a.items.length || a.tag.localeCompare(b.tag))
}

function formatDate(value: string | null) {
  if (!value) {
    return "날짜 없음"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(date)
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
