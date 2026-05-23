# AMA 프로젝트 상세 기술 문서

> 문서 버전: 1.0  
> 작성일: 2026-05-23  
> 프로젝트 경로: `C:\Users\0911k\Desktop\GCP\Auto-proceeding`  
> 문서 목적: 포트폴리오, 발표자료, README, 기술 명세서를 통합한 프로젝트 종합 문서

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [주요 기능 설명](#2-주요-기능-설명)
3. [기술 스택](#3-기술-스택)
4. [기술 아키텍처](#4-기술-아키텍처)
5. [데이터베이스 설계](#5-데이터베이스-설계)
6. [API 설계](#6-api-설계)
7. [UI/UX 및 프로토타입](#7-uiux-및-프로토타입)
8. [구현 과정 및 트러블슈팅](#8-구현-과정-및-트러블슈팅)
9. [보안 및 성능 고려사항](#9-보안-및-성능-고려사항)
10. [협업 방식](#10-협업-방식)
11. [테스트](#11-테스트)
12. [배포 및 운영](#12-배포-및-운영)
13. [프로젝트 결과 및 성과](#13-프로젝트-결과-및-성과)
14. [향후 계획 및 확장 가능성](#14-향후-계획-및-확장-가능성)
15. [결론](#15-결론)

---

## 1. 프로젝트 개요

### 1.1 프로젝트명

**AMA**

AMA는 회의 내용을 입력하거나 녹음하면 AI가 회의록을 구조화하고, n8n 자동화 워크플로우를 통해 Notion 데이터베이스에 저장하며, 저장된 회의록을 다시 검색 가능한 지식 아카이브로 활용하는 회의 생산성 자동화 서비스입니다.

### 1.2 프로젝트 소개

AMA는 다음 세 가지 업무를 하나의 흐름으로 연결합니다.

| 단계 | 설명 |
| --- | --- |
| 회의 입력 | 사용자가 회의 텍스트를 직접 입력하거나, 브라우저 마이크로 녹음하거나, 텍스트/오디오 파일을 업로드합니다. |
| AI 회의록 생성 | OpenAI API가 회의 내용을 제목, 요약, 핵심 논의, 결정사항, 액션 아이템, 태그로 구조화합니다. |
| 저장 및 검색 | n8n이 Notion 데이터베이스 저장을 담당하고, 서비스는 Notion 기록을 다시 불러와 대시보드와 RAG 검색을 제공합니다. |

단순한 메모 앱이 아니라, 회의 이후의 정리, 공유, 후속 업무 추적, 과거 회의 재검색까지 이어지는 업무 자동화 도구를 목표로 합니다.

### 1.3 개발 목적 및 배경

회의는 많은 조직에서 가장 빈번하게 발생하는 지식 생산 활동입니다. 그러나 실제 업무에서는 회의가 끝난 뒤 다음 문제가 반복됩니다.

- 회의록 작성자가 별도로 필요하다.
- 회의 내용을 요약하는 데 시간이 오래 걸린다.
- 결정사항과 액션 아이템이 누락된다.
- 담당자와 마감일이 명확하게 정리되지 않는다.
- 과거 회의록이 쌓여도 필요한 정보를 빠르게 찾기 어렵다.
- Notion, 캘린더, 메일, 태스크 도구와의 후속 자동화가 수동으로 처리된다.

AMA는 이러한 반복 업무를 AI와 자동화 워크플로우로 줄이기 위해 개발되었습니다.

### 1.4 해결하려는 문제

| 문제 | AMA의 해결 방식 |
| --- | --- |
| 회의록 수동 작성 부담 | OpenAI 기반 구조화 분석으로 회의록 초안을 자동 생성 |
| 음성 회의 기록 누락 | 브라우저 MediaRecorder와 Whisper 전사 API로 음성을 텍스트화 |
| 후속 업무 누락 | 액션 아이템을 별도 필드로 추출하고 담당자/마감일을 구조화 |
| 기록 분산 | Notion 데이터베이스에 회의록을 일관된 형식으로 저장 |
| 과거 회의 검색 어려움 | 임베딩 기반 RAG 검색으로 의미 기반 질의 응답 제공 |
| 외부 도구 연동 반복 | n8n 웹훅을 통해 Notion 저장 및 추가 자동화 확장 |

### 1.5 주요 타겟 사용자

| 사용자 | 니즈 |
| --- | --- |
| 스타트업 팀 | 빠른 회의 기록, 결정사항 공유, 태스크 관리 자동화 |
| 프로젝트 매니저 | 회의별 액션 아이템, 담당자, 마감일 추적 |
| 개발팀/기획팀 | 기술 회의, 스프린트 회의, 회고 내용을 지식 자산화 |
| 개인 생산성 사용자 | 음성/메모를 회의록 또는 업무 기록으로 자동 정리 |
| 학생/스터디 그룹 | 회의, 스터디, 토론 내용을 정리하고 다시 검색 |

### 1.6 핵심 가치 및 차별점

1. **입력 방식 다양화**  
   텍스트 입력, 실시간 음성 녹음, 파일 업로드를 모두 지원합니다.

2. **AI 결과의 구조화**  
   단순 요약이 아니라 `title`, `summary`, `keyPoints`, `decisions`, `actionItems`, `tags` 형태의 정형 JSON을 생성합니다.

3. **자동화 중심 설계**  
   분석 결과를 프론트엔드에만 보여주지 않고 n8n 웹훅으로 전달하여 Notion 및 다른 업무 도구와 연결할 수 있습니다.

4. **Notion OAuth 기반 사용자별 연결**  
   사용자마다 자신의 Notion 워크스페이스와 데이터베이스를 연결할 수 있도록 OAuth 흐름을 제공합니다.

5. **지식 아카이브 검색**  
   저장된 회의록을 단순 목록으로만 보지 않고, OpenAI 임베딩과 응답 생성을 조합해 자연어 질문으로 검색할 수 있습니다.

---

## 2. 주요 기능 설명

### 2.1 사용자 기능

| 기능 | 설명 | 주요 파일 |
| --- | --- | --- |
| 회원가입/로그인 | Supabase Auth 기반 이메일/비밀번호 로그인, Google/Apple OAuth 진입점 제공 | `src/components/meeting-workspace.tsx`, `src/lib/supabase.ts` |
| 회의 텍스트 입력 | 사용자가 직접 회의 내용을 입력하고 분석 실행 | `src/components/meeting-workspace.tsx` |
| 실시간 음성 녹음 | 브라우저 마이크 권한 확인 후 MediaRecorder로 녹음 | `src/hooks/use-audio-recorder.ts` |
| 음성 전사 | 오디오 Blob/File을 OpenAI Whisper API로 전사 | `src/app/api/transcribe/route.ts` |
| 파일 업로드 | 오디오 파일은 전사 후 분석, 텍스트/Markdown/CSV는 바로 분석 | `src/components/meeting-workspace.tsx` |
| AI 회의록 분석 | 회의 원문을 구조화된 회의록 JSON으로 변환 | `src/app/api/analyze/route.ts`, `src/lib/meeting.ts` |
| Notion 연결 | Notion OAuth 시작, 콜백 처리, DB ID 저장 | `src/app/api/notion/oauth/*`, `src/app/api/notion/connection/route.ts` |
| Notion 회의 기록 조회 | 사용자별 Notion DB에서 회의록 목록을 불러옴 | `src/app/api/notion/route.ts`, `src/lib/notion-records.ts` |
| 대시보드 | 전체 회의록 수, 태그 수, 액션 아이템 수, 최근 회의 표시 | `src/components/meeting-workspace.tsx` |
| RAG 아카이브 검색 | 과거 회의록을 의미 기반으로 검색하고 근거 회의록 표시 | `src/app/api/archive/search/route.ts` |
| 라이트/다크 테마 | `localStorage` 기반 테마 저장 및 적용 | `src/components/meeting-workspace.tsx` |

### 2.2 관리자 기능

현재 별도의 관리자 전용 대시보드는 구현되어 있지 않습니다. 다만 운영자 또는 서비스 관리자가 환경 변수, Supabase, n8n, Notion 설정을 통해 다음 항목을 관리할 수 있습니다.

| 관리 항목 | 설명 |
| --- | --- |
| Supabase 프로젝트 | Auth 사용자, OAuth Provider, 서비스 롤 키 관리 |
| Notion OAuth 앱 | Client ID, Client Secret, Redirect URI 관리 |
| n8n 워크플로우 | 웹훅 엔드포인트, Notion 저장 로직, 후속 자동화 관리 |
| OpenAI 모델 | `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL`, Whisper 모델 구성 |
| 운영 환경 변수 | API Key, Webhook Secret, App URL 등 배포 환경별 설정 |

향후 관리자 기능으로는 사용자별 사용량, 실패한 자동화 재시도, 회의록 저장 상태 모니터링, 조직 단위 워크스페이스 관리가 추가될 수 있습니다.

### 2.3 핵심 기능 흐름

```text
사용자 로그인
  |
  v
회의 입력 선택
  |-- 텍스트 직접 입력
  |-- 음성 녹음 -> Whisper 전사
  |-- 파일 업로드 -> 오디오 전사 또는 텍스트 추출
  |
  v
/api/analyze
  |
  v
OpenAI Responses API + Zod Schema
  |
  v
구조화된 회의록 JSON 생성
  |
  v
프론트엔드 미리보기 표시
  |
  v
/api/n8n
  |
  v
n8n Webhook
  |
  v
Notion 데이터베이스 저장
  |
  v
/api/notion 또는 /api/archive/search에서 재조회/검색
```

### 2.4 실제 사용 시나리오

#### 시나리오 A: 회의 종료 후 텍스트로 회의록 생성

1. 사용자가 Supabase Auth로 로그인합니다.
2. 회의 분석 화면에서 `텍스트 입력` 탭을 선택합니다.
3. 회의 내용을 붙여넣습니다.
4. `분석 실행` 버튼을 클릭합니다.
5. 서버는 인증 토큰을 검증하고 OpenAI API를 호출합니다.
6. 결과가 제목, 요약, 핵심 논의, 결정사항, 액션 아이템, 태그로 표시됩니다.
7. 동일 데이터가 n8n으로 전달되고 Notion DB에 저장됩니다.
8. 사용자는 회의 기록 화면에서 저장된 회의록을 확인합니다.

#### 시나리오 B: 회의 중 음성 녹음으로 자동 처리

1. 사용자가 `실시간 음성 녹음` 탭을 선택합니다.
2. 브라우저 마이크 권한을 허용합니다.
3. `녹음 시작` 버튼을 누르고 회의를 진행합니다.
4. `녹음 종료` 시 오디오 Blob이 생성됩니다.
5. `/api/transcribe`가 Whisper API로 음성을 한국어 텍스트로 전사합니다.
6. 전사 결과가 자동으로 `/api/analyze`로 전달됩니다.
7. 분석 결과가 n8n을 통해 Notion에 저장됩니다.

#### 시나리오 C: 과거 회의록 검색

1. 사용자가 `지식 아카이브` 화면으로 이동합니다.
2. “지난 회의에서 리스크로 언급된 내용을 찾아줘”와 같은 자연어 질문을 입력합니다.
3. 서버는 사용자 Notion DB에서 회의록을 가져옵니다.
4. 질문과 각 회의록 텍스트를 임베딩합니다.
5. Cosine Similarity로 관련 회의록을 상위 5개까지 선택합니다.
6. 선택된 회의록을 컨텍스트로 OpenAI Responses API에 전달합니다.
7. 답변과 근거 회의록 카드가 화면에 표시됩니다.

### 2.5 기능별 상세 설명

#### 2.5.1 회의 분석

요청 데이터:

```json
{
  "meetingText": "오늘 회의에서는 AMA 프로젝트의 Notion 연동과 배포 일정을 논의했습니다..."
}
```

처리 결과:

```json
{
  "summary": {
    "title": "AMA Notion 연동 및 배포 일정 회의",
    "summary": "Notion OAuth 연결, n8n 저장 흐름, 배포 전 검증 항목을 논의했다.",
    "keyPoints": [
      "Notion OAuth 연결 후 사용자별 데이터베이스 ID를 저장한다.",
      "n8n 웹훅은 운영 URL만 사용한다."
    ],
    "decisions": [
      "배포 전 Supabase 환경 변수를 점검한다."
    ],
    "actionItems": [
      {
        "task": "Notion OAuth Redirect URI 확인",
        "owner": "홍길동",
        "dueDate": "2026-05-30"
      }
    ],
    "tags": ["Notion", "n8n", "배포"]
  }
}
```

#### 2.5.2 n8n 연동

OpenAI 분석 결과는 `convertToN8nPayload`를 통해 Notion API 제약에 맞는 payload로 변환됩니다.

```ts
{
  title: string;
  summary: string;
  key_points: string[];
  decisions: string[];
  action_items: Array<{
    assignee: string;
    task: string;
    due_date: string | null;
  }>;
  tags: string[];
  transcript: string;
  userId: string;
  notion: {
    accessToken: string;
    databaseId: string;
    workspaceId: string | null;
    workspaceName: string | null;
  };
  syncedAt: string;
}
```

#### 2.5.3 Notion 연결

사용자는 계정 정보 또는 프로필 모달에서 Notion 연결을 시작합니다. 서버는 OAuth state를 Supabase에 저장하고, Notion authorize URL을 반환합니다. 콜백에서는 code와 state를 검증한 뒤 access token을 저장합니다.

#### 2.5.4 지식 아카이브

RAG 검색은 별도 벡터 DB 없이 요청 시점에 Notion 회의록을 가져와 임베딩을 생성하는 방식입니다. 초기 프로젝트 또는 소규모 팀에는 단순하고 운영 부담이 낮은 구조이며, 향후 회의록 수가 많아지면 Supabase pgvector 또는 전용 벡터 DB로 확장할 수 있습니다.

### 2.6 입력 -> 처리 -> 결과 흐름

| 입력 | 처리 | 결과 |
| --- | --- | --- |
| 회의 텍스트 | Zod 검증 -> OpenAI 분석 | 구조화 회의록 JSON |
| 오디오 녹음 | Blob 생성 -> Whisper 전사 -> OpenAI 분석 | 전사 텍스트 및 회의록 |
| 오디오 파일 | FormData 업로드 -> Whisper 전사 | 전사 텍스트 및 회의록 |
| 텍스트 파일 | `file.text()` 추출 -> OpenAI 분석 | 회의록 |
| Notion OAuth code | state 검증 -> token 교환 -> Supabase 저장 | 사용자별 Notion 연결 |
| 아카이브 질문 | query 검증 -> 임베딩 생성 -> 유사도 랭킹 -> 답변 생성 | 답변 및 근거 회의록 |

### 2.7 예외 처리 및 Validation 방식

| 영역 | Validation/예외 처리 |
| --- | --- |
| 인증 | 모든 주요 API에서 `Authorization: Bearer <token>` 검증 |
| 회의 텍스트 | `AnalyzeRequestSchema`로 `meetingText` 문자열 검증, trim 후 빈 문자열 거부 |
| AI 응답 | `MeetingSummarySchema`로 title/summary/keyPoints/decisions/actionItems/tags 구조 검증 |
| n8n URL | HTTP/HTTPS만 허용, `/webhook-test/`와 localhost URL 차단 |
| n8n 호출 | 15초 timeout, 실패 응답 body를 포함한 에러 처리 |
| 파일 업로드 | audio MIME 또는 `.txt`, `.md`, `.markdown`, `.csv`만 허용 |
| 마이크 | unsupported, denied, prompt, granted 상태 구분 |
| Notion 연결 | OAuth state 10분 TTL, 콜백 후 state 삭제 |
| Notion 조회 | 연결 없음/DB ID 없음은 `409 Conflict`로 구분 |
| 검색 질의 | 2자 미만 질의 거부 |

---

## 3. 기술 스택

### 3.1 전체 기술 스택

| 구분 | 기술 |
| --- | --- |
| Frontend | Next.js 16.2.6 App Router, React 19.2.4, TypeScript, Tailwind CSS 4 |
| Backend | Next.js Route Handlers, Node.js Runtime |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL, Notion Database |
| AI | OpenAI Responses API, OpenAI Whisper, OpenAI Embeddings |
| Automation | n8n Webhook |
| UI | shadcn 스타일 컴포넌트, lucide-react, CSS Module |
| Validation | Zod |
| Test | Vitest |
| Deployment | Vercel 또는 Node 기반 Next.js 배포 가능 구조 |

### 3.2 주요 라이브러리 및 사용 이유

| 라이브러리 | 사용 위치 | 선택 이유 |
| --- | --- | --- |
| `next` | App Router, API Route Handlers | 프론트엔드와 BFF/API 서버를 하나의 프로젝트에서 운영 가능 |
| `react`, `react-dom` | UI 렌더링 | 컴포넌트 기반 상태 관리와 인터랙션 구현 |
| `@supabase/supabase-js` | 인증, 관리자 DB 접근 | Auth와 PostgreSQL을 빠르게 연결 |
| `openai` | 분석, 전사, 임베딩 | Responses API, Whisper, Embeddings를 공식 SDK로 사용 |
| `@notionhq/client` | Notion 데이터 조회 | Notion API 공식 SDK로 타입 안정성과 유지보수성 확보 |
| `zod` | 요청/응답 스키마 검증 | AI 응답 구조와 API 입력 검증에 적합 |
| `lucide-react` | 아이콘 | 일관된 라인 아이콘으로 SaaS UI 구성 |
| `tailwindcss` | 스타일링 | 빠른 UI 구현, 다크 모드, 반응형 레이아웃 |
| `class-variance-authority`, `clsx`, `tailwind-merge` | UI 컴포넌트 variant/class 조합 | shadcn 계열 컴포넌트 패턴에 적합 |
| `vitest` | 단위 테스트 | TypeScript 유틸 함수 테스트에 가볍고 빠름 |

### 3.3 기술 선정 이유 및 장단점

#### Next.js App Router

장점:

- 파일 기반 라우팅과 API Route Handler를 함께 제공
- 프론트엔드와 서버 API를 하나의 저장소에서 관리 가능
- Vercel 배포와 궁합이 좋음
- `app/api/**/route.ts` 구조로 BFF 레이어 구현이 단순함

단점:

- Next.js 16은 기존 지식과 다른 변경점이 있어 공식 문서 확인이 필요함
- 서버/클라이언트 컴포넌트 경계를 명확히 관리해야 함

> 참고: 이 프로젝트는 `node_modules/next/dist/docs/01-app/index.md`와 Route Handler 문서를 기준으로 App Router와 `app/api/**/route.ts` 구조를 사용합니다.

#### Supabase

장점:

- Auth와 PostgreSQL을 동시에 제공
- OAuth Provider 확장이 쉬움
- Service Role Key를 통해 서버 전용 관리자 작업 가능

단점:

- 서비스 롤 키 노출 방지가 매우 중요함
- RLS 정책을 구체적으로 설계하지 않으면 보안 위험이 있음

#### Notion

장점:

- 사용자가 이미 업무 문서화 도구로 쓰는 경우가 많음
- 회의록 저장/공유/협업에 적합
- 페이지와 데이터베이스를 모두 활용 가능

단점:

- Rich Text/Block 길이 제한을 고려해야 함
- 데이터베이스 속성명이 사용자 환경에 따라 달라질 수 있음

#### n8n

장점:

- Notion 저장 이후 Google Calendar, Gmail, Google Tasks 등으로 쉽게 확장 가능
- 비개발자도 워크플로우를 시각적으로 수정 가능

단점:

- 웹훅 URL 관리와 운영/테스트 웹훅 구분이 필요함
- n8n 서버 접근성, timeout, retry 정책을 별도로 관리해야 함

---

## 4. 기술 아키텍처

### 4.1 전체 시스템 구조

```text
+-----------------------------+
|        Browser Client       |
|  Next.js Client Component   |
|  MeetingWorkspace           |
+--------------+--------------+
               |
               | Bearer Token / JSON / FormData
               v
+-----------------------------+
|      Next.js App Router     |
|      Route Handlers         |
|  /api/analyze               |
|  /api/transcribe            |
|  /api/n8n                   |
|  /api/notion                |
|  /api/archive/search        |
+------+---------+------------+
       |         | 
       |         +----------------------+
       |                                |
       v                                v
+-------------+              +------------------+
| OpenAI API  |              | Supabase Auth/DB |
| Responses   |              | users            |
| Whisper     |              | OAuth states     |
| Embeddings  |              | Notion tokens    |
+------+------+              +---------+--------+
       |                               |
       |                               v
       |                     +------------------+
       |                     | Notion API       |
       |                     | Database Query   |
       |                     +------------------+
       |
       v
+-----------------------------+
|           n8n               |
| Webhook Workflow            |
| Notion Create Page          |
| Optional Google Automation  |
+-----------------------------+
```

### 4.2 프론트엔드 구조

프론트엔드는 `src/components/meeting-workspace.tsx` 중심의 SPA형 워크스페이스로 구성되어 있습니다.

| 상태 | 설명 |
| --- | --- |
| `authUser` | Supabase 로그인 사용자 |
| `activeView` | dashboard, analysis, records, archive 화면 전환 |
| `activeTab` | text, voice, file 입력 방식 |
| `meetingText` | 분석 대상 회의 텍스트 |
| `summary` | AI 분석 결과 |
| `records` | Notion에서 가져온 회의 기록 |
| `notionConnection` | 사용자별 Notion 연결 상태 |
| `theme` | light/dark 테마 |
| `isAnalyzing`, `isTranscribing`, `isN8nSending` | 비동기 처리 상태 |

프론트엔드는 인증 토큰을 포함해 API를 호출하기 위해 `authenticatedFetch` 헬퍼를 사용합니다.

```ts
async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const authOptions = await getAuthFetchOptions(init);
  return fetch(input, authOptions);
}
```

### 4.3 백엔드 구조

Next.js Route Handler가 BFF(Backend For Frontend) 역할을 수행합니다.

| API | 역할 |
| --- | --- |
| `/api/analyze` | 회의 텍스트 분석 |
| `/api/transcribe` | 오디오 파일 전사 |
| `/api/n8n` | n8n 웹훅 전달 |
| `/api/notion` | Notion 회의록 조회 |
| `/api/notion/connection` | Notion 연결 상태 조회/수정/삭제 |
| `/api/notion/oauth/start` | Notion OAuth 시작 URL 생성 |
| `/api/notion/oauth/callback` | Notion OAuth 콜백 처리 |
| `/api/archive/search` | 회의록 RAG 검색 |

모든 핵심 API는 `runtime = "nodejs"`로 지정되어 OpenAI SDK, Notion SDK, Supabase Admin Client 등 Node 기반 기능을 안정적으로 사용합니다.

### 4.4 API 통신 구조

```text
Client
  |
  | Authorization: Bearer <supabase_access_token>
  v
Route Handler
  |
  | requireAuthenticatedUser()
  v
Supabase Auth getUser(token)
  |
  | ok -> userId
  v
Business Logic
  |
  | OpenAI / Notion / n8n / Supabase DB
  v
Response.json(...)
```

### 4.5 DB 구조

Supabase PostgreSQL에는 Notion OAuth 연결과 OAuth state를 저장합니다. 회의록 본문은 Notion 데이터베이스가 주 저장소 역할을 합니다.

```text
Supabase
  auth.users
    |
    +-- notion_oauth_states
    |
    +-- user_notion_connections

Notion
  Meeting Database
    |
    +-- Meeting Pages
          |
          +-- Summary properties
          +-- Key points blocks
          +-- Decisions blocks
          +-- Action items blocks
          +-- Transcript blocks
```

### 4.6 인증 흐름

```text
1. 사용자가 이메일/비밀번호 또는 OAuth Provider로 로그인
2. Supabase Client가 세션을 localStorage에 저장
3. API 호출 전 access_token을 Authorization 헤더에 삽입
4. 서버는 Supabase Auth getUser(token)으로 사용자 검증
5. 검증 성공 시 userId 기반으로 Notion 연결/회의록 데이터 접근
6. 실패 시 401 또는 500 응답 반환
```

### 4.7 데이터 흐름

#### 회의록 생성 데이터 흐름

```text
meetingText/audio/file
  -> Client validation
  -> /api/transcribe(optional)
  -> /api/analyze
  -> MeetingSummarySchema
  -> Client preview
  -> /api/n8n
  -> convertToN8nPayload
  -> n8n Webhook
  -> Notion Database
  -> /api/notion refresh
  -> Dashboard/Records
```

#### 아카이브 검색 데이터 흐름

```text
query
  -> /api/archive/search
  -> fetchNotionMeetingRecords(userId)
  -> buildSearchableText(record)
  -> OpenAI embeddings
  -> cosineSimilarity
  -> top 5 records
  -> OpenAI response generation
  -> answer + sources
```

### 4.8 폴더 구조 예시

```text
src/
  app/
    api/
      analyze/route.ts
      archive/search/route.ts
      n8n/route.ts
      notion/route.ts
      notion/connection/route.ts
      notion/oauth/start/route.ts
      notion/oauth/callback/route.ts
      transcribe/route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    meeting-workspace.tsx
    login.module.css
    ui/
      alert.tsx
      badge.tsx
      button.tsx
      card.tsx
      separator.tsx
      textarea.tsx
  hooks/
    use-audio-recorder.ts
  lib/
    meeting.ts
    meeting.test.ts
    notion.ts
    notion-connections.ts
    notion-connections.test.ts
    notion-records.ts
    server-auth.ts
    supabase.ts
    supabase-admin.ts
    utils.ts
supabase/
  notion-oauth.sql
n8n/
  Proceeding.json
public/
  AMA_logo_nobg2.png
  AMA_icon.png
```

### 4.9 계층 구조 설명

| 계층 | 책임 |
| --- | --- |
| UI Layer | 화면 렌더링, 입력 처리, 상태 표시, API 호출 |
| Hook Layer | 브라우저 마이크 녹음과 권한 상태 관리 |
| API Layer | 인증 검증, 외부 API 호출, 응답 포맷 통일 |
| Domain Layer | 회의록 스키마, Notion payload 변환, 파싱/검증 |
| Integration Layer | OpenAI, Supabase, Notion, n8n 연동 |
| Storage Layer | Supabase DB, Notion DB |

### 4.10 서버 처리 흐름

```text
POST /api/analyze
  1. requireAuthenticatedUser(request)
  2. validateMeetingText(await request.json())
  3. OPENAI_API_KEY 존재 확인
  4. openai.responses.parse(...)
  5. MeetingSummarySchema로 output_parsed 검증
  6. Response.json({ summary })

POST /api/n8n
  1. 인증 검증
  2. N8N_WEBHOOK_URL 검증
  3. request.json() 파싱
  4. MeetingSummarySchema 검증
  5. 사용자 Notion 연결 조회
  6. Notion DB ID 확인
  7. convertToN8nPayload(...)
  8. n8n Webhook POST
  9. success 응답
```

---

## 5. 데이터베이스 설계

### 5.1 Supabase 주요 테이블

#### 5.1.1 `notion_oauth_states`

Notion OAuth 과정에서 CSRF 방지와 사용자 매핑을 위해 임시 state를 저장합니다.

| 컬럼 | 타입 | 역할 |
| --- | --- | --- |
| `state` | `text primary key` | OAuth 요청 식별자 |
| `user_id` | `uuid` | Supabase `auth.users(id)` 참조 |
| `expires_at` | `timestamptz` | state 만료 시각 |
| `created_at` | `timestamptz` | 생성 시각 |

특징:

- `user_id`는 `auth.users(id)`를 참조합니다.
- 사용 후 즉시 삭제됩니다.
- TTL은 애플리케이션 레벨에서 10분으로 관리합니다.
- `expires_at` 인덱스를 통해 만료 state 정리에 활용할 수 있습니다.

#### 5.1.2 `user_notion_connections`

사용자별 Notion OAuth 토큰과 워크스페이스 정보를 저장합니다.

| 컬럼 | 타입 | 역할 |
| --- | --- | --- |
| `user_id` | `uuid primary key` | Supabase 사용자 ID |
| `access_token` | `text not null` | Notion API 호출용 OAuth access token |
| `refresh_token` | `text` | Notion refresh token, 제공 시 저장 |
| `bot_id` | `text not null` | Notion integration bot ID |
| `workspace_id` | `text` | Notion 워크스페이스 ID |
| `workspace_name` | `text` | 워크스페이스 이름 |
| `workspace_icon` | `text` | 워크스페이스 아이콘 URL |
| `duplicated_template_id` | `text` | Notion 템플릿 복제 ID |
| `notion_database_id` | `text` | 사용자가 저장한 회의록 DB ID |
| `created_at` | `timestamptz` | 생성 시각 |
| `updated_at` | `timestamptz` | 수정 시각 |

특징:

- `bot_id`에 unique index가 있어 동일 Notion bot 연결 중복을 줄입니다.
- `access_token`은 서버에서만 내려받고 클라이언트 응답에는 포함하지 않습니다.
- `toPublicNotionConnection` 함수로 민감 정보를 제거한 상태만 프론트엔드에 반환합니다.

### 5.2 Notion 데이터베이스 설계

Notion 데이터베이스는 실제 회의록 저장소입니다. n8n 워크플로우가 아래 속성에 맞춰 페이지를 생성하는 구조를 권장합니다.

| 속성명 | 타입 | 설명 |
| --- | --- | --- |
| `회의 제목` 또는 `Title` | `title` | 회의록 제목 |
| `요약` 또는 `Summary` | `rich_text` | 회의 전체 요약 |
| `태그` 또는 `Tags` | `multi_select` | 회의 분류 태그 |
| `회의 일자` 또는 `Created At` | `date` | 회의 일자 또는 저장일 |

페이지 본문에는 다음 섹션을 블록으로 저장하는 방식을 권장합니다.

```text
# 핵심 논의
- ...

# 결정사항
- ...

# 액션 아이템
- 담당자: ... / 마감일: ... / 작업: ...

# 전사 원문
...
```

`src/lib/notion.ts`는 한국어/영어 속성명 후보를 모두 탐색합니다. 따라서 `회의 제목`, `Title`, `Name`처럼 데이터베이스마다 조금 다른 속성명을 사용해도 일정 범위에서 조회할 수 있습니다.

### 5.3 ERD 설명

```text
+--------------------+
| auth.users         |
|--------------------|
| id (uuid, PK)      |
+---------+----------+
          |
          | 1:N
          v
+-------------------------+
| notion_oauth_states     |
|-------------------------|
| state (text, PK)        |
| user_id (uuid, FK)      |
| expires_at              |
| created_at              |
+-------------------------+

+--------------------+
| auth.users         |
|--------------------|
| id (uuid, PK)      |
+---------+----------+
          |
          | 1:1
          v
+------------------------------+
| user_notion_connections      |
|------------------------------|
| user_id (uuid, PK, FK)       |
| access_token                 |
| refresh_token                |
| bot_id (unique)              |
| workspace_id                 |
| workspace_name               |
| notion_database_id           |
| created_at                   |
| updated_at                   |
+------------------------------+

External Storage:
+------------------------------+
| Notion Meeting Database      |
|------------------------------|
| Page ID                      |
| Title                        |
| Summary                      |
| Tags                         |
| Meeting Date                 |
| Page Blocks                  |
+------------------------------+
```

### 5.4 테이블 관계

| 관계 | 설명 |
| --- | --- |
| `auth.users` -> `notion_oauth_states` | 한 사용자는 여러 OAuth state를 생성할 수 있음 |
| `auth.users` -> `user_notion_connections` | 한 사용자는 하나의 Notion 연결 정보를 가짐 |
| `user_notion_connections` -> Notion DB | 저장된 access token과 DB ID로 Notion 데이터 접근 |

### 5.5 데이터 저장 흐름

```text
Notion OAuth
  -> notion_oauth_states insert
  -> Notion callback
  -> notion_oauth_states select/delete
  -> user_notion_connections upsert

Meeting Save
  -> OpenAI summary 생성
  -> /api/n8n에서 Notion token 조회
  -> n8n webhook payload 전달
  -> n8n이 Notion page 생성

Meeting Read
  -> /api/notion
  -> user_notion_connections 조회
  -> Notion data source query
  -> page properties + blocks 파싱
  -> NotionMeetingRecord[] 반환
```

---

## 6. API 설계

### 6.1 공통 인증 방식

대부분의 API는 Supabase access token을 Bearer Token으로 요구합니다.

```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

서버 인증 흐름:

```ts
const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
const { data, error } = await supabase.auth.getUser(token);
```

### 6.2 REST API 명세

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| `POST` | `/api/analyze` | 회의 텍스트를 AI 회의록으로 분석 | 필요 |
| `POST` | `/api/transcribe` | 오디오 파일을 Whisper로 전사 | 필요 |
| `POST` | `/api/n8n` | 분석 결과를 n8n 웹훅으로 전달 | 필요 |
| `GET` | `/api/notion` | 사용자 Notion 회의록 목록 조회 | 필요 |
| `GET` | `/api/notion/connection` | Notion 연결 상태 조회 | 필요 |
| `PATCH` | `/api/notion/connection` | Notion DB ID 저장 | 필요 |
| `DELETE` | `/api/notion/connection` | Notion 연결 삭제 | 필요 |
| `POST` | `/api/notion/oauth/start` | Notion OAuth URL 생성 | 필요 |
| `GET` | `/api/notion/oauth/callback` | Notion OAuth 콜백 처리 | state 기반 |
| `POST` | `/api/archive/search` | 회의록 RAG 검색 | 필요 |

### 6.3 API 상세

#### 6.3.1 `POST /api/analyze`

회의 텍스트를 OpenAI Responses API로 분석합니다.

Request:

```json
{
  "meetingText": "회의 원문 텍스트..."
}
```

Response:

```json
{
  "summary": {
    "title": "회의 제목",
    "summary": "회의 요약",
    "keyPoints": ["핵심 논의 1"],
    "decisions": ["결정사항 1"],
    "actionItems": [
      {
        "task": "작업 내용",
        "owner": "담당자",
        "dueDate": "2026-05-30"
      }
    ],
    "tags": ["태그"]
  }
}
```

Error:

```json
{
  "error": "회의 텍스트를 입력해주세요."
}
```

상태 코드:

| Status | 의미 |
| --- | --- |
| `400` | 요청 형식 오류, 빈 텍스트, AI 응답 파싱 실패 |
| `401` | 인증 실패 |
| `500` | OpenAI API Key 미설정 |
| `502` | AI 분석 결과 생성 실패 |

#### 6.3.2 `POST /api/transcribe`

오디오 파일을 전사합니다.

Request:

```http
POST /api/transcribe
Content-Type: multipart/form-data

file=<audio file>
```

Response:

```json
{
  "text": "전사된 회의 텍스트"
}
```

특징:

- OpenAI Whisper `whisper-1` 사용
- `language: "ko"`로 한국어 전사 지정
- 파일 누락 시 `400`

#### 6.3.3 `POST /api/n8n`

분석된 회의록을 n8n 웹훅으로 전달합니다.

Request:

```json
{
  "summary": {
    "title": "회의 제목",
    "summary": "요약",
    "keyPoints": [],
    "decisions": [],
    "actionItems": [],
    "tags": []
  },
  "transcriptText": "원문 텍스트"
}
```

Response:

```json
{
  "success": true,
  "message": "n8n 워크플로우로 성공적으로 연동되었습니다."
}
```

Validation:

- `N8N_WEBHOOK_URL` 필수
- URL은 `http` 또는 `https`만 허용
- `/webhook-test/` URL 차단
- localhost URL 차단
- `MeetingSummarySchema` 검증
- 사용자 Notion 연결과 DB ID 필요

#### 6.3.4 `GET /api/notion`

사용자 Notion DB의 회의록을 가져옵니다.

Response:

```json
{
  "records": [
    {
      "id": "notion-page-id",
      "title": "회의 제목",
      "summary": "요약",
      "tags": ["AI", "회의"],
      "meetingDate": "2026-05-23",
      "url": "https://www.notion.so/...",
      "keyPoints": [],
      "decisions": [],
      "actionItems": [],
      "transcript": "전사 원문"
    }
  ]
}
```

상태 코드:

| Status | 의미 |
| --- | --- |
| `200` | 조회 성공 |
| `401` | 인증 실패 |
| `409` | Notion 연결 또는 DB ID 설정 필요 |
| `500` | Notion API 조회 실패 |

#### 6.3.5 `GET /api/notion/connection`

Notion 연결 상태를 조회합니다. access token은 응답에서 제외됩니다.

Response:

```json
{
  "connection": {
    "userId": "uuid",
    "botId": "notion-bot-id",
    "workspaceId": "workspace-id",
    "workspaceName": "Workspace",
    "workspaceIcon": null,
    "duplicatedTemplateId": null,
    "notionDatabaseId": "database-id"
  }
}
```

#### 6.3.6 `PATCH /api/notion/connection`

사용자 Notion DB ID를 저장합니다.

Request:

```json
{
  "notionDatabaseId": "notion-database-id"
}
```

Response:

```json
{
  "connection": {
    "userId": "uuid",
    "botId": "notion-bot-id",
    "workspaceId": "workspace-id",
    "workspaceName": "Workspace",
    "workspaceIcon": null,
    "duplicatedTemplateId": null,
    "notionDatabaseId": "notion-database-id"
  }
}
```

#### 6.3.7 `DELETE /api/notion/connection`

Notion 연결 정보를 삭제합니다.

Response:

```json
{
  "connection": null
}
```

#### 6.3.8 `POST /api/notion/oauth/start`

Notion OAuth authorize URL을 생성합니다.

Response:

```json
{
  "url": "https://api.notion.com/v1/oauth/authorize?...",
  "debug": {
    "appBaseUrl": "https://example.com",
    "redirectUri": "https://example.com/api/notion/oauth/callback",
    "requestOrigin": "https://example.com",
    "configuredAppBaseUrlHost": "example.com",
    "configuredRedirectUriHost": "example.com"
  }
}
```

#### 6.3.9 `GET /api/notion/oauth/callback`

Notion에서 돌아오는 OAuth callback을 처리합니다.

Query:

```text
?code=<authorization_code>&state=<oauth_state>
```

성공 시:

```text
302 Redirect /
?notion=connected
```

실패 시:

```text
302 Redirect /
?notion=error&reason=<reason>
```

#### 6.3.10 `POST /api/archive/search`

회의록 아카이브를 의미 기반으로 검색합니다.

Request:

```json
{
  "query": "최근 결정된 액션 아이템을 담당자별로 정리해줘"
}
```

Response:

```json
{
  "answer": "근거 회의록을 바탕으로 정리한 답변...",
  "sources": [
    {
      "id": "notion-page-id",
      "title": "회의 제목",
      "summary": "회의 요약",
      "meetingDate": "2026-05-23",
      "tags": ["AI"],
      "url": "https://www.notion.so/...",
      "snippet": "검색에 사용된 텍스트 일부",
      "score": 0.83
    }
  ]
}
```

### 6.4 에러 처리 방식

공통적으로 JSON 에러 응답을 사용합니다.

```json
{
  "error": "사용자에게 표시 가능한 에러 메시지"
}
```

권장 에러 코드 기준:

| Status | 사용 상황 |
| --- | --- |
| `400` | 요청 body 오류, validation 실패 |
| `401` | 로그인 필요, 토큰 만료 |
| `409` | 외부 연동 설정 미완료 |
| `500` | 서버 환경 변수 누락, 외부 API 예외 |
| `502` | AI 또는 외부 응답이 기대 형식이 아님 |

---

## 7. UI/UX 및 프로토타입

### 7.1 화면 구성

| 화면 | 설명 |
| --- | --- |
| 로그인 화면 | Supabase Auth 기반 로그인/회원가입 진입 화면 |
| 회의 분석 | 텍스트, 음성, 파일 입력으로 회의록 분석 실행 |
| 대시보드 | Notion 회의록 통계와 최근 회의 표시 |
| 회의 기록 | 저장된 Notion 회의록 목록 확인 |
| 지식 아카이브 | 과거 회의록에 대한 자연어 검색 및 답변 |
| 프로필/연동 모달 | Notion OAuth 연결, DB ID 저장, 연결 해제 |

### 7.2 주요 UI 흐름

```text
로그인
  |
  v
Notion 연결 여부 확인
  |
  |-- 연결 없음 -> 온보딩/프로필에서 Notion 연결 안내
  |
  v
회의 분석 화면
  |
  |-- 텍스트 입력
  |-- 실시간 음성 녹음
  |-- 파일 업로드
  |
  v
분석 결과 미리보기
  |
  v
자동 n8n 전송
  |
  v
회의 기록/대시보드 새로고침
  |
  v
지식 아카이브 검색
```

### 7.3 사용자 경험 설계 의도

1. **업무 도구다운 밀도**  
   단순 랜딩 페이지보다 실제 업무 화면을 첫 경험으로 제공하는 구조입니다. 로그인 후 바로 분석 워크스페이스로 진입합니다.

2. **입력 부담 최소화**  
   회의록을 직접 작성하지 않아도 음성 녹음 또는 파일 업로드로 시작할 수 있습니다.

3. **상태 피드백 강화**  
   전사 중, 분석 중, n8n 전송 중, Notion 로딩 중 등 긴 작업의 상태를 UI에 표시합니다.

4. **외부 연동 불확실성 완화**  
   Notion 연결/DB ID 누락은 일반 오류가 아니라 설정 필요 상태로 구분해 안내합니다.

5. **작업 후 바로 확인 가능**  
   n8n 저장 후 Notion 기록을 다시 로드해 대시보드와 회의 기록 화면에서 확인할 수 있습니다.

### 7.4 화면별 설명

#### 7.4.1 로그인 화면

- 이메일/비밀번호 로그인
- 회원가입 모드 전환
- Google/Apple OAuth 시작 버튼 구조
- Supabase 환경 변수 미설정 시 안내
- 테마 토글 제공

이미지 삽입 공간:

![로그인 화면](./assets/login.png)

#### 7.4.2 회의 분석 화면

- 입력 방식 탭: 텍스트 입력, 실시간 음성 녹음, 파일 업로드
- 텍스트 길이 표시
- 분석 실행/초기화 버튼
- 분석 결과 미리보기
- 에러/성공 메시지 표시

이미지 삽입 공간:

![회의 분석 화면](./assets/analysis.png)

#### 7.4.3 대시보드

- 전체 회의록 수
- 사용 중인 태그 수
- 액션 아이템 수
- 최근 회의 날짜
- 최근 회의록 카드
- 주요 태그 목록

이미지 삽입 공간:

![대시보드](./assets/dashboard.png)

#### 7.4.4 회의 기록 화면

- Notion에서 가져온 회의록 카드 목록
- 제목, 날짜, 요약, 태그, 액션 아이템 일부 표시
- Notion 원문 링크 제공
- 새로고침 버튼

이미지 삽입 공간:

![회의 기록](./assets/records.png)

#### 7.4.5 지식 아카이브 화면

- 자연어 질문 입력
- 샘플 질문 버튼
- AI 답변 표시
- 근거 회의록 카드 표시
- 유사도 점수 표시

이미지 삽입 공간:

![지식 아카이브](./assets/archive.png)

#### 7.4.6 Notion 연동 화면

- Notion OAuth 연결 시작
- 연결된 워크스페이스 정보 표시
- Notion Database ID 입력 및 저장
- 연결 해제

이미지 삽입 공간:

![Notion 연동](./assets/notion-connection.png)

### 7.5 영상 첨부 영역

프로젝트 시연 영상:

[프로젝트 시연 영상](https://example.com)

발표 영상:

[발표 영상](https://example.com)

---

## 8. 구현 과정 및 트러블슈팅

### 8.1 개발 중 발생한 문제

| 문제 | 원인 | 해결 |
| --- | --- | --- |
| AI 응답 형식 불안정 | LLM이 자유 텍스트 또는 Markdown code block을 반환할 수 있음 | OpenAI `responses.parse`와 Zod schema 사용, fallback JSON fence 제거 로직 구현 |
| Notion 텍스트 길이 제한 | Notion rich text/block 길이 제한 | summary, keyPoints, decisions, actionItems 길이 제한 및 truncate 처리 |
| n8n test webhook 불안정 | `/webhook-test/`는 n8n 편집기에서 대기 중일 때만 동작 | 운영 webhook URL만 허용하도록 validation 추가 |
| localhost webhook 접근 불가 | 배포 서버에서 로컬 n8n 주소 접근 불가 | `localhost`, `127.0.0.1`, `::1` URL 차단 |
| Notion OAuth Redirect URI 혼선 | 로컬/배포 환경의 base URL이 다름 | `APP_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `VERCEL_URL`, request origin을 조합해 base URL 결정 |
| 사용자별 Notion DB 분리 | 전역 Notion API Key 방식은 사용자별 워크스페이스를 지원하기 어려움 | Notion OAuth token과 database ID를 사용자별로 저장 |
| 마이크 권한 UX | 권한 거부/미지원/요청 중 상태가 사용자에게 모호함 | `MicrophonePermissionState`로 상태를 세분화 |
| RAG 검색 저장소 선택 | 초기 버전에 벡터 DB를 도입하면 운영 복잡도 증가 | 요청 시 임베딩 생성 방식으로 먼저 구현, 향후 벡터 DB 확장 가능 |

### 8.2 해결 과정 상세

#### 8.2.1 AI 응답 구조화

회의록 결과가 항상 동일한 구조로 나와야 n8n과 Notion 저장이 안정적으로 동작합니다. 이를 위해 `MeetingSummarySchema`를 정의하고 OpenAI 응답을 schema 기반으로 파싱합니다.

```ts
export const MeetingSummarySchema = z
  .object({
    title: z.string(),
    summary: z.string(),
    keyPoints: z.array(z.string()),
    decisions: z.array(z.string()),
    actionItems: z.array(ActionItemSchema),
    tags: z.array(z.string()),
  })
  .strict();
```

#### 8.2.2 Notion Payload 길이 제한

Notion API의 텍스트 제한을 피하기 위해 payload 변환 단계에서 길이를 제한합니다.

```ts
const NOTION_TEXT_LIMIT = 1900;
const SUMMARY_LIMIT = 900;
const MAX_KEY_POINTS = 8;
const MAX_DECISIONS = 6;
const MAX_ACTION_ITEMS = 8;
const MAX_TAGS = 8;
```

이 방식은 외부 API 실패 가능성을 프론트엔드가 아니라 도메인 변환 계층에서 줄입니다.

#### 8.2.3 OAuth URL 계산

배포 환경에서는 `localhost`로 만들어진 redirect URI가 Notion OAuth에서 실패합니다. `getAppBaseUrl`은 우선순위에 따라 운영 URL을 선택합니다.

```text
APP_BASE_URL
  -> NEXT_PUBLIC_APP_URL
  -> VERCEL_URL
  -> NOTION_OAUTH_REDIRECT_URI origin
  -> request origin
```

### 8.3 성능 개선

| 영역 | 개선 내용 |
| --- | --- |
| 회의록 조회 | Notion query page size를 50으로 제한 |
| RAG 검색 | 상위 5개 컨텍스트만 답변 생성에 사용 |
| Notion text | 긴 본문은 1,900자 내외로 제한 |
| UI | 로딩 상태를 분리해 불필요한 중복 요청 방지 |
| API | n8n 호출에 15초 timeout 적용 |

### 8.4 리팩토링 내용

| 리팩토링 | 설명 |
| --- | --- |
| 인증 공통화 | `requireAuthenticatedUser`로 API 인증 처리 통일 |
| Supabase 클라이언트 분리 | 브라우저용 `supabase.ts`, 서버 관리자용 `supabase-admin.ts` 분리 |
| Notion 연결 로직 분리 | OAuth state, token exchange, connection upsert를 `notion-connections.ts`로 분리 |
| Notion 기록 조회 분리 | Notion DB query와 block parsing을 `notion-records.ts`, `notion.ts`로 분리 |
| 회의록 도메인 분리 | schema, validation, n8n payload 변환을 `meeting.ts`에 집중 |
| 녹음 Hook 분리 | MediaRecorder 상태와 권한 처리를 `use-audio-recorder.ts`로 분리 |

### 8.5 최적화 과정

1. AI 응답을 자유 텍스트에서 schema 기반 JSON으로 변경
2. Notion 저장 전 payload를 짧고 명확한 필드로 변환
3. 외부 URL validation을 강화해 실패 가능성이 큰 요청을 사전에 차단
4. 인증 로직을 API마다 반복하지 않도록 공통 함수화
5. RAG 검색을 상위 후보 기반으로 제한해 토큰 사용량을 통제

---

## 9. 보안 및 성능 고려사항

### 9.1 인증/인가 처리

모든 사용자 데이터 접근 API는 Supabase access token을 검증합니다.

```text
Client Supabase Session
  -> Authorization Bearer Token
  -> Server getUser(token)
  -> userId 확보
  -> userId 기준 Notion connection 조회
```

인가 기준:

- 사용자는 자신의 `user_notion_connections`만 사용합니다.
- Notion 조회/검색은 인증된 `userId`의 Notion access token과 database ID로만 수행합니다.
- 클라이언트에는 Notion access token과 refresh token을 반환하지 않습니다.

### 9.2 비밀번호 암호화

비밀번호는 애플리케이션 서버가 직접 저장하지 않습니다. Supabase Auth가 비밀번호 해싱, 세션 발급, 이메일 인증 옵션을 담당합니다.

### 9.3 API 보안

| 항목 | 적용 방식 |
| --- | --- |
| API Key 보호 | OpenAI, Notion OAuth Secret, Supabase Service Role Key는 서버 환경 변수로만 사용 |
| Bearer Token 검증 | `requireAuthenticatedUser`에서 Supabase Auth 검증 |
| Webhook Secret | `N8N_WEBHOOK_SECRET` 설정 시 `X-AMA-Webhook-Secret` 헤더 전달 |
| 민감 정보 마스킹 | Notion connection 응답에서 access token/refresh token 제거 |
| URL 검증 | n8n webhook URL scheme, test URL, localhost 차단 |
| OAuth state | state 저장, TTL 검증, 사용 후 삭제 |

### 9.4 XSS / CSRF 대응

현재 구조에서 주요 입력은 React가 텍스트로 렌더링하므로 기본적인 XSS 위험은 낮습니다. 다만 향후 Markdown 렌더링이나 HTML 삽입 기능을 추가할 경우 sanitization이 필요합니다.

CSRF 관점:

- JSON API는 Bearer Token 기반으로 호출됩니다.
- Notion OAuth는 state 검증을 통해 callback 위조 위험을 낮춥니다.
- 쿠키 기반 인증으로 변경할 경우 CSRF token 또는 SameSite 정책 강화가 필요합니다.

### 9.5 성능 최적화 전략

| 전략 | 설명 |
| --- | --- |
| 요청별 상태 분리 | 전사/분석/n8n 전송 상태를 분리해 UI blocking 최소화 |
| Notion 조회 제한 | page size 50으로 초기 조회 범위 제한 |
| 컨텍스트 제한 | RAG 답변 생성에 상위 5개 회의록만 사용 |
| payload 축소 | Notion/n8n payload 전송 전 텍스트 길이 제한 |
| timeout | n8n webhook 호출 15초 제한 |
| 캐싱 후보 | Notion records, embeddings, dashboard stats는 향후 캐싱 가능 |

### 9.6 캐싱 전략

현재는 최신 Notion 데이터 반영을 우선해 명시적 캐싱을 크게 사용하지 않습니다. 향후 운영 단계에서는 다음 전략을 적용할 수 있습니다.

| 대상 | 캐싱 방식 |
| --- | --- |
| Notion 회의록 목록 | 사용자별 short TTL 캐시 또는 `revalidateTag` |
| RAG 임베딩 | Supabase pgvector에 회의록 임베딩 저장 |
| 대시보드 통계 | records 기반 memoization 또는 서버 캐시 |
| 정적 이미지 | Next.js public asset 캐싱 |
| n8n 실패 이벤트 | 재시도 큐 또는 dead-letter 저장소 |

---

## 10. 협업 방식

### 10.1 Git 전략

권장 Git 전략:

```text
main
  |
  +-- develop
        |
        +-- feature/auth
        +-- feature/notion-oauth
        +-- feature/meeting-analysis
        +-- feature/archive-search
        +-- fix/n8n-webhook-validation
```

### 10.2 브랜치 전략

| 브랜치 | 용도 |
| --- | --- |
| `main` | 운영 배포 기준 브랜치 |
| `develop` | 통합 개발 브랜치 |
| `feature/*` | 기능 개발 |
| `fix/*` | 버그 수정 |
| `refactor/*` | 구조 개선 |
| `docs/*` | 문서 작업 |

### 10.3 코드 컨벤션

| 항목 | 규칙 |
| --- | --- |
| 언어 | TypeScript |
| 컴포넌트 | PascalCase |
| 함수/변수 | camelCase |
| 상수 | UPPER_SNAKE_CASE 또는 의미 있는 camelCase |
| API Route | `src/app/api/**/route.ts` |
| 테스트 | `*.test.ts` |
| Validation | Zod schema 우선 |
| 스타일 | Tailwind CSS + UI 컴포넌트 + CSS Module |

### 10.4 협업 프로세스

```text
1. 이슈 생성
2. 요구사항/수용 조건 정의
3. feature 브랜치 생성
4. 구현
5. 로컬 테스트 및 lint/build 확인
6. Pull Request 생성
7. 코드 리뷰
8. 수정 반영
9. develop 병합
10. main 배포
```

### 10.5 이슈 관리 방식

권장 라벨:

| 라벨 | 설명 |
| --- | --- |
| `feature` | 신규 기능 |
| `bug` | 버그 |
| `docs` | 문서 |
| `refactor` | 구조 개선 |
| `infra` | 배포/환경 |
| `security` | 인증/보안 |
| `ai` | OpenAI 분석/검색 |
| `integration` | Notion/n8n/Supabase 연동 |

---

## 11. 테스트

### 11.1 테스트 전략

현재 프로젝트는 핵심 도메인 로직을 중심으로 Vitest 단위 테스트를 구성하고 있습니다.

| 테스트 대상 | 목적 |
| --- | --- |
| 회의록 JSON 파싱 | AI 응답이 schema에 맞는지 검증 |
| 빈 입력 처리 | 회의 텍스트 validation 검증 |
| n8n payload 변환 | Notion 제한에 맞게 길이/개수 제한 |
| Notion OAuth URL | 배포/로컬 Redirect URI 계산 검증 |

### 11.2 단위 테스트

테스트 파일:

```text
src/lib/meeting.test.ts
src/lib/notion-connections.test.ts
```

실행 명령:

```bash
npm.cmd run test
```

테스트 예시:

```ts
expect(parseMeetingSummaryJson(JSON.stringify(validSummary))).toEqual(validSummary);
expect(() => validateMeetingText({ meetingText: "   " })).toThrow();
```

### 11.3 통합 테스트

권장 통합 테스트 시나리오:

| 시나리오 | 검증 항목 |
| --- | --- |
| 로그인 후 분석 | Supabase token이 API에 전달되는지 |
| 음성 전사 | FormData 업로드와 Whisper 응답 처리 |
| n8n 전송 | payload 구조와 webhook secret 헤더 |
| Notion OAuth | start -> callback -> connection 저장 |
| 회의록 조회 | Notion data source query와 block parsing |
| RAG 검색 | sources와 answer가 함께 반환되는지 |

### 11.4 사용자 테스트

권장 사용자 테스트 체크리스트:

- 신규 사용자가 로그인/회원가입을 완료할 수 있는가?
- Notion 연결 안내가 이해하기 쉬운가?
- 텍스트 입력 후 회의록이 자연스럽게 생성되는가?
- 음성 녹음 권한 거부 시 안내가 충분한가?
- n8n 저장 실패 시 사용자가 원인을 파악할 수 있는가?
- 저장된 회의록이 대시보드/기록 화면에 표시되는가?
- 지식 아카이브 검색 답변이 실제 회의록 근거와 일치하는가?

### 11.5 테스트 결과

문서 작성 시점 기준 테스트 명령은 별도로 실행하지 않았습니다. 현재 저장소에는 테스트 스크립트와 Vitest 테스트 파일이 존재합니다.

권장 검증 명령:

```bash
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

---

## 12. 배포 및 운영

### 12.1 배포 환경

권장 배포 구조:

| 구성 | 권장 서비스 |
| --- | --- |
| Next.js App | Vercel 또는 Node.js 서버 |
| Database/Auth | Supabase |
| Automation | n8n Cloud 또는 self-hosted n8n |
| Knowledge Storage | Notion Database |
| AI API | OpenAI |

### 12.2 CI/CD 구조

권장 GitHub Actions 흐름:

```text
Pull Request
  -> npm ci
  -> npm.cmd run lint
  -> npm.cmd run test
  -> npm.cmd run build
  -> preview deployment

main merge
  -> production build
  -> production deployment
  -> smoke test
```

예시 workflow:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

### 12.3 서버 구성

```text
Client Browser
  -> HTTPS
  -> Next.js Server
       -> OpenAI API
       -> Supabase Auth/DB
       -> Notion API
       -> n8n Webhook
```

배포 시 주의:

- `/api/transcribe`, `/api/analyze`, `/api/archive/search`는 외부 OpenAI API 호출이 있으므로 timeout 정책 확인이 필요합니다.
- n8n webhook은 배포 서버에서 접근 가능한 URL이어야 합니다.
- Notion OAuth Redirect URI는 배포 도메인과 정확히 일치해야 합니다.

### 12.4 환경 변수 관리

`.env.local.example` 기준:

```env
OPENAI_API_KEY=
NOTION_API_KEY=
NOTION_DATABASE_ID=
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ALLOWED_DEV_ORIGINS=
```

추가로 코드에서 사용하는 환경 변수:

```env
OPENAI_MODEL=gpt-5.4-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
SUPABASE_SERVICE_ROLE_KEY=
NOTION_OAUTH_CLIENT_ID=
NOTION_OAUTH_CLIENT_SECRET=
NOTION_OAUTH_REDIRECT_URI=
APP_BASE_URL=
NEXT_PUBLIC_APP_URL=
VERCEL_URL=
```

환경 변수 분류:

| 변수 | 공개 여부 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 가능 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 공개 가능 | Supabase anon key |
| `OPENAI_API_KEY` | 서버 전용 | OpenAI API 호출 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | Supabase 관리자 DB 작업 |
| `NOTION_OAUTH_CLIENT_SECRET` | 서버 전용 | Notion OAuth token exchange |
| `N8N_WEBHOOK_SECRET` | 서버 전용 | n8n 요청 검증 헤더 |

### 12.5 로그 및 모니터링

현재 코드에는 일부 서버 에러에 `console.error`가 사용됩니다. 운영 단계에서는 다음 모니터링 체계를 권장합니다.

| 항목 | 방법 |
| --- | --- |
| API 에러율 | Vercel Logs, Sentry, OpenTelemetry |
| OpenAI API 실패 | endpoint/status/model/error message 로깅 |
| n8n 실패 | webhook status, timeout, retry count 추적 |
| Notion API 실패 | rate limit, database permission 에러 추적 |
| 인증 실패 | 401 발생 빈도 모니터링 |
| 사용자 행동 | 분석 실행 수, 저장 성공률, 검색 사용량 집계 |

---

## 13. 프로젝트 결과 및 성과

### 13.1 프로젝트를 통해 얻은 점

- AI 분석 결과를 실제 업무 자동화 payload로 변환하는 경험
- Next.js App Router 기반 BFF API 설계 경험
- Supabase Auth와 사용자별 외부 OAuth 연결 구현 경험
- Notion OAuth, Notion Database Query, Block Parsing 구현 경험
- n8n 웹훅을 활용한 서비스 간 자동화 파이프라인 구축 경험
- Whisper 전사와 회의록 분석을 연결한 멀티모달 입력 처리 경험
- 간단한 RAG 검색 구조 설계 경험

### 13.2 기술적 성장

| 영역 | 성장 포인트 |
| --- | --- |
| AI Engineering | schema 기반 AI 응답, 임베딩 유사도 검색, prompt 제약 설계 |
| Full-stack | 프론트엔드 상태 관리부터 API, DB, 외부 연동까지 구현 |
| Security | Bearer Token 검증, OAuth state, secret 관리 |
| Integration | Notion, n8n, Supabase, OpenAI의 다중 연동 |
| UX | 긴 비동기 작업의 상태 피드백과 오류 안내 설계 |

### 13.3 개선된 부분

- 회의록 작성 시간이 크게 줄어듭니다.
- 회의 결과물이 일정한 구조로 저장됩니다.
- 담당자/마감일 중심의 액션 아이템 관리가 쉬워집니다.
- Notion 기반 팀 지식 저장소와 자연스럽게 연결됩니다.
- 과거 회의록을 키워드가 아니라 의미 기반으로 다시 찾을 수 있습니다.

### 13.4 실제 기대 효과

| 지표 | 기대 효과 |
| --- | --- |
| 회의록 작성 시간 | 수동 작성 대비 대폭 감소 |
| 액션 아이템 누락률 | 구조화 추출로 감소 |
| 회의 기록 접근성 | Notion DB와 RAG 검색으로 개선 |
| 협업 투명성 | 결정사항/담당자/마감일 명확화 |
| 자동화 확장성 | n8n을 통해 다양한 업무 도구 연결 가능 |

---

## 14. 향후 계획 및 확장 가능성

### 14.1 추가 예정 기능

| 기능 | 설명 |
| --- | --- |
| 회의록 편집 후 저장 | AI 결과를 사용자가 수정한 뒤 n8n 전송 |
| 저장 상태 추적 | n8n 저장 성공/실패 상태를 UI에 표시 |
| 자동 재시도 | n8n/Notion 실패 시 재시도 큐 구현 |
| 캘린더 연동 | 회의 일정을 Google Calendar/Outlook에서 자동 가져오기 |
| 참석자 추출 | 회의 원문에서 참석자와 발언자 추출 |
| 액션 아이템 태스크화 | Google Tasks, Linear, Jira, Notion Task DB 연동 |
| 조직/팀 워크스페이스 | 개인 계정 외 팀 단위 권한 관리 |
| 회의록 공유 링크 | 읽기 전용 회의록 링크 생성 |
| 다국어 지원 | 한국어/영어 회의 전사와 요약 품질 최적화 |

### 14.2 확장 가능한 구조 설명

현재 구조는 단일 Next.js 애플리케이션이 BFF와 프론트엔드를 함께 담당합니다. 트래픽이나 기능이 늘어나면 다음처럼 분리할 수 있습니다.

```text
Phase 1: Monolithic Next.js
  - UI
  - API Route Handlers
  - OpenAI/Notion/n8n integration

Phase 2: Modular Backend
  - Next.js UI/BFF
  - AI Processing Worker
  - Automation Queue
  - Search Service

Phase 3: Microservices
  - Auth/User Service
  - Meeting Analysis Service
  - Notion Integration Service
  - RAG Search Service
  - Notification Service
```

### 14.3 AI 기능 추가 가능성

| AI 기능 | 설명 |
| --- | --- |
| 화자 분리 | 참석자별 발언 정리 |
| 회의 품질 분석 | 논의 균형, 반복 이슈, 결정 지연 탐지 |
| 자동 후속 메일 | 회의록 기반 요약 메일 생성 |
| 리스크 추출 | 일정/리소스/기술 리스크 자동 태깅 |
| 프로젝트별 메모리 | 프로젝트 컨텍스트를 반영한 회의록 작성 |
| 개인화 요약 | PM, 개발자, 디자이너 등 역할별 요약 |

### 14.4 MSA 또는 마이크로서비스 확장 가능성

서비스가 커지면 다음 기준으로 분리할 수 있습니다.

| 서비스 | 책임 |
| --- | --- |
| Auth Service | 사용자/조직/권한 |
| Meeting Ingestion Service | 음성/파일 업로드, 전사 |
| AI Analysis Service | 회의록 구조화, 태그/액션 추출 |
| Automation Service | n8n 또는 자체 워크플로우 실행 |
| Search Service | 임베딩 저장, 벡터 검색, RAG 응답 |
| Notification Service | 이메일, Slack, Teams 알림 |

### 14.5 모바일 앱 확장 가능성

모바일 확장 방향:

- React Native 또는 Expo 기반 앱
- 모바일 음성 녹음 최적화
- 회의 종료 후 push notification
- 이동 중 회의록 검색
- 오프라인 녹음 후 네트워크 복구 시 업로드

API가 JSON/Bearer Token 기반이므로 모바일 클라이언트에서도 동일한 백엔드를 사용할 수 있습니다.

### 14.6 사용자 증가 대응 전략

| 이슈 | 대응 |
| --- | --- |
| OpenAI API 비용 증가 | 모델 라우팅, 요약 길이 제한, 캐싱 |
| Notion API rate limit | 사용자별 throttle, 재시도 backoff |
| RAG 검색 지연 | 임베딩 사전 저장, 벡터 DB 도입 |
| n8n 처리량 | queue 기반 비동기 처리, worker 분리 |
| 긴 오디오 전사 | chunk upload, background job |
| 동시 사용자 증가 | 서버리스 scaling 또는 Node worker pool |

### 14.7 클라우드 확장 전략

권장 확장 단계:

```text
1. Vercel + Supabase + n8n Cloud
2. Supabase pgvector로 회의록 임베딩 저장
3. Queue 도입: Upstash Redis, Cloud Tasks, BullMQ
4. Worker 분리: transcription/analysis/search
5. Observability: Sentry + OpenTelemetry
6. Multi-region deployment
```

---

## 15. 결론

AMA는 회의 내용을 입력받아 AI로 구조화하고, n8n과 Notion을 통해 실제 업무 기록으로 저장하며, 다시 지식 아카이브로 검색할 수 있게 만드는 회의 자동화 프로젝트입니다.

이 프로젝트의 의의는 단순히 “AI가 회의록을 요약한다”에 머무르지 않는다는 점입니다. 입력, 전사, 분석, 저장, 조회, 검색, 자동화 확장까지 이어지는 하나의 업무 파이프라인을 구현했습니다. 특히 Supabase Auth 기반 사용자 인증, Notion OAuth 기반 개인 워크스페이스 연결, n8n 웹훅 기반 확장성, OpenAI 임베딩 기반 RAG 검색을 하나의 제품 흐름으로 통합했다는 점에서 포트폴리오와 실서비스 프로토타입 양쪽에 의미가 있습니다.

향후에는 저장 성공 상태 추적, 벡터 DB 기반 검색 최적화, 팀 단위 권한 관리, 캘린더/메일/태스크 연동을 추가해 “회의 이후의 모든 반복 업무를 자동화하는 AI 업무 비서”로 확장할 수 있습니다.

---

## 부록 A. 실행 방법

```bash
npm.cmd install
npm.cmd run dev
```

브라우저에서 접속:

```text
http://localhost:3000
```

검증 명령:

```bash
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

---

## 부록 B. 핵심 환경 변수 예시

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NOTION_OAUTH_CLIENT_ID=your-notion-client-id
NOTION_OAUTH_CLIENT_SECRET=your-notion-client-secret
NOTION_OAUTH_REDIRECT_URI=https://your-domain.com/api/notion/oauth/callback
APP_BASE_URL=https://your-domain.com

N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook/start-docs
N8N_WEBHOOK_SECRET=your-shared-secret

ALLOWED_DEV_ORIGINS=http://localhost:3000
```

---

## 부록 C. 핵심 타입 정의

```ts
type MeetingSummary = {
  title: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: Array<{
    task: string;
    owner: string | null;
    dueDate: string | null;
  }>;
  tags: string[];
};

type NotionMeetingRecord = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  meetingDate: string | null;
  url: string | null;
  keyPoints?: string[];
  decisions?: string[];
  actionItems?: ActionItem[];
  transcript?: string;
};
```

