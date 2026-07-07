/**
 * 색상 팔레트
 * - 하드코딩된 색상값을 직접 쓰지 말고 반드시 이곳을 참조한다. (CLAUDE.md 규칙)
 */
export const colors = {
  primary: "#2563EB", // 메인 색상
  background: "#FFFFFF", // 화면 배경
  surface: "#F3F4F6", // 카드/입력 배경
  text: "#111827", // 기본 텍스트
  textSecondary: "#6B7280", // 보조 텍스트/플레이스홀더
  border: "#D1D5DB", // 테두리
  error: "#DC2626", // 에러
  white: "#FFFFFF",
  disabled: "#9CA3AF", // 비활성
  // SNS 브랜드 색상
  naver: "#03C75A", // 네이버 그린
  googleBorder: "#DADCE0", // 구글 버튼 테두리
} as const;
