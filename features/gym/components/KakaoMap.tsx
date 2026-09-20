import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { ColorTheme } from "../../../constants/colors";
import { KAKAO_JS_KEY } from "../../../constants/config";
import { fontSize } from "../../../constants/layout";
import { useThemeColors } from "../../../hooks/useThemeColors";
import { buildHtml, parseMapMessage, type MapBounds, type MapMarker } from "./kakaoMapHtml";

interface KakaoMapProps {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  /** 마커를 누르면 해당 헬스장 id 전달 */
  onMarkerPress?: (id: string) => void;
  /** 지도를 움직이거나 확대/축소해서 보이는 영역이 바뀔 때(최초 로드 포함) 전달 */
  onBoundsChange?: (bounds: MapBounds) => void;
}

/** ref로 지도를 명령형으로 제어하기 위한 핸들 (예: "내 위치로" 버튼) */
export interface KakaoMapHandle {
  /** 지도를 다시 로드하지 않고(패닝만) 주어진 좌표로 이동한다 */
  recenter: (lat: number, lng: number) => void;
}

/**
 * 카카오맵 (WebView + Kakao Maps JS SDK)
 * - KAKAO_JS_KEY가 없으면 안내 문구를 보여준다.
 * - 마커 클릭/지도 영역 변경을 WebView → RN으로 postMessage 한다(parseMapMessage로 해석).
 * - HTML 생성(buildHtml)은 UI 렌더링과 무관한 순수 함수라 kakaoMapHtml.ts로 분리했다.
 * - ⚠️ WebView의 source는 center/markers/theme이 실제로 바뀔 때만 새로 계산해야
 *   한다(useMemo) — 그렇지 않으면 onBoundsChange로 부모가 다시 렌더링될 때마다
 *   매번 새 html 문자열이 만들어져 지도가 계속 리로드되며 사용자가 움직인 위치가
 *   초기 위치로 되돌아가버린다.
 * - ref.recenter()는 WebView를 리로드하지 않고 injectJavaScript로 지도만 이동시킨다
 *   (리로드하면 마커가 다시 그려지며 깜빡이고, 사용자가 조정한 확대/축소 값도 날아간다).
 */
export const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap(
  { center, markers, onMarkerPress, onBoundsChange },
  ref
) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const webviewRef = useRef<WebView>(null);
  const source = useMemo(
    () => ({ html: buildHtml(center, markers, colors), baseUrl: "https://localhost" }),
    [center.lat, center.lng, markers, colors]
  );

  useImperativeHandle(ref, () => ({
    recenter(lat, lng) {
      webviewRef.current?.injectJavaScript(
        `if (window.__map) { window.__map.panTo(new kakao.maps.LatLng(${lat}, ${lng})); } true;`
      );
    },
  }));

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
      ref={webviewRef}
      style={styles.web}
      originWhitelist={["*"]}
      source={source}
      onMessage={(event) => {
        const message = parseMapMessage(event.nativeEvent.data);
        if (!message) return;
        if (message.type === "marker") onMarkerPress?.(message.id);
        else onBoundsChange?.(message);
      }}
    />
  );
});

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
