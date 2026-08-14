# Google 및 Email OTP 인증 설정

## Migration 적용

Supabase CLI 또는 SQL Editor에서 `001`, `002`, `003` migration을 번호 순서대로 적용합니다. 운영 교직원은 `teachers.email`에 소문자로 등록하고 `is_active`를 `true`로 설정합니다.

## Google Cloud 설정

1. Google Cloud Console에서 프로젝트와 OAuth 동의 화면을 설정합니다.
2. Web application OAuth Client를 생성합니다.
3. Authorized JavaScript origins에 `http://localhost:3000`과 실제 HTTPS 도메인을 추가합니다.
4. Authorized redirect URI에는 Supabase Google Provider 화면의 `https://<project-ref>.supabase.co/auth/v1/callback`을 등록합니다.
5. Client ID와 Client Secret은 Supabase에만 입력하고 공개 환경변수에 넣지 않습니다.

## Supabase Google Provider

1. Dashboard → Authentication → Providers → Google을 활성화합니다.
2. Google Client ID와 Secret을 입력합니다.
3. Authentication → URL Configuration의 Site URL을 실제 서비스 주소로 설정합니다.
4. Redirect URLs에 `http://localhost:3000/auth/callback`과 `https://실제도메인/auth/callback`을 추가합니다.

## Email OTP

1. Authentication → Providers → Email을 활성화합니다.
2. Email Template에 6자리 코드용 `{{ .Token }}`을 포함합니다.
3. 운영용 SMTP를 연결하고 학교 메일 수신을 확인합니다.
4. 앱은 메일 발송 전에 활성 교직원 whitelist를 검사합니다.

## 환경변수와 운영 확인

`.env.example`을 복사해 `.env.local`을 만듭니다. Service role, 학생 session secret, Google Client Secret은 브라우저 코드나 저장소에 넣지 않습니다. 등록·미등록·비활성 이메일, teacher의 관리자 접근 차단, 두 로그인 방식의 동일 계정 연결을 모두 확인합니다.
