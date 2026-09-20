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

/** 현재 지도 화면에 보이는 영역(뷰포트)의 좌상/우하 경계 */
export interface MapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

/** WebView → RN으로 보내는 메시지 (마커 클릭 / 지도 이동·확대축소로 보이는 영역 변경) */
export type MapMessage = { type: "marker"; id: string } | ({ type: "bounds" } & MapBounds);

/**
 * WebView가 postMessage로 보낸 원본 문자열을 안전하게 해석한다.
 * - 형식이 다르거나 깨진 메시지는 null을 반환한다(무시하도록).
 * - 순수 함수라 KakaoMap 컴포넌트 없이 바로 테스트할 수 있다.
 */
export function parseMapMessage(raw: string): MapMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;

    if (obj.type === "marker" && typeof obj.id === "string") {
      return { type: "marker", id: obj.id };
    }
    if (
      obj.type === "bounds" &&
      typeof obj.swLat === "number" &&
      typeof obj.swLng === "number" &&
      typeof obj.neLat === "number" &&
      typeof obj.neLng === "number"
    ) {
      return {
        type: "bounds",
        swLat: obj.swLat,
        swLng: obj.swLng,
        neLat: obj.neLat,
        neLng: obj.neLng,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 카카오맵 SDK를 로드하고 가격 말풍선(CustomOverlay)을 렌더링하는 HTML 생성
 * - KakaoMap 컴포넌트에서 분리된 순수 함수(UI 렌더링과 무관) — 테스트(스크립트 태그
 *   이스케이프 검증)에서 바로 import해 검증한다. colors 생략 시 라이트 테마로 렌더링.
 * - 마커 클릭, 지도 이동/확대축소(보이는 영역 변경)를 각각 다른 type의 JSON
 *   메시지로 RN에 전달한다(parseMapMessage로 해석).
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
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=clusterer"></script>
  <script>
    kakao.maps.load(function () {
      var map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(${center.lat}, ${center.lng}),
        level: 4
      });
      // RN에서 injectJavaScript로 지도를 다시 움직일 수 있도록(예: "내 위치로" 버튼)
      // map 인스턴스를 전역에 노출한다.
      window.__map = map;

      // 헬스장이 많아질 때를 대비한 마커 클러스터링. 이 레벨(축소 정도) 이상에서는
      // 가까운 헬스장들을 카카오맵이 자동으로 숫자 배지 하나로 묶어 보여준다.
      // (레벨 숫자가 클수록 더 축소된 상태 — 예: 도시 전체 vs 동네 단위)
      var CLUSTER_MIN_LEVEL = 6;

      // 클러스터러가 관리할 마커의 아이콘은 작은 점 하나로만 표시한다. 실제
      // 이름/가격을 보여주는 말풍선(CustomOverlay, 아래)은 확대(레벨 <
      // CLUSTER_MIN_LEVEL)했을 때만 별도로 그린다 — 마커가 수백 개로 늘어도
      // 축소 상태에서는 말풍선 DOM 없이 배지만 그려지므로 드래그 중 버벅임이
      // 크게 줄어든다. 점 마커는 배지로 묶이지 않은(외딴 지역) 헬스장이 축소
      // 상태에서도 아예 안 보이는 일이 없도록 항상 유지한다.
      var dotImage = new kakao.maps.MarkerImage(
        'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">' +
          '<circle cx="8" cy="8" r="6" fill="${colors.primary}" stroke="#fff" stroke-width="2"/></svg>'
        ),
        new kakao.maps.Size(16, 16)
      );

      var gyms = ${data};
      var markers = [];
      var overlays = [];

      gyms.forEach(function (g) {
        var position = new kakao.maps.LatLng(g.lat, g.lng);

        function notifyPress() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: g.id }));
          }
        }

        var marker = new kakao.maps.Marker({ position: position, image: dotImage });
        kakao.maps.event.addListener(marker, 'click', notifyPress);
        markers.push(marker);

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
        wrap.onclick = notifyPress;
        var overlay = new kakao.maps.CustomOverlay({
          position: position,
          content: wrap,
          yAnchor: 1
        });
        overlays.push(overlay);
      });

      var clusterer = new kakao.maps.MarkerClusterer({
        map: map,
        markers: markers,
        averageCenter: true,
        minLevel: CLUSTER_MIN_LEVEL,
        styles: [{
          width: '36px', height: '36px', lineHeight: '36px',
          borderRadius: '18px', textAlign: 'center', fontWeight: 'bold',
          fontSize: '13px', color: '#fff', background: '${colors.primary}'
        }]
      });

      // 확대(레벨 < CLUSTER_MIN_LEVEL) 상태에서만 말풍선을 그린다. 배지로 묶여
      // 보이는 축소 상태에서는 말풍선을 전부 숨긴다.
      function updatePillVisibility() {
        var showPills = map.getLevel() < CLUSTER_MIN_LEVEL;
        overlays.forEach(function (overlay) {
          overlay.setMap(showPills ? map : null);
        });
      }
      updatePillVisibility();
      kakao.maps.event.addListener(map, 'zoom_changed', updatePillVisibility);

      // 지도가 움직이거나(드래그) 확대/축소가 끝나 "가만히 있는" 상태가 될 때마다
      // 지금 화면에 보이는 영역(경계)을 RN으로 보낸다 — 목록을 그 영역 안의
      // 헬스장만 보이도록 필터링하는 데 쓴다. idle은 최초 로드 시에도 한 번 발생한다.
      function reportBounds() {
        if (!window.ReactNativeWebView) return;
        var bounds = map.getBounds();
        var sw = bounds.getSouthWest();
        var ne = bounds.getNorthEast();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'bounds',
          swLat: sw.getLat(), swLng: sw.getLng(),
          neLat: ne.getLat(), neLng: ne.getLng()
        }));
      }
      kakao.maps.event.addListener(map, 'idle', reportBounds);
    });
  </script>
</body>
</html>`;
}
