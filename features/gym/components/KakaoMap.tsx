import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { ColorTheme } from "../../../constants/colors";
import { KAKAO_JS_KEY } from "../../../constants/config";
import { fontSize } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { buildHtml, type MapMarker } from "./kakaoMapHtml";

interface KakaoMapProps {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  /** 마커를 누르면 해당 헬스장 id 전달 */
  onMarkerPress?: (id: string) => void;
}

/**
 * 카카오맵 (WebView + Kakao Maps JS SDK)
 * - KAKAO_JS_KEY가 없으면 안내 문구를 보여준다.
 * - 마커 클릭 시 WebView → RN 으로 헬스장 id를 postMessage 한다.
 * - HTML 생성(buildHtml)은 UI 렌더링과 무관한 순수 함수라 kakaoMapHtml.ts로 분리했다.
 */
export function KakaoMap({ center, markers, onMarkerPress }: KakaoMapProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!KAKAO_JS_KEY) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          카카오맵 키(EXPO_PUBLIC_KAKAO_JS_KEY)가 설정되지 않았습니다.
        </Text>
      </View>
    );
  }

  return (
    <WebView
      style={styles.web}
      originWhitelist={["*"]}
      source={{ html: buildHtml(center, markers, colors), baseUrl: "https://localhost" }}
      onMessage={(event) => onMarkerPress?.(event.nativeEvent.data)}
    />
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    web: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    fallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      padding: fontSize.md,
    },
    fallbackText: {
      fontSize: fontSize.md,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });
}
