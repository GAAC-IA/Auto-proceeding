# MeetAI MVP

OpenAI와 Notion API를 사용해 회의 텍스트를 업무용 회의록으로 분석하고 Notion Database에 저장하는 Next.js MVP입니다.

## 주요 기능

- 회의 텍스트 입력
- OpenAI 기반 회의록 JSON 생성
- 회의 제목, 요약, 핵심 논의 내용, 결정사항, 액션 아이템, 태그 미리보기
- Notion Database 자동 저장
- 빈 입력, JSON 파싱, Notion 변환 핵심 로직 테스트

## 실행 방법

### 환경변수 설정

1. 환경변수 파일을 준비합니다.

```bash
copy .env.example .env.local
```

2. `.env.local`에 필요한 값을 입력합니다.

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-mini

# n8n Webhook Configuration
N8N_WEBHOOK_URL=your_n8n_webhook_url_here

# Notion Configuration
NOTION_DATABASE_ID=your_notion_database_id_here

# Email Configuration
DEFAULT_RECIPIENT_EMAIL=your_email@example.com

# Google Calendar Configuration
GOOGLE_CALENDAR_ID=primary
```

### 서버 실행

3. 개발 서버를 실행합니다.

```bash
npm.cmd run dev
```

4. 브라우저에서 `http://localhost:3000`을 엽니다.

## Notion Database 속성

아래 속성명을 Notion Database에 동일하게 만들어야 저장됩니다.

- `Title`: title
- `Summary`: rich_text
- `Key Points`: rich_text
- `Decisions`: rich_text
- `Action Items`: rich_text
- `Tags`: multi_select
- `Created At`: date

## 테스트

```bash
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

## 파일 구조

```text
src/
  app/
    api/analyze/route.ts
    api/notion/route.ts
    page.tsx
  components/
    meeting-workspace.tsx
    ui/
  lib/
    meeting.ts
    notion.ts
    meeting.test.ts
    notion.test.ts
```
