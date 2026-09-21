import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import type { Gym } from "../../../types";

interface GymResultRowProps {
  gym: Gym;
  onPress: () => void;
}

/** 통합 검색의 헬스장 결과 한 줄 (UI 전담, 비즈니스 로직 없음) */
export function GymResultRow({ gym, onPress }: GymResultRowProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <Text style={styles.name}>{gym.name}</Text>
      {gym.address ? <Text style={styles.address}>{gym.address}</Text> : null}
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    row: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
    },
    pressed: {
      opacity: 0.7,
    },
    name: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.text,
    },
    address: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
}
