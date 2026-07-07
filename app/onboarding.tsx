import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/ui/Button";
import { colors } from "../constants/colors";
import { fontSize, spacing } from "../constants/layout";
import { useOnboardingStore } from "../store/onboardingStore";

type IconName = ComponentProps<typeof Ionicons>["name"];

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: "pricetags-outline",
    title: "투명한 가격",
    desc: "헬스장이 공개하지 않는 가격을 한눈에 비교",
  },
  {
    icon: "people-outline",
    title: "함께 만드는 정보",
    desc: "이용자가 직접 등록하는 크라우드소싱",
  },
  {
    icon: "navigate-outline",
    title: "내 주변 검색",
    desc: "현재 위치 기준 가까운 헬스장과 최저가",
  },
];

/** 온보딩 화면 — 최초 1회 노출, 시작하기 누르면 완료 처리(루트가 화면 전환) */
export default function OnboardingScreen() {
  const complete = useOnboardingStore((state) => state.complete);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>GymPrice</Text>
      <Text style={styles.tagline}>동네 헬스장 가격, 투명하게 비교하세요</Text>

      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.feature}>
            <Ionicons name={feature.icon} size={28} color={colors.primary} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <Button title="시작하기" onPress={() => complete()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: "center",
  },
  logo: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "center",
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  features: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.text,
  },
  featureDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
