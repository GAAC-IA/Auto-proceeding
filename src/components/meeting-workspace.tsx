"use client"

import styles from "./login.module.css"

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
  Lock,
  LogOut,
  Mail,
  Mic,
  Moon,
  Network,
  ChevronsLeft,
  ChevronsRight,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  Sun,
  Tags,
  Trash2,
  User,
  X,
} from "lucide-react"
import Image from "next/image"
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
import {
  useAudioRecorder,
  type MicrophonePermissionState,
} from "@/hooks/use-audio-recorder"
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
type ThemeMode = "light" | "dark"

type AuthUser = {
  email: string
  name: string
}

const AUTH_STORAGE_KEY = "ama-session"
const THEME_STORAGE_KEY = "ama-theme"
const TEST_LOGIN_ACCOUNT = {
  email: "test@ama.ai",
  password: "ama1234!",
  name: "AMA Tester",
}

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
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const [authUser, setAuthUser] = useState<AuthUser | null>(() =>
    getStoredUser()
  )
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isResizing, setIsResizing] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const isSidebarCollapsed = sidebarWidth <= 120

  const toggleSidebar = useCallback(() => {
    setSidebarWidth((w) => (w <= 120 ? 240 : 80))
  }, [])

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    document.body.classList.add("resizing")
    e.preventDefault()
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = e.clientX - 24
      const MIN_WIDTH = 80
      const MAX_WIDTH = 300

      if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH
      if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH

      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.classList.remove("resizing")
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])
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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

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
    if (!authUser) {
      return
    }

    const timer = setTimeout(() => {
      void loadNotionRecords()
    }, 0)

    return () => clearTimeout(timer)
  }, [authUser, loadNotionRecords])

  const handleLogin = useCallback((user: AuthUser) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    setAuthUser(user)
  }, [])

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuthUser(null)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"))
  }, [])

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
          "음성 텍스트 변환이 완료되었습니다. 이어서 AI 분석 및 n8n 전송을 시작합니다."
        )
        await handleAnalyze(textResult)
      } else {
        throw new Error(
          "음성에서 인식된 텍스트가 없습니다. 마이크 입력을 확인해 주세요."
        )
      }
    } catch (err: unknown) {
      setError(`음성 분석 실패: ${toErrorMessage(err)}`)
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

  if (!authUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    )
  }

  return (
    <main className={`min-h-screen text-slate-950 transition-colors dark:text-slate-50 ${styles.workspaceContainer}`}>
      <div className="flex min-h-screen">
        <aside
          className={`hidden lg:flex lg:flex-col ${styles.sidebar}`}
          style={{ width: `${sidebarWidth}px` }}
        >
          <div
            className={`${styles.handle} ${isResizing ? styles.handleActive : ""}`}
            onMouseDown={startResizing}
            onDoubleClick={toggleSidebar}
          />
          <div className={styles.sidebarInner}>
            <div className={styles.sidebarHeader} style={{ justifyContent: isSidebarCollapsed ? "center" : "space-between" }}>
              {!isSidebarCollapsed ? (
                <>
                  <Image
                    src="/AMA_logo_nobg2.png"
                    alt="AMA"
                    width={180}
                    height={72}
                    className="object-contain object-left"
                    style={{ width: "11rem", height: "auto" }}
                    priority
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    aria-label="사이드바 접기"
                    title="사이드바 접기"
                  >
                    <ChevronsLeft className="size-4" />
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="사이드바 펼치기"
                  title="사이드바 펼치기"
                  className={styles.logoToggleButton}
                >
                  <Image
                    src="/AMA_icon_nobg.png"
                    alt="AMA"
                    width={24}
                    height={24}
                    className={styles.logoIconDefault}
                    priority
                  />
                  <ChevronsRight className={styles.logoIconHover} />
                </button>
              )}
            </div>

            <nav className={styles.sidebarNav}>
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  title={item.label}
                  className={`${styles.sidebarButton} ${activeView === item.id ? styles.sidebarButtonActive : ""
                    }`}
                  style={{
                    justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                    padding: isSidebarCollapsed ? "0" : "0 16px"
                  }}
                >
                  <span className={styles.sidebarButtonIcon}>{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <span className={styles.sidebarButtonText}>{item.label}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className={styles.sidebarMetrics} style={{ padding: isSidebarCollapsed ? "10px" : "14px" }}>
              <div className="space-y-3 text-sm">
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
                  compact={isSidebarCollapsed}
                />
                <Metric
                  icon={<Network className="size-4" />}
                  label="n8n"
                  value={isN8nSending ? "전송 중" : summary ? "완료" : "대기"}
                  compact={isSidebarCollapsed}
                />
              </div>
            </div>

            <div className={styles.sidebarDivider} />

            <div className={styles.sidebarFooter}>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                title="내정보"
                className={`${styles.sidebarButton} ${showProfileModal ? styles.sidebarButtonActive : ""}`}
                style={{
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "0" : "0 16px"
                }}
              >
                <span className={styles.sidebarButtonIcon}><User className="size-4" /></span>
                {!isSidebarCollapsed && (
                  <span className={styles.sidebarButtonText}>내정보</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="로그아웃"
                className={`${styles.sidebarButton} ${styles.sidebarLogoutButton}`}
                style={{
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "0" : "0 16px"
                }}
              >
                <span className={styles.sidebarButtonIcon}><LogOut className="size-4" /></span>
                {!isSidebarCollapsed && (
                  <span className={styles.sidebarButtonText}>로그아웃</span>
                )}
              </button>
            </div>
          </div>
        </aside>

        <section className={`flex min-w-0 flex-1 flex-col ${styles.contentCard}`}>
          <header className="border-b border-slate-200/40 bg-white/10 px-5 py-5 dark:border-slate-800/40 dark:bg-slate-950/10 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                  {activeItem.label}
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {activeItem.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:hidden">
                <Button variant="outline" size="sm" onClick={() => setShowProfileModal(true)} title="내정보">
                  <User className="size-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-500 border-red-200/30 hover:bg-red-50 dark:hover:bg-red-950/30" title="로그아웃">
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>

            <nav className="mt-5 grid grid-cols-2 gap-2 lg:hidden">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${activeView === item.id
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300"
                    : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          <div className="flex-1 overflow-y-auto">
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
          </div>
        </section>
      </div>
      {showProfileModal && authUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-md transition-opacity duration-300">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white/60 p-6 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/60 border border-white/20 dark:border-white/5"
            style={{
              background: theme === "light"
                ? "linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(245, 224, 255, 0.6) 50%, rgba(255, 243, 209, 0.5) 100%)"
                : "linear-gradient(135deg, rgba(22, 20, 33, 0.85) 0%, rgba(10, 10, 18, 0.9) 100%)",
            }}
          >
            {theme === "light" && (
              <div
                className="absolute inset-0 pointer-events-none rounded-3xl"
                style={{
                  border: "1px solid transparent",
                  background: "linear-gradient(135deg, rgba(34, 211, 238, 0.45) 0%, rgba(168, 85, 247, 0.3) 50%, rgba(245, 158, 11, 0.2) 100%)",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  padding: "1px"
                }}
              />
            )}

            <div className="flex items-center justify-between pb-4 border-b border-slate-200/40 dark:border-slate-800/40">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <User className="size-5 text-indigo-500" />
                내 정보
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="rounded-full p-1.5 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-colors"
                title="닫기"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="py-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 font-bold text-xl">
                  {authUser.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{authUser.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{authUser.email}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/40 p-4 dark:bg-slate-950/20 border border-slate-200/20 dark:border-slate-800/20 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">계정 유형</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">임시 테스트 계정</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">상태</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">활성화됨</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">권한</span>
                  <span className="font-semibold">마이크, Notion, n8n 연동</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-top border-slate-200/40 dark:border-slate-800/40">
              <Button onClick={() => setShowProfileModal(false)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-2xl">
                확인
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.themeToggleWrapper} style={{ position: "fixed" }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
    </main>
  )
}

function LoginScreen({
  onLogin,
  theme,
  onToggleTheme,
}: {
  onLogin: (user: AuthUser) => void
  theme: ThemeMode
  onToggleTheme: () => void
}) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Sign Up fields
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")
  const [signUpError, setSignUpError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password.trim()) {
      setError("이메일과 비밀번호를 입력해주세요.")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("올바른 이메일 형식을 입력해주세요.")
      return
    }

    if (
      trimmedEmail !== TEST_LOGIN_ACCOUNT.email ||
      password !== TEST_LOGIN_ACCOUNT.password
    ) {
      setError("테스트 계정 정보가 일치하지 않습니다.")
      return
    }

    onLogin({
      email: TEST_LOGIN_ACCOUNT.email,
      name: TEST_LOGIN_ACCOUNT.name,
    })
  }

  function handleSignUpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedEmail = signUpEmail.trim()
    if (!trimmedEmail || !signUpPassword.trim()) {
      setSignUpError("이메일과 비밀번호를 입력해주세요.")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setSignUpError("올바른 이메일 형식을 입력해주세요.")
      return
    }

    // Simulate successful sign up
    alert("회원가입이 완료되었습니다! 가입하신 이메일과 임시 테스트 비밀번호(ama1234!)로 테스트 로그인이 가능합니다.")

    // Set email and switch to login
    setEmail(trimmedEmail)
    setIsSignUp(false)
    setSignUpError(null)
  }

  return (
    <main className={styles.container}>
      <div className={styles.themeToggleWrapper}>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <img src="/blob.svg" className={styles.blob} alt="" />
      <div className={styles.orbit}></div>

      {!isSignUp ? (
        <div className={`${styles.authCard} ${styles.loginCard}`}>
          <img
            src="/AMA_logo_nobg2.png"
            alt="AMA"
            className={styles.logo}
          />
          <div className={styles.testAccount}>
            <p className={styles.testAccountTitle}>임시 테스트 계정</p>
            <p className={styles.testAccountText}>
              이메일: {TEST_LOGIN_ACCOUNT.email}
            </p>
            <p className={styles.testAccountText}>
              비밀번호: {TEST_LOGIN_ACCOUNT.password}
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.textbox}>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                placeholder=" "
                autoComplete="email"
              />
              <label>이메일</label>
            </div>

            <div className={styles.textbox}>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                placeholder=" "
                autoComplete="current-password"
              />
              <label>비밀번호</label>
            </div>

            {error && <div className={styles.alert}>{error}</div>}

            <button
              type="submit"
              className={styles.submitBtn}
            >
              로그인
            </button>
          </form>
          <a className={styles.forgotLink}>Forgot password?</a>
          <p className={styles.footer}>
            Don't have an account? <a onClick={() => { setIsSignUp(true); setError(null); }}>Register!</a>
          </p>
        </div>
      ) : (
        <div className={`${styles.authCard} ${styles.signupCard}`}>
          <div className={styles.hero}>
            <div className={styles.heroInner}>
              <h4>Join AMA today</h4>
              <p>Analyze your meetings and build your knowledge archive instantly.</p>
            </div>
          </div>
          <form className={styles.signupForm} onSubmit={handleSignUpSubmit}>
            <div className={styles.signupHeader}>
              <h2>Create an account</h2>
              <h3>Use your email and password</h3>
            </div>

            <div className={styles.textbox}>
              <input
                value={signUpEmail}
                onChange={(event) => setSignUpEmail(event.target.value)}
                type="email"
                required
                placeholder=" "
                autoComplete="email"
              />
              <label>이메일</label>
            </div>

            <div className={styles.textbox}>
              <input
                value={signUpPassword}
                onChange={(event) => setSignUpPassword(event.target.value)}
                type="password"
                required
                placeholder=" "
                autoComplete="new-password"
              />
              <label>비밀번호</label>
            </div>

            {signUpError && <div className={styles.alert}>{signUpError}</div>}

            <button
              type="submit"
              className={styles.submitBtn}
            >
              Sign up
            </button>

            <span className={styles.or}></span>

            <div className={styles.socials}>
              <button type="button" className={styles.socialBtn}>
                <img src="/google.svg" alt="Google" />
                <p>Google</p>
              </button>
              <button type="button" className={styles.socialBtn}>
                <img src="/apple.svg" alt="Apple" />
                <p>Apple</p>
              </button>
            </div>

            <p className={styles.footer}>
              Already have an account? <a onClick={() => { setIsSignUp(false); setSignUpError(null); }}>Login!</a>
            </p>
          </form>
        </div>
      )}
    </main>
  )
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: ThemeMode
  onToggle: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onToggle}
      aria-label={theme === "dark" ? "화이트모드로 변경" : "다크모드로 변경"}
      title={theme === "dark" ? "화이트모드" : "다크모드"}
    >
      {theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
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
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/85 backdrop-blur-md">
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
            <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setActiveTab("text")}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${activeTab === "text"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-50"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
              >
                텍스트 입력
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("voice")}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${activeTab === "voice"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-50"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
              >
                실시간 음성 녹음
              </button>
            </div>

            {activeTab === "text" ? (
              <Textarea
                value={meetingText}
                onChange={(event) => setMeetingText(event.target.value)}
                placeholder="예: 오늘 회의에서는 AI 제품 킥오프 일정, 핵심 기능 정의, 문서 작성 담당자와 마감일을 논의했습니다..."
                className="min-h-72 resize-y rounded-2xl border-slate-200 bg-slate-50/70 p-4 text-base leading-7 shadow-inner dark:border-slate-700 dark:bg-slate-950"
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-8 dark:border-zinc-700/60 dark:bg-zinc-900/60">
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

                {isTranscribing && (
                  <div className="flex h-44 flex-col items-center justify-center space-y-3 rounded-2xl border border-dashed border-blue-200 bg-blue-50/10 p-4">
                    <Loader2 className="size-8 animate-spin text-blue-600" />
                    <div className="text-center">
                      <p className="text-sm font-bold">회의 음성을 텍스트로 변환 중입니다</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Whisper 전사가 완료되면 즉시 분석 파이프라인이 실행됩니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
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
                ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
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

        <Card className="border-slate-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/85 backdrop-blur-md">
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
                <Badge className="flex items-center gap-1 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-zinc-800/60 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
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
        <StatCard icon={<Database className="size-5" />} label="전체 회의록" value={`${records.length}`} />
        <StatCard icon={<Tags className="size-5" />} label="사용 중인 태그" value={`${tagCounts.length}`} />
        <StatCard icon={<CheckCircle2 className="size-5" />} label="액션 아이템" value={`${actionItemCount}`} />
        <StatCard icon={<Clock className="size-5" />} label="최근 회의" value={latestRecord ? formatDate(latestRecord.meetingDate) : "없음"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/85 backdrop-blur-md">
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

        <Card className="border-slate-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/85 backdrop-blur-md">
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
                <Badge key={tag} className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700/50 dark:hover:bg-zinc-750">
                  #{tag} {count}
                </Badge>
              ))}
              {!isLoading && tagCounts.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  아직 태그가 없습니다.
                </p>
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
      <NotionStateBanner error={error} isLoading={isLoading} onRefresh={onRefresh} />
      <Card className="border-slate-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/85 backdrop-blur-md">
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
      <NotionStateBanner error={error} isLoading={isLoading} onRefresh={onRefresh} />

      <div className="grid gap-4 lg:grid-cols-2">
        {groupedRecords.map(({ tag, items }) => (
          <Card key={tag} className="border-slate-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/85 backdrop-blur-md">
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
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-zinc-700/60 dark:bg-zinc-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-black tracking-tight">{record.title}</h3>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      {formatDate(record.meetingDate)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {record.summary || "요약 정보가 없습니다."}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && groupedRecords.length === 0 && (
        <Card className="border-slate-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/85 backdrop-blur-md">
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
    <div
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between ${
        error
          ? "border-red-200 bg-red-50/70 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
          : "border-slate-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-800/85"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex size-9 items-center justify-center rounded-full ${
            error
              ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300"
              : "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          }`}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : error ? (
            <AlertTriangle className="size-4 text-red-600" />
          ) : (
            <Database className="size-4" />
          )}
        </span>
        <div>
          <p className="text-sm font-black">
            {isLoading
              ? "Notion 데이터를 불러오는 중"
              : error
                ? "Notion 연결 확인 필요"
                : "Notion 데이터 동기화 완료"}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700/60 dark:bg-zinc-900/60">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          Meeting Title
        </p>
        <h2 className="mt-2 text-xl font-black tracking-tight">{summary.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {summary.summary}
        </p>
      </div>

      <div>
        <SectionTitle icon={<Tags className="size-4 text-blue-500" />} title="태그" />
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.tags.length > 0 ? (
            summary.tags.map((tag) => (
              <Badge key={tag} className="bg-blue-50 text-blue-700 hover:bg-blue-50/80 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700/50 dark:hover:bg-zinc-750">
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
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-zinc-600 dark:border-zinc-700/60 dark:bg-zinc-900/60"
              >
                <p className="font-semibold">{item.task}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <Badge variant="outline">담당자 {item.owner ?? "미정"}</Badge>
                  <Badge variant="outline">마감일 {item.dueDate ?? "미정"}</Badge>
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
    <div className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-700 bg-slate-50/70 p-8 text-center dark:border-zinc-700/60 dark:bg-zinc-900/60">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
        <Sparkles className="size-7 animate-pulse" />
      </div>
      <h2 className="mt-5 text-lg font-black">분석 결과가 아직 없습니다</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
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
    <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-zinc-700/60 dark:bg-zinc-900/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black tracking-tight">{record.title}</h3>
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
            <Badge key={tag} className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700/50 dark:hover:bg-zinc-750">
              #{tag}
            </Badge>
          ))}
        </div>
      </div>
      <p
        className={`mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400 ${compact ? "line-clamp-2" : ""
          }`}
      >
        {record.summary || "요약 정보가 없습니다."}
      </p>
      {!compact && record.actionItems && record.actionItems.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-zinc-700/80 dark:bg-zinc-900/50">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Action Items
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">
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
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-slate-50/80 p-8 text-center dark:border-zinc-700/60 dark:bg-zinc-900/60">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-zinc-850/60 dark:text-blue-300">
        <Database className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-black">Notion 회의록이 아직 없습니다</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
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
    <Card className="border-slate-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800/85 backdrop-blur-md">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
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
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
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
    <div className="flex items-center gap-2 text-sm font-black">
      {icon}
      {title}
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: ReactNode
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 ${compact ? "justify-center" : "justify-between"
        }`}
      title={`${label}: ${value}`}
    >
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span className="flex size-8 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300">
          {icon}
        </span>
        {!compact && label}
      </div>
      {!compact && <span className="font-black">{value}</span>}
    </div>
  )
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light"
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored) as Partial<AuthUser>
    if (typeof parsed.email === "string" && typeof parsed.name === "string") {
      return {
        email: parsed.email,
        name: parsed.name,
      }
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  return null
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
      description:
        "Chrome, Edge 등 MediaRecorder와 마이크 권한을 지원하는 브라우저에서 다시 시도해 주세요.",
      icon: <AlertTriangle className="mt-0.5 size-4 text-red-600" />,
      className: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
    }
  }

  if (state === "denied") {
    return {
      title: "마이크 권한이 거부되어 있습니다",
      description:
        "브라우저 주소창의 권한 설정에서 마이크를 허용한 뒤 다시 녹음 시작을 눌러 주세요.",
      icon: <AlertTriangle className="mt-0.5 size-4 text-red-600" />,
      className: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
    }
  }

  if (state === "granted") {
    return {
      title: "마이크 권한이 허용되었습니다",
      description:
        "녹음 시작을 누르면 회의 음성을 캡처하고 종료 후 자동 전사를 진행합니다.",
      icon: <ShieldCheck className="mt-0.5 size-4 text-emerald-600" />,
      className: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    }
  }

  if (state === "requesting") {
    return {
      title: "마이크 권한을 확인하고 있습니다",
      description: "브라우저 권한 팝업이 보이면 마이크 사용을 허용해 주세요.",
      icon: <Loader2 className="mt-0.5 size-4 animate-spin text-blue-600" />,
      className: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
    }
  }

  return {
    title: "녹음 전 마이크 권한이 필요합니다",
    description:
      "녹음 시작을 누른 뒤 브라우저 권한 팝업에서 마이크 사용을 허용해 주세요.",
    icon: <Mic className="mt-0.5 size-4 text-blue-600" />,
    className: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
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
