/**
 * GymPrice 관리자 페이지 공용 로직
 * - Supabase 연결 설정 저장/복원, 로그인, 관리자(is_admin) 확인을 담당한다.
 * - index.html(심사)과 dashboard.html(퍼널 대시보드)이 공유해서 쓴다.
 */
window.GymPriceAdmin = (function () {
  var STORE_KEY = "gymprice_admin_config";

  // .env의 EXPO_PUBLIC_SUPABASE_URL/ANON_KEY와 동일한 값. anon key는 공개돼도 되는
  // 값이라(실제 보안은 RLS가 담당) 여기 하드코딩해도 안전하다. 다른 프로젝트로
  // 바꾸고 싶으면 로그인 화면의 "연결 정보 다시 입력하기"로 덮어쓸 수 있다.
  var DEFAULT_CONFIG = {
    url: "https://qupiubrowwkyoqzallyn.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cGl1YnJvd3dreW9xemFsbHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MjIzNTMsImV4cCI6MjEwNDk5ODM1M30.rtsDr4kXCrGvycdjetIIvcYgpXuAD7UyaQnssuGdDuw"
  };

  function loadConfig() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function saveConfig(cfg) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
    } catch (e) {}
  }
  function clearConfig() {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch (e) {}
  }

  /** 신뢰할 수 없는 문자열(닉네임/메모/헬스장명 등)을 안전하게 HTML에 넣기 위한 이스케이프 */
  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }
  function fmtPrice(v) {
    if (v === null || v === undefined) return "-";
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    return (
      d.getFullYear() +
      "." +
      String(d.getMonth() + 1).padStart(2, "0") +
      "." +
      String(d.getDate()).padStart(2, "0")
    );
  }
  /** YYYY-MM-DD (일별 집계 시 그룹 키로 사용) */
  function toDayKey(iso) {
    return new Date(iso).toISOString().slice(0, 10);
  }

  /** 페이지 간 이동 내비게이션 (넓은 화면: 우측 고정 사이드바 / 좁은 화면: 상단 가로 탭) */
  var NAV_ITEMS = [
    { key: "index", href: "index.html", label: "가격 심사" },
    { key: "dashboard", href: "dashboard.html", label: "퍼널 대시보드" },
    { key: "manage", href: "manage.html", label: "유저/헬스장 관리" }
  ];
  function renderNav(activeKey) {
    return (
      '<nav class="side-nav">' +
      NAV_ITEMS.map(function (item) {
        return (
          '<a href="' + item.href + '" data-nav-key="' + item.key + '"' +
          (item.key === activeKey ? ' class="active"' : "") + ">" +
          '<span class="nav-label">' + item.label + "</span>" +
          '<span class="nav-badge" style="display:none"></span>' +
          "</a>"
        );
      }).join("") +
      "</nav>"
    );
  }

  /** 내비게이션 항목에 숫자 배지를 표시/숨김 (0이면 숨김) */
  function setNavBadge(key, count) {
    var el = document.querySelector('[data-nav-key="' + key + '"] .nav-badge');
    if (!el) return;
    if (count > 0) {
      el.textContent = count > 99 ? "99+" : String(count);
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  }

  /** "가격 심사" 탭에 심사 대기 중인 제보 수를 배지로 표시한다 */
  function loadPendingBadge(sb) {
    sb.from("gym_prices")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(function (res) {
        if (!res.error) setNavBadge("index", res.count || 0);
      });
  }

  /**
   * 설정(Supabase URL/key) → 로그인 → 관리자(is_admin) 확인까지 처리하고,
   * 통과하면 onReady(sb, currentUser, renderLogin)를 호출한다.
   * - appEl: 렌더링할 컨테이너
   * - subtitle: 로그인 화면에 보여줄 한 줄 설명(페이지별로 다르게 줄 수 있음)
   */
  function boot(appEl, onReady, subtitle) {
    var sb = null;

    function renderSetup(prefill) {
      appEl.innerHTML =
        '<h1>GymPrice Admin</h1>' +
        '<p class="sub">' +
        escapeHtml(subtitle || "") +
        ' — 처음 한 번만 Supabase 프로젝트 정보를 입력하세요.</p>' +
        '<div class="card">' +
        '  <label for="url">Supabase URL</label>' +
        '  <input id="url" placeholder="https://xxxx.supabase.co" value="' +
        escapeHtml((prefill && prefill.url) || "") +
        '" />' +
        '  <label for="key">Supabase anon key</label>' +
        '  <input id="key" placeholder="eyJhbGciOi..." value="' +
        escapeHtml((prefill && prefill.key) || "") +
        '" />' +
        '  <div id="setup-error" class="error-text"></div>' +
        '  <button class="btn-primary" id="setup-submit">연결하기</button>' +
        "</div>";

      document.getElementById("setup-submit").onclick = function () {
        var url = document.getElementById("url").value.trim();
        var key = document.getElementById("key").value.trim();
        var errEl = document.getElementById("setup-error");
        if (!url || !key) {
          errEl.textContent = "URL과 anon key를 모두 입력해주세요.";
          return;
        }
        try {
          sb = supabase.createClient(url, key);
        } catch (e) {
          errEl.textContent = "연결에 실패했습니다: " + e.message;
          return;
        }
        saveConfig({ url: url, key: key });
        renderLogin();
      };
    }

    function renderLogin(message) {
      appEl.innerHTML =
        '<h1>GymPrice Admin</h1>' +
        '<p class="sub">' +
        escapeHtml(subtitle || "관리자 계정으로 로그인하세요.") +
        '</p>' +
        '<div class="card">' +
        '  <label for="email">이메일</label>' +
        '  <input id="email" type="email" placeholder="admin@example.com" />' +
        '  <label for="password">비밀번호</label>' +
        '  <input id="password" type="password" placeholder="비밀번호" />' +
        '  <div id="login-error" class="error-text">' +
        escapeHtml(message || "") +
        "</div>" +
        '  <button class="btn-primary" id="login-submit">로그인</button>' +
        "</div>" +
        '<a class="reset-link" id="reset-config">Supabase 연결 정보 다시 입력하기</a>';

      document.getElementById("login-submit").onclick = doLogin;
      document.getElementById("password").addEventListener("keydown", function (e) {
        if (e.key === "Enter") doLogin();
      });
      document.getElementById("reset-config").onclick = function () {
        clearConfig();
        renderSetup();
      };
    }

    function doLogin() {
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      var errEl = document.getElementById("login-error");
      var btn = document.getElementById("login-submit");
      if (!email || !password) {
        errEl.textContent = "이메일과 비밀번호를 입력해주세요.";
        return;
      }
      btn.disabled = true;
      btn.textContent = "로그인 중...";
      sb.auth
        .signInWithPassword({ email: email, password: password })
        .then(function (res) {
          if (res.error) {
            renderLogin(res.error.message);
            return;
          }
          checkAdminAndEnter(res.data.user);
        })
        .catch(function (e) {
          renderLogin(e.message || "로그인에 실패했습니다.");
        });
    }

    function checkAdminAndEnter(user) {
      sb
        .from("users")
        .select("is_admin, nickname")
        .eq("uid", user.id)
        .maybeSingle()
        .then(function (res) {
          if (res.error) {
            renderLogin("프로필 조회 실패: " + res.error.message);
            return;
          }
          if (!res.data || !res.data.is_admin) {
            sb.auth.signOut();
            renderLogin(
              "관리자 권한이 없는 계정입니다. (Supabase에서 이 계정의 is_admin을 true로 설정해야 합니다)"
            );
            return;
          }
          onReady(
            sb,
            { id: user.id, email: user.email, nickname: res.data.nickname },
            renderLogin
          );
        });
    }

    var cfg = loadConfig() || DEFAULT_CONFIG;
    if (cfg && cfg.url && cfg.key) {
      sb = supabase.createClient(cfg.url, cfg.key);
      sb.auth.getSession().then(function (res) {
        var session = res.data && res.data.session;
        if (session) {
          checkAdminAndEnter(session.user);
        } else {
          renderLogin();
        }
      });
    } else {
      renderSetup();
    }
  }

  return {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    clearConfig: clearConfig,
    escapeHtml: escapeHtml,
    fmtPrice: fmtPrice,
    fmtDate: fmtDate,
    toDayKey: toDayKey,
    renderNav: renderNav,
    setNavBadge: setNavBadge,
    loadPendingBadge: loadPendingBadge,
    boot: boot
  };
})();
