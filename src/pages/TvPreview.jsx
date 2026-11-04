import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import SubscribeGate from "../components/layout/SubscribeGate";
import { TvTerms, TvKeyboard } from "../components/tv/TvScreens";
import TvSportHome from "../components/tv/TvSportHome";
import TvHome from "../components/tv/TvHome";
import "../TV.scss";

// TV 디자인 미리보기 (/tv) — 하단 TV 버튼(FloatingActions)으로 들어옴
// - 왼쪽 메뉴: 이용 안내 · 홈 · 스포츠 · 웹 화면으로 · 로그인은 위쪽 프로필 아이콘 (기본 열림 · 화살표로 닫고 열기 · 영상 재생 중에는 숨김)
// - 화면 버튼도 순서대로 연결: 동의 → 로그인 / 로그인 성공 → 홈 (연결 오류일 때만 네트워크 오류 화면 → 계속 → 로그인)
//   취소: 이용 안내 → 웹 화면으로 돌아가기 · 로그인 → 이용 안내
// - TV 화면이 창 전체를 꽉 채움 (테두리 · 바깥 여백 없음)
//   · 가로 1920 기준으로 비율을 맞추고, 세로는 창 높이만큼 늘이거나 줄임
//   · 화면 탭은 아래쪽에 작게 띄워 둠
// - 리모컨처럼 방향키(← ↑ → ↓)로 버튼 사이를 이동 · Enter 로 누르기 (왼쪽 메뉴 ↔ TV 화면도 이동)
// - 헤더 · 푸터 · 하단 배너 · 떠 있는 버튼은 App.jsx 에서 /tv 일 때 숨김

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TV_W = 1920;
const TV_H = 1080;

// [수정] 왼쪽 메뉴 아이콘 (public/icons/tv/)
const TABS = [
  { id: "terms", label: "이용 안내", icon: "tv-apple-tv-icon.svg" },
  { id: "home", label: "홈", icon: "tv-home-icon.svg" },
  { id: "sport", label: "스포츠", icon: "tv-movies-icon.svg" },
];

const SideIcon = ({ name }) => (
  <span className="tv-side-icon" aria-hidden="true">
    <img src={`/icons/tv/${name}`} alt="" />
  </span>
);

// 방향키로 가장 가까운 버튼 찾기 (화면 위치 기준)
const findNext = (root, current, key) => {
  const buttons = [...root.querySelectorAll("button:not([disabled])")];
  if (!current || !buttons.includes(current)) return buttons[0];

  const from = current.getBoundingClientRect();
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;

  let best = null;
  let bestScore = Infinity;

  buttons.forEach((btn) => {
    if (btn === current) return;
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const dx = x - fx;
    const dy = y - fy;

    const ok =
      (key === "ArrowRight" && dx > 1) ||
      (key === "ArrowLeft" && dx < -1) ||
      (key === "ArrowDown" && dy > 1) ||
      (key === "ArrowUp" && dy < -1);
    if (!ok) return;

    // 가는 방향 거리 + 옆으로 벗어난 거리(가중치)
    const main = key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dx) : Math.abs(dy);
    const side = key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dy) : Math.abs(dx);
    const score = main + side * 3;

    if (score < bestScore) {
      bestScore = score;
      best = btn;
    }
  });

  return best;
};

