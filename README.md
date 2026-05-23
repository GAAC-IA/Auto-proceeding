# AMA

Gemini API와 Notion API를 사용해 회의 텍스트, 녹음 파일, 텍스트 파일을 업무용 회의록으로 분석하고 Notion Database에 저장하는 Next.js 앱입니다.

## 주요 기능

- 회의 텍스트 직접 입력
- 회의 녹음 파일 업로드 후 STT 변환
- 텍스트 파일 업로드 후 즉시 회의 분석
- Gemini API 기반 회의록 JSON 생성
- 회의 제목, 요약, 핵심 논의 내용, 결정사항, 액션 아이템, 태그 미리보기
- n8n 워크플로우를 통한 Notion Database 자동 저장
- 빈 입력, JSON 파싱, Notion 변환 핵심 로직 테스트

## 실행 방법

### 환경변수 설정

1. 환경변수 파일을 준비합니다.

```bash
copy .env.local.example .env.local
```

2. `.env.local`에 필요한 값을 입력합니다.

```bash
# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# n8n Webhook Configuration
N8N_WEBHOOK_URL=your_n8n_webhook_url_here

# Notion Configuration
NOTION_DATABASE_ID=your_notion_database_id_here
```

### 서버 실행

```bash
npm.cmd run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## Notion Database 속성

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
