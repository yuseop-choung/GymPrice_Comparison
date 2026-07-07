import { Stack } from "expo-router";

/** 인증 화면 그룹 레이아웃 (헤더 없이 풀스크린) */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
