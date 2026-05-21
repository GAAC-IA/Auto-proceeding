# 회의록 AI 분석 + Notion 저장 MVP 구현 계획

## Summary
- 현재 폴더에 `npx.cmd create-next-app@latest .` 기반으로 Next.js App Router, TypeScript, Tailwind 프로젝트를 생성한다.
- 텍스트 입력 → `/api/analyze` OpenAI 구조화 출력 → 결과 미리보기 → `/api/notion` Notion DB 저장 흐름을 구현한다.
- 음성 업로드, Supabase, n8n, Zoom/Webex 연동은 MVP 범위에서 제외한다.

## Key Changes
- UI: `/` 페이지에 Shadcn `Card`, `Textarea`, `Button`, `Alert`, `Badge` 기반 입력/분석/저장/결과 미리보기 화면을 만든다.
- API:
  - `POST /api/analyze`: `{ meetingText }` 입력, 빈 값 검증, OpenAI Responses API structured output으로 `MeetingSummary` 반환.
  - `POST /api/notion`: `MeetingSummary` 입력, Notion page 생성 후 `{ success, pageId? }` 반환.
- Shared logic:
  - `ActionItem`, `MeetingSummary` 타입과 Zod schema를 공용으로 둔다.
  - AI 응답 JSON 파싱/검증 함수와 Notion properties 변환 함수를 분리해 테스트 가능하게 만든다.
- Notion 저장 매핑:
  - `Title`: `title`
  - `Summary`: rich_text
  - `Key Points`: rich_text
  - `Decisions`: rich_text
  - `Action Items`: rich_text
  - `Tags`: multi_select
  - `Created At`: date
- 환경 파일:
  - `.env.local.example`에 `OPENAI_API_KEY`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`를 추가한다.
  - OpenAI 모델은 MVP 기본값 `gpt-5.4-mini`로 두고, 필요 시 코드에서 쉽게 바꿀 수 있게 상수화한다.

## Test Plan
- Vitest를 추가하고 `describe/it` 구조와 한글 테스트 설명을 사용한다.
- 테스트 대상:
  - 정상 JSON이 `MeetingSummary`로 파싱되는지 검증.
  - 빈 회의 텍스트가 `/api/analyze` 입력 검증에서 거부되는지 검증.
  - Notion 저장용 properties 변환이 지정된 DB 속성명과 타입에 맞는지 검증.
- 검증 명령:
  - `npm.cmd run test`
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - 가능하면 `npm.cmd run dev`를 짧게 실행해 로컬 dev 서버 시작 여부를 확인한다.

## Assumptions
- 현재 README는 `# Auto-proceeding`만 있으므로 Next.js MVP용 README로 교체한다.
- 패키지 설치와 `create-next-app` 실행에는 네트워크 접근 승인이 필요할 수 있다.
- Notion DB는 사용자가 제시한 속성명을 정확히 가진 상태라고 가정한다.
- OpenAI structured output은 공식 문서 권장 방식인 Responses API `text.format`/Zod helper를 사용한다.

## References
- [Next.js create-next-app CLI](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
- [shadcn/ui Next.js install](https://ui.shadcn.com/docs/installation/next)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI Models](https://developers.openai.com/api/docs/models)
- [Notion Create a page](https://developers.notion.com/reference/post-page)
- [Notion Page properties](https://developers.notion.com/reference/property-value-object)