const TvPreview = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("terms");
  const onEmailAuth = useAuthStore((s) => s.onEmailAuth);
  const user = useAuthStore((s) => s.user);
  const [query, setQuery] = useState(""); // [추가] 왼쪽 메뉴 검색창
  const [scale, setScale] = useState(1);
  const [stageW, setStageW] = useState(TV_W);
  const [stageH, setStageH] = useState(TV_H);
  const [sideOpen, setSideOpen] = useState(true); // [추가] 왼쪽 메뉴 (기본 열림 · 화살표로 닫고 열기)
  const [playing, setPlaying] = useState(false); // [추가] 영상 재생 중에는 왼쪽 메뉴 숨김
  const previewRef = useRef(null);
  const areaRef = useRef(null);
  const stageRef = useRef(null);

  // 창 크기에 맞게 TV 화면 비율 계산
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return undefined;

    const update = () => {
      const { width, height } = area.getBoundingClientRect();
      // [수정] 1920 × 1080 이 창 안에 다 들어가는 비율로 맞추고, 남는 쪽(가로 또는 세로)은 화면을 늘려서 채움
      // → 창 전체를 빈틈없이 채우면서도 TV 화면이 1920 × 1080 보다 작아지지 않아 글자 · 버튼이 겹치지 않음
      const s = Math.min(width / TV_W, height / TV_H);
      setScale(s);
      setStageW(width / s);
      setStageH(height / s);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(area);
    return () => ro.disconnect();
  }, []);

  // 화면이 바뀌면 시안에서 선택된 버튼에 포커스
  useEffect(() => {
    const stage = stageRef.current;
    const first = stage?.querySelector("[data-tv-autofocus]") || stage?.querySelector("button");
    first?.focus({ preventScroll: true });
  }, [tab]);

  // [수정] 리모컨 방향키 — 화면 어디에 포커스가 있어도 동작 (왼쪽 메뉴 ↔ TV 화면 사이도 이동)
  // - 아무 것도 선택되지 않은 상태면 TV 화면의 첫 버튼부터
  useEffect(() => {
    const onKey = (e) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const root = previewRef.current;
      const stage = stageRef.current;
      if (!root || !stage) return;
      if (document.querySelector(".subscribe-gate")) return; // 안내 팝업이 열려 있으면 팝업 안에서만
      // 검색창에 글자를 쓰는 중: ← → 는 글자 사이 이동으로 둠
      if (document.activeElement?.tagName === "INPUT" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
      e.preventDefault();
      const current = root.contains(document.activeElement) ? document.activeElement : null;
      const next = current
        ? findNext(root, current, e.key)
        : stage.querySelector("[data-tv-autofocus]") || stage.querySelector("button");
      next?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // [추가] 영상 재생 중(전체 화면) 에는 왼쪽 메뉴를 숨김
  useEffect(() => {
    const onFull = () => setPlaying(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  const showSide = !playing;

  // [수정] TV 로그인: PC 와 같은 계정으로 실제 로그인
  // - 성공 → 바로 홈 / 아이디 · 비밀번호 오류 → 로그인 화면에 안내 문구 (돌려준 글자)
  // - 연결이 안 됨 → 네트워크 연결 오류 화면 (탭에는 없음 · 이때만 보임)
  const handleLogin = async ({ id, pw }) => {
    if (!navigator.onLine) {
      setTab("network");
      return "";
    }
    if (!EMAIL_RE.test(id)) return "아이디(이메일) 형식을 확인해 주세요.";
    if (!pw) return "비밀번호를 입력해 주세요.";

    const res = await onEmailAuth("signin", id, pw);
    if (res?.status === "ok" || res?.status === "needCode") {
      setTab("home");
      return "";
    }
    const err = useAuthStore.getState().loginError || "";
    if (err.includes("네트워크")) {
      setTab("network");
      return "";
    }
    return err || "이메일 또는 비밀번호가 올바르지 않습니다.";
  };

  // [추가] 검색: Enter → 웹 검색 결과 (헤더 검색창과 같은 동작)
  const handleSearch = (e) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return; // 한글 조합 중 Enter 무시
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const exit = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className={`tv-preview${showSide && sideOpen ? " is-side-open" : ""}`} ref={previewRef}>
      {/* [수정] 화면 메뉴: 아래 바 → 왼쪽 사이드 메뉴 (기본 열림 · 화살표로 닫고 열기 · 영상 재생 중에는 숨김) */}
      {showSide && sideOpen && (
        <aside className="tv-side" aria-label="TV 화면 메뉴">
          <div className="tv-side-head">
            <img className="tv-side-logo" src="/icons/shorts/logo_w.svg" alt="Apple TV" />

            {/* [수정] 로그인은 메뉴 대신 프로필 아이콘으로 — 로그인 전: 누르면 TV 로그인 화면 / 로그인 후: 고른 프로필 아이콘 */}
            {user ? (
              <span className="tv-side-profile" aria-label="로그인됨">
                <ProfileAvatar avatar={user.avatar} size="sm" />
              </span>
            ) : (
              <button type="button" className="tv-side-profile" aria-label="로그인" onClick={() => setTab("login")}>
                <ProfileAvatar size="sm" />
              </button>
            )}

            <button type="button" className="tv-side-toggle" aria-label="메뉴 닫기" onClick={() => setSideOpen(false)}>
              <img src="/icons/nav/left-nav.svg" alt="" aria-hidden="true" />
            </button>
          </div>

          {/* [추가] 검색창 (시안: 회색 둥근 칸 + 검색 아이콘 + Search) */}
          <label className="tv-side-search">
            <span className="tv-side-search-icon" aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder="Search"
              aria-label="작품 · 인물 · 장르 검색"
              enterKeyHint="search"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </label>

          <nav className="tv-side-menu" role="tablist" aria-label="TV 화면">
            {TABS.map((t) => (
              <button
                type="button"
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`tv-side-item${tab === t.id ? " is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <SideIcon name={t.icon} />
                {t.label}
              </button>
            ))}
          </nav>

          <button type="button" className="tv-side-item tv-side-exit" onClick={exit}>
            <SideIcon name="tv-show-icon.svg" />
            웹 화면으로
          </button>

          {/* 리모컨 안내 — 방향키로 이동 · Enter 로 선택 */}
          <p className="tv-side-guide">
            리모컨으로 이용해 주세요
            <span>키보드 방향키(← ↑ → ↓)로 이동하고 Enter 로 선택</span>
          </p>
        </aside>
      )}

      {showSide && !sideOpen && (
        <button type="button" className="tv-side-toggle tv-side-open" aria-label="메뉴 열기" onClick={() => setSideOpen(true)}>
          <img src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
        </button>
      )}

      <div className="tv-preview-area" ref={areaRef}>
        <div
          className="tv-preview-stage"
          ref={stageRef}
          role="tabpanel"
          style={{ width: stageW, height: stageH, transform: `scale(${scale})` }}
        >
            {tab === "terms" && <TvTerms onAgree={() => setTab("login")} onCancel={exit} />}
            {tab === "login" && (
              <TvKeyboard
                key="login"
                variant="login"
                onCancel={() => setTab("terms")}
                onSubmit={handleLogin}
              />
            )}
            {tab === "network" && <TvKeyboard key="network" variant="account" networkError onSubmit={() => setTab("login")} />}
            {tab === "home" && <TvHome onMenu={setTab} />}
            {tab === "sport" && <TvSportHome onMenu={setTab} />}
        </div>
      </div>

      {/* [추가] 로그인 전: 콘텐츠를 누르면 웹과 같은 안내 팝업 · 로그인 버튼은 TV 로그인 화면으로 */}
      <SubscribeGate onLogin={() => setTab("login")} />
    </div>
  );
};

export default TvPreview;
