import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { ColorTheme } from "../../../constants/colors";
import { fontSize, radius, spacing } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";

/**
 * 헬스장 상세 액션 버튼 (UI 전담)
 * - 전화 걸기(번호 있을 때) / 카카오맵 길찾기 외부 링크 열기.
 */
interface GymActionsProps {
  name: string;
  lat: number;
  lng: number;
  phone: string | null;
}

export function GymActions({ name, lat, lng, phone }: GymActionsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  function call() {
    if (phone) Linking.openURL(`tel:${phone}`);
  }

  function openDirections() {
    // 카카오맵 길찾기 웹 링크
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(
      name
    )},${lat},${lng}`;
    Linking.openURL(url);
  }

  return (
    <View style={styles.row}>
      {phone ? (
        <Pressable
          style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
          onPress={call}
        >
          <Ionicons name="call-outline" size={18} color={colors.primary} />
          <Text style={styles.label}>전화</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
        onPress={openDirections}
      >
        <Ionicons name="navigate-outline" size={18} color={colors.primary} />
        <Text style={styles.label}>길찾기</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    button: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.primaryMuted,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      fontSize: fontSize.md,
      fontWeight: "600",
      color: colors.primary,
    },
  });
}
