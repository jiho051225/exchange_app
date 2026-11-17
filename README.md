# TRIPLOG

교환학생의 장소·여행 기록을 모으는 웹 앱입니다. [PRD.md](PRD.md)와 [ACCEPTANCE.md](ACCEPTANCE.md)를 기준으로 구현을 진행합니다.

## 실행

Node.js 20 이상에서 `npm install` 후 `npm run dev`를 실행하고 `http://localhost:3000`을 여세요. `.env.local`을 만들지 않으면 체험 모드가 열립니다. 체험 모드에는 화면 확인용 예시 여행과 장소 기록이 들어 있으며, 새 기록은 현재 브라우저에만 저장됩니다.

## 공용 기록과 Google 지도 연결

1. Supabase 프로젝트를 만들고 **Authentication → Anonymous Sign-Ins**를 켭니다.
2. SQL Editor에서 `supabase/schema.sql`을 실행합니다.
3. `.env.example`을 `.env.local`로 복사해 Supabase URL과 공개 키를 넣습니다. **service role 키는 넣지 않습니다.**
4. Google Cloud에서 Maps JavaScript API와 Places API (New)를 활성화하고 결제·사용량 제한을 설정합니다.
5. 웹사이트 주소로 제한한 Google API 키를 `.env.local`에 넣습니다.
6. 개발 서버를 재시작합니다.

공용 모드에서는 로그인 화면 없이 Supabase 익명 사용자로 작성자를 구분합니다. 브라우저 데이터 삭제 시 기존 기록의 수정 권한을 잃습니다. `.env.local`은 Git에 포함하지 않습니다.

## 현재 구현 범위

지도 홈, 장소 검색·상세·기록, 날짜별 여행 작성·상세, 이동수단, 장소와 여행 연결, 임시저장·공개·공개 취소, 댓글·답글, 사진 업로드, 내 기록 관리가 포함됩니다. API 키 없이도 예시 장소 검색과 지도 화면을 확인할 수 있습니다. 공용 데이터, 사용자 간 공유, Google 실제 장소 검색과 지도는 각 서비스 설정 후 동작합니다.

PRD의 신고·운영자 숨김·등록 횟수 제한, 댓글 수정, 저장하지 않은 변경의 이탈 안내는 아직 구현되지 않았습니다. 사진은 삭제한 기록과 함께 화면에서 사라지지만 Storage 파일 정리는 아직 연결되지 않았습니다. 공개 운영 전에는 이 기능과 운영자 인증, 비용 제한을 완료해야 합니다.
