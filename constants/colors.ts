/**
 * 색상 팔레트 (라이트/다크 테마)
 * - 하드코딩된 색상값을 직접 쓰지 말고 반드시 이곳을 참조한다. (CLAUDE.md 규칙)
 * - 화면/컴포넌트에서는 이 객체를 직접 import하지 말고, hooks/useThemeColors의
 *   useThemeColors()를 통해 현재 테마에 맞는 팔레트를 받아 사용한다.
 */
export interface ColorTheme {
  primary: string; // 메인 색상
  primaryMuted: string; // 선택/활성 상태의 은은한 배경 (예: 선택된 지역, 활성 탭)
  background: string; // 화면 배경
  surface: string; // 입력창 등 옅은 배경
  surfaceElevated: string; // 카드처럼 배경 위로 떠 보여야 하는 표면
  text: string; // 기본 텍스트
  textSecondary: string; // 보조 텍스트/플레이스홀더
  border: string; // 테두리
  error: string; // 에러
  success: string; // 성공/승인 상태
  white: string;
  disabled: string; // 비활성
  overlay: string; // 로딩 중 화면 위 반투명 오버레이
  shadow: string; // 카드 그림자 색상
  // SNS 브랜드 색상
  naver: string; // 네이버 그린
  googleBorder: string; // 구글 버튼 테두리
}

export const lightColors: ColorTheme = {
  primary: "#2563EB",
  primaryMuted: "#DBEAFE",
  background: "#FFFFFF",
  surface: "#F3F4F6",
  surfaceElevated: "#FFFFFF",
  text: "#111827",
  textSecondary: "#6B7280",
  border: "#D1D5DB",
  error: "#DC2626",
  success: "#16A34A",
  white: "#FFFFFF",
  disabled: "#9CA3AF",
  overlay: "rgba(255, 255, 255, 0.6)",
  shadow: "#111827",
  naver: "#03C75A",
  googleBorder: "#DADCE0",
};

export const darkColors: ColorTheme = {
  primary: "#3B82F6",
  primaryMuted: "#1E3A5F",
  background: "#0B1120",
  surface: "#151E2E",
  surfaceElevated: "#1E293B",
  text: "#F3F4F6",
  textSecondary: "#94A3B8",
  border: "#2D3748",
  error: "#F87171",
  success: "#4ADE80",
  white: "#FFFFFF",
  disabled: "#475569",
  overlay: "rgba(11, 17, 32, 0.7)",
  shadow: "#000000",
  naver: "#03C75A",
  googleBorder: "#334155",
};

/** 기존 코드가 남아있을 경우를 대비한 기본값(라이트) — 새 코드는 useThemeColors()를 쓴다 */
export const colors = lightColors;
