# Project: GymPrice (헬스장 가격 비교 앱)

## 서비스 개요
헬스장이 가격을 공개하지 않는 문제를 해결하기 위해,
이용자가 직접 가격을 등록하고 동네 헬스장 가격을 비교할 수 있는 크라우드소싱 앱.

## 타겟 유저
20~40대, 헬스장 등록을 고려 중인 사람

## 기술 스택
- Framework: Expo (React Native)
- Language: TypeScript
- Backend/DB: Supabase (PostgreSQL)
- 지도: 카카오맵 SDK
- 인증: Supabase Auth (Google, Naver OAuth)
- 푸시 알림: Expo Notifications
- 상태관리: Zustand
- API 통신: /lib/supabase.ts, /lib/api/ 폴더에서만 처리

## 폴더 구조 원칙
/app           → 화면 (Expo Router 기반)
/features      → 기능 단위 로직 (헬스장, 가격, 유저 등)
/components/ui → 재사용 공통 컴포넌트
/lib           → supabase 클라이언트, api 함수
/types         → 전체 타입 정의
/hooks         → 커스텀 훅
/constants     → 색상, 폰트, 상수값

## 코딩 규칙
- TypeScript strict 모드, any 금지
- 컴포넌트 파일은 150줄 초과 금지 (넘으면 분리)
- UI 컴포넌트는 비즈니스 로직 포함 금지 → hooks로 분리
- API 호출은 반드시 /lib/api/ 통해서만
- 주석은 한국어로

## 절대 하지 말 것
- any 타입 사용
- 컴포넌트 안에서 직접 supabase 쿼리 호출
- 하드코딩된 색상/폰트 (constants 사용)
- 하나의 파일에 여러 역할 혼재