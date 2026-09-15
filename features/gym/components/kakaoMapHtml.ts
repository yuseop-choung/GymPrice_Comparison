import { type ColorTheme, lightColors } from "../../../constants/colors";
import { KAKAO_JS_KEY } from "../../../constants/config";

/** 지도에 찍을 마커 (헬스장 최소 정보 + 표시 라벨) */
export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  label: string; // 말풍선에 표시할 텍스트 (예: 최저가)
}

/**
 * 카카오맵 SDK를 로드하고 가격 말풍선(CustomOverlay)을 렌더링하는 HTML 생성
 * - KakaoMap 컴포넌트에서 분리된 순수 함수(UI 렌더링과 무관) — 테스트(스크립트 태그
 *   이스케이프 검증)에서 바로 import해 검증한다. colors 생략 시 라이트 테마로 렌더링.
 */
export function buildHtml(
  center: { lat: number; lng: number },
  markers: MapMarker[],
  colors: ColorTheme = lightColors
): string {
  // ⚠️ 헬스장 이름(name)은 사용자가 자유롭게 입력한 값이라, JSON을 <script> 태그에
  // 그대로 넣으면 "</script" 시퀀스가 HTML 파서 단계에서 스크립트를 조기 종료시켜
  // 임의 마크업/스크립트가 주입될 수 있다(JSON.stringify는 이 시퀀스를 이스케이프하지
  // 않음). </script>, <!--, <script를 이스케이프해 스크립트 태그를 절대 조기 종료시키지
  // 않도록 한다.
  const data = JSON.stringify(
    markers.map((m) => ({
      id: m.id,
      name: m.name,
      lat: m.lat,
      lng: m.lng,
      label: m.label,
    }))
  ).replace(/<(\/?script|!--)/gi, "\\u003c$1");
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%}
    .pill{
      background:${colors.surfaceElevated}; border:1px solid ${colors.primary}; border-radius:12px;
      padding:4px 8px; text-align:center; transform:translateY(-6px);
      box-shadow:0 1px 3px rgba(0,0,0,0.3);
    }
    .pill .name{
      font-size:11px; font-weight:600; color:${colors.text};
      max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .pill .price{ font-size:12px; font-weight:700; color:${colors.primary}; }
  </style>
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
        var wrap = document.createElement('div');
        wrap.className = 'pill';
        var nameEl = document.createElement('div');
        nameEl.className = 'name';
        nameEl.innerText = g.name;
        var priceEl = document.createElement('div');
        priceEl.className = 'price';
        priceEl.innerText = g.label;
        wrap.appendChild(nameEl);
        wrap.appendChild(priceEl);
        wrap.onclick = function () {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(g.id);
        };
        var overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(g.lat, g.lng),
          content: wrap,
          yAnchor: 1
        });
        overlay.setMap(map);
      });
    });
  </script>
</body>
</html>`;
}
