/**
 * 레이아웃 상수 (간격 / 모서리 / 폰트 크기)
 * - 하드코딩 대신 이곳을 참조한다. (CLAUDE.md 규칙)
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

export const fontSize = {
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
} as const;
