import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../../../constants/colors";
import { KAKAO_JS_KEY } from "../../../constants/config";
import { fontSize } from "../../../constants/layout";

/** 지도에 찍을 마커 (헬스장 최소 정보) */
interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

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
 */
export function KakaoMap({ center, markers, onMarkerPress }: KakaoMapProps) {
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
      source={{ html: buildHtml(center, markers), baseUrl: "https://localhost" }}
      onMessage={(event) => onMarkerPress?.(event.nativeEvent.data)}
    />
  );
}

/** 카카오맵 SDK를 로드하고 마커를 렌더링하는 HTML 생성 */
function buildHtml(
  center: { lat: number; lng: number },
  markers: MapMarker[]
): string {
  const data = JSON.stringify(
    markers.map((m) => ({ id: m.id, name: m.name, lat: m.lat, lng: m.lng }))
  );
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"></script>
  <script>
    kakao.maps.load(function () {
      var map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(${center.lat}, ${center.lng}),
        level: 4
      });
      var gyms = ${data};
      gyms.forEach(function (g) {
        var marker = new kakao.maps.Marker({
          map: map,
          position: new kakao.maps.LatLng(g.lat, g.lng),
          title: g.name
        });
        kakao.maps.event.addListener(marker, 'click', function () {
          window.ReactNativeWebView.postMessage(g.id);
        });
      });
    });
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
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
