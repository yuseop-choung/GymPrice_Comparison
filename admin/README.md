# GymPrice Admin

가격 제보 심사(승인/거절)용 관리자 웹 페이지. 별도 빌드 없이 `index.html` 하나로 동작하며,
Supabase 프로젝트에 브라우저에서 직접 연결합니다.

## 실행 방법

정적 파일이라 그냥 더블클릭해서 열어도 되지만, 브라우저에 따라 `file://` 경로에서
네트워크 요청이 막히는 경우가 있어 **로컬 서버로 띄우는 걸 권장**합니다.

```bash
# 이 폴더(admin/)에서
npx serve .
# 또는
python -m http.server 5500
```

터미널에 뜨는 주소(예: http://localhost:3000 또는 http://localhost:5500)를 브라우저로 엽니다.

## 최초 1회 설정

1. 처음 열면 "Supabase URL" / "Supabase anon key" 입력창이 뜹니다.
   - Supabase 대시보드 → Project Settings → API 에서 **Project URL**과 **anon public** 키를
     복사해서 입력 (`.env`에 넣은 `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`와 동일한 값).
   - 한 번 입력하면 브라우저에 저장되어 다음부터는 바로 로그인 화면으로 넘어갑니다.
2. 관리자 계정(이메일/비밀번호)으로 로그인.
   - 먼저 앱에서 그 계정으로 회원가입이 되어 있어야 하고,
   - Supabase SQL Editor에서 `update public.users set is_admin = true where email = '본인 이메일';` 을
     실행해 관리자 권한을 켜둬야 합니다.

## 배포하고 싶다면

정적 파일이라 Vercel/Netlify/GitHub Pages 아무데나 올려도 됩니다(빌드 설정 불필요, `index.html`만 있으면 됨).
