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
  xxl: 28,
} as const;

/**
 * 카드 등 배경 위로 떠 보여야 하는 요소의 그림자 프리셋.
 * - shadowColor는 테마별 colors.shadow를 넣어 쓴다(라이트/다크에서 그림자 톤이 달라야 하므로).
 */
export function elevation(shadowColor: string, level: "sm" | "md" = "sm") {
  const preset =
    level === "md"
      ? { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 }
      : { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 };
  return { shadowColor, ...preset };
}

/** 인터랙션 애니메이션 지속 시간(ms) */
export const duration = {
  fast: 120,
  base: 200,
} as const;
