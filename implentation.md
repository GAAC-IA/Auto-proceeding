# AMA 구현 메모

## 현재 구현 범위

- `/` 단일 화면 안에서 대시보드, 회의 분석, 회의 기록, 지식 아카이브를 전환한다.
- 회의 분석은 텍스트 입력, 브라우저 마이크 녹음, 녹음 파일 업로드, 텍스트 파일 업로드를 받아 Gemini API 기반 구조화 출력으로 회의록을 만든다.
- 음성 입력은 STT 변환 후 같은 회의 분석 파이프라인으로 전달한다.
- 분석 결과는 n8n 웹훅으로 전달되며, n8n 워크플로우가 Notion 데이터베이스 저장과 후속 자동화를 담당한다.
- 회의 기록과 지식 아카이브는 `/api/notion`이 Notion DB에서 조회한 데이터를 기반으로 표시한다.

## 자동화 워크플로우

1. 사용자가 회의 텍스트를 입력하거나, 음성 녹음을 종료하거나, 회의 파일을 업로드한다.
2. 음성 입력인 경우 `/api/transcribe`가 Gemini 기반 STT로 텍스트를 만든다.
3. `/api/analyze`가 Gemini API와 Zod 스키마를 사용해 회의 제목, 요약, 핵심 논의, 결정사항, 액션 아이템, 태그를 생성한다.
4. 클라이언트는 생성된 회의록을 미리 보여주고 `/api/n8n`으로 요약 데이터와 전체 전사 텍스트를 전송한다.
5. n8n은 웹훅 입력을 검증한 뒤 Notion DB에 회의록 페이지를 생성한다.
6. n8n은 액션 아이템이 있으면 Google Tasks, Google Calendar, Gmail 같은 후속 자동화를 실행할 수 있다.
7. 대시보드, 회의 기록, 지식 아카이브는 `/api/notion`을 통해 Notion DB의 최신 회의록을 다시 조회해 표시한다.

## Notion 데이터 매핑

- `회의 제목`: title
- `요약`: rich_text
- `태그`: multi_select
- `회의 일자`: date
- 페이지 본문 블록: 핵심 논의, 결정사항, 액션 아이템, 전체 전사 텍스트

## 환경 변수

- `GEMINI_API_KEY`: Gemini 분석 및 전사에 사용한다.
- `GEMINI_MODEL`: 기본값은 `gemini-2.5-flash`다.
- `N8N_WEBHOOK_URL`: 분석 결과를 받을 n8n 웹훅 주소다.
- `NOTION_API_KEY`: Notion DB 조회 API에서 사용한다.
- `NOTION_DATABASE_ID`: 회의록을 저장하고 조회할 Notion 데이터베이스 ID다.

## 검증 명령

```bash
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```
