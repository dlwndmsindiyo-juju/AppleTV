import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import SubscribeGate from "../components/layout/SubscribeGate";
import AiAssistantPopup from "../components/ai/AiAssistantPopup";
import { TvTerms, TvKeyboard, TvProfiles, TvProfileAdd } from "../components/tv/TvScreens";
import { getProfiles, PROFILE_MAX, PROFILE_NAME_MAX, MAIN_PROFILE_ID, useSettings } from "../store/useAuthStore";
import { profileLook } from "../components/profile/ProfileAvatar";
import { findNext } from "../components/tv/tvFocus";
import TvSportHome from "../components/tv/TvSportHome";
import TvTeam from "../components/tv/TvTeam";
import TvSearch from "../components/tv/TvSearch";
import TvDetail from "../components/tv/TvDetail";
import TvLibrary from "../components/tv/TvLibrary";
import { useTeamStore } from "../store/useTeamStore";
import { getTeamById } from "../data/sportTeams";
import TvHome, { TvGenre } from "../components/tv/TvHome"; // [추가] TvGenre: 장르별 모음 → 장르 화면
import { ottItem } from "../components/tv/tvDetailItems"; // [추가] AI 추천 → TV 상세 항목
import "../TV.scss";
import AiLogo from "../components/ai/AiLogo"; // [수정] AI 아이콘 공용 (빛나며 움직임 · 원본 components/ai/assets/ai-logo.svg)

// TV 디자인 미리보기 (/tv) — 하단 TV 버튼(FloatingActions)으로 들어옴
// - 왼쪽 메뉴: 홈 · 스포츠 · AI / 관심구단 묶음(팀 이름) / 설정 묶음(프로필 변경 · 이용 안내 · 웹 화면으로 · 로그아웃)
//   · 로그인 전: 위쪽 "로그인" 버튼 / 로그인 후: 프로필 아이콘 · 이 기기에서는 다시 로그인하지 않음 (기본 열림 · 화살표로 닫고 열기 · 영상 재생 중에는 숨김)
// - 화면 버튼도 순서대로 연결: 동의 → 로그인 / 로그인 성공 → 홈 (연결 오류일 때만 네트워크 오류 화면 → 계속 → 로그인)
//   취소: 이용 안내 → 웹 화면으로 돌아가기 · 로그인 → 이용 안내
// - TV 화면이 창 전체를 꽉 채움 (테두리 · 바깥 여백 없음)
//   · 가로 1920 기준으로 비율을 맞추고, 세로는 창 높이만큼 늘이거나 줄임
//   · 화면 탭은 아래쪽에 작게 띄워 둠
// - 리모컨처럼 방향키(← ↑ → ↓)로 버튼 사이를 이동 · Enter 로 누르기 (왼쪽 메뉴 ↔ TV 화면도 이동)
// - [추가] 입력 방식: PC(마우스) = 리모컨(방향키) / 태블릿 · 휴대폰(터치) = 손가락으로 누르고 밀어서 이동
//   · 터치 기기면 .is-touch → TV.scss 에서 카드 줄은 옆으로, 화면은 위아래로 손가락 스크롤
//   · PC 는 예전처럼 방향키로 포커스가 옮겨 갈 때만 줄이 밀림
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

// name: public/icons/tv/ 파일 이름 · src: 직접 경로
const SideIcon = ({ name, src }) => (
  <span className="tv-side-icon" aria-hidden="true">
    <img src={src || `/icons/tv/${name}`} alt="" />
  </span>
);

// [추가] 메뉴 묶음 — 제목(Heading/h2-B) + 오른쪽 접기 화살표 (시안: Library · Apps)
// - 제목을 누르면 접기 / 펼치기 · empty 이면 화살표 없이 제목만
const SideGroup = ({ title, open, empty = false, onToggle, children }) => (
  <div className={`tv-side-group${open && !empty ? " is-open" : ""}`}>
    <button type="button" className="tv-side-group-head" aria-expanded={empty ? undefined : open} onClick={onToggle}>
      {title}
      {!empty && <span className="tv-side-group-arrow" aria-hidden="true" />}
    </button>
    {open && !empty && <div className="tv-side-group-body">{children}</div>}
  </div>
);

// [정리] 방향키로 가장 가까운 버튼 찾기 → components/tv/tvFocus.js (영상 끝 화면과 같이 사용)

// [추가] 터치 기기 구분 (창 크기 · 방향이 바뀌면 다시 계산)
// - [수정] 터치 기기는 is-touch 도 붙임 (손가락 스크롤 · 터치 안내 문구)
const touchDeviceClass = () => {
  if (typeof window === "undefined") return "";
  const touch = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
  if (!touch) return "";
  return Math.min(window.innerWidth, window.innerHeight) < 600 ? " is-touch is-phone" : " is-touch is-tablet";
};

const useTouchDeviceClass = () => {
  const [value, setValue] = useState(touchDeviceClass);
  useEffect(() => {
    const update = () => setValue(touchDeviceClass());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return value;
};

const TvPreview = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("terms");
  const onEmailAuth = useAuthStore((s) => s.onEmailAuth);
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const currentProfileId = useAuthStore((s) => s.currentProfileId); // [수정] 지금 보고 있는 프로필
  const onSelectProfile = useAuthStore((s) => s.onSelectProfile);
  const onAddProfile = useAuthStore((s) => s.onAddProfile);
  const profiles = getProfiles(user);
  const currentProfile = profiles.find((p) => p.id === currentProfileId);
  const onLogout = useAuthStore((s) => s.onLogout);
  const [aiOpen, setAiOpen] = useState(false); // [추가] 메뉴의 AI → AI 어시스트 팝업
  const [aiRestore, setAiRestore] = useState(null); // [추가] AI 추천에서 상세로 갔다가 뒤로 → 보던 추천 결과 그대로 (팝업 상태 기록)
  const assistantOn = useSettings().assistant; // [추가] 계정 설정 "Apple Assistant 사용"
  // [추가] 영상 상세 페이지 (TvDetail) — 카드를 누르면 열림 · Esc 로 보던 화면으로
  const [detailItem, setDetailItem] = useState(null);
  const [detailBack, setDetailBack] = useState("home");
  // [추가] 상세에서 다른 상세(추천 · 하이라이트 등)로 넘어간 기록 — 뒤로 가면 하나씩 이전 상세로
  const [detailStack, setDetailStack] = useState([]);
  // [추가] 상세를 열기 전 보던 화면에서 고르고 있던 버튼 순서 (뒤로 오면 그 카드에 다시 포커스 · 줄도 그 자리로)
  const returnFocusRef = useRef({}); // { 화면(tab): 버튼 순서 } — 홈 → 장르 → 상세처럼 여러 번 들어가도 화면마다 기억
  // [추가] AI 추천에서 연 상세: 뒤로 가면 AI 팝업을 보던 결과 그대로 다시 엶 (aiSnapshot · AiAssistantPopup)
  const detailFromAiRef = useRef(null);
  const openDetail = (item, aiSnapshot = null) => {
    if (!item) return;
    if (tab !== "detail") {
      setDetailBack(tab);
      setDetailStack([]);
      detailFromAiRef.current = aiSnapshot;
      const stage = stageRef.current;
      const buttons = stage ? [...stage.querySelectorAll("button:not([disabled])")] : [];
      if (!aiSnapshot) returnFocusRef.current[tab] = buttons.indexOf(document.activeElement); // 돌아갈 화면 · 버튼 순서
    } else if (detailItem) {
      setDetailStack((st) => [...st, detailItem]);
    }
    setDetailItem(item);
    setTab("detail");
  };
  // [추가] 뒤로 ("← 뒤로" 버튼 · Esc): 이전 상세가 있으면 그 상세로, 없으면 상세를 열기 전 화면으로
  const closeDetail = () => {
    if (detailStack.length) {
      setDetailItem(detailStack[detailStack.length - 1]);
      setDetailStack((st) => st.slice(0, -1));
      return;
    }
    setTab(detailBack);
    // [추가] AI 추천에서 왔으면 보던 추천 결과로 팝업 다시 열기
    if (detailFromAiRef.current) {
      setAiRestore(detailFromAiRef.current);
      setAiOpen(true);
      detailFromAiRef.current = null;
    }
  };
  const [closedGroups, setClosedGroups] = useState({}); // [추가] 접은 메뉴 묶음 { team, settings }
  const toggleGroup = (key) => setClosedGroups((g) => ({ ...g, [key]: !g[key] }));
  // [추가] 관심구단 (팔로우한 순서) — 메뉴 "관심구단" 아래 팀 이름 · 누르면 그 팀 화면 (tab: "team:{id}")
  const favorites = useTeamStore((s) => s.favorites);
  const followedTeams = favorites.map(getTeamById).filter(Boolean);
  const teamTabId = tab.startsWith("team:") ? tab.slice(5) : null;
  // [추가] 장르 화면 (tab: "genre:genre-sf") — 홈의 장르별 모음 카드 · Esc 로 홈(고르던 카드)으로
  const genreId = tab.startsWith("genre:") ? tab.slice(6) : null;
  const openGenre = (id) => {
    const stage = stageRef.current;
    const buttons = stage ? [...stage.querySelectorAll("button:not([disabled])")] : [];
    returnFocusRef.current[tab] = buttons.indexOf(document.activeElement); // 돌아갈 화면 · 버튼 순서
    setTab(`genre:${id}`);
  };
  const screenTeam = teamTabId ? getTeamById(teamTabId) : null;
  const [query, setQuery] = useState(""); // [추가] 왼쪽 메뉴 검색창
  useEffect(() => {
    if (tab !== "search") {
      setQuery("");
    }
  }, [tab]);
  const [scale, setScale] = useState(1);
  const [stageW, setStageW] = useState(TV_W);
  const [stageH, setStageH] = useState(TV_H);
  const [sideOpen, setSideOpen] = useState(true); // [추가] 왼쪽 메뉴 (기본 열림 · 화살표로 닫고 열기)
  const [playing, setPlaying] = useState(false); // [추가] 영상 재생 중에는 왼쪽 메뉴 숨김
  const previewRef = useRef(null);
  const areaRef = useRef(null);
  const stageRef = useRef(null);

  // [추가] 태블릿 · 휴대폰(터치 기기)에서는 TV 화면 글자를 한두 단계 크게 (TV.scss tv-type · PC 는 그대로)
  // - 휴대폰: 화면 짧은 쪽이 600px 미만 / 태블릿: 그 이상인 터치 기기
  const deviceClass = useTouchDeviceClass();

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

  const isTouch = deviceClass.includes("is-touch");
  // [추가] 영상 팝업(끝 화면)은 TV 화면 밖(body)에 그려져서 html 에도 표시 → TV.scss 에서 끝 화면 추천 줄도 손가락 스크롤
  useEffect(() => {
    document.documentElement.classList.toggle("is-tv-touch", isTouch);
    return () => document.documentElement.classList.remove("is-tv-touch");
  }, [isTouch]);

  // 화면이 바뀌면 시안에서 선택된 버튼에 포커스
  // - [수정] 터치 기기는 건너뜀 (누르지 않은 카드가 커져 보이거나 화면이 저절로 밀리지 않게)
  // - [추가] 상세에서 뒤로 왔으면 상세를 열 때 고르고 있던 카드에 다시 포커스 (데이터가 그려질 때까지 최대 약 2초 기다림)
  useEffect(() => {
    if (isTouch) return undefined;
    const stage = stageRef.current;
    const target = tab !== "detail" ? returnFocusRef.current[tab] : null; // 그 화면으로 돌아왔을 때만
    if (target == null || target < 0) {
      const first = stage?.querySelector("[data-tv-autofocus]") || stage?.querySelector("button");
      first?.focus({ preventScroll: true });
      return undefined;
    }
    delete returnFocusRef.current[tab];
    let tries = 0;
    let timer = null;
    const restore = () => {
      const buttons = stage ? [...stage.querySelectorAll("button:not([disabled])")] : [];
      if (buttons[target]) {
        buttons[target].focus({ preventScroll: true });
        buttons[target].scrollIntoView({ block: "nearest", inline: "nearest" }); // 카드 줄 · 화면을 그 카드 자리로
        return;
      }
      if (tries++ < 20) timer = setTimeout(restore, 100);
      else (stage?.querySelector("[data-tv-autofocus]") || buttons[0])?.focus({ preventScroll: true });
    };
    timer = setTimeout(restore, 150); // 이미 받아 둔 줄(캐시)이 다시 그려진 뒤에 찾기 (줄 순서가 밀리지 않게)
    return () => clearTimeout(timer);
  }, [tab, isTouch]);

  // [수정] 리모컨 방향키 — 화면 어디에 포커스가 있어도 동작 (왼쪽 메뉴 ↔ TV 화면 사이도 이동)
  // - 아무 것도 선택되지 않은 상태면 TV 화면의 첫 버튼부터
  useEffect(() => {
    const onKey = (e) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const root = previewRef.current;
      const stage = stageRef.current;
      if (!root || !stage) return;
      if (document.querySelector(".subscribe-gate, .ai-popup, .video-popup")) return; // 팝업 · 영상 재생 중에는 팝업 안에서만
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

  // [추가] 장르 화면에서 Esc (리모컨 뒤로) → 홈 (장르 카드에 다시 포커스)
  useEffect(() => {
    if (!tab.startsWith("genre:")) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || document.querySelector(".subscribe-gate, .ai-popup, .video-popup")) return;
      setTab("home");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  // [추가] 상세 페이지에서 Esc (리모컨 뒤로) → 보던 화면으로 (팝업 · 영상이 열려 있으면 그쪽이 먼저 닫힘)
  useEffect(() => {
    if (tab !== "detail") return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape" || document.querySelector(".subscribe-gate, .ai-popup, .video-popup")) return;
      closeDetail(); // [수정] 이전 상세 → 없으면 보던 화면
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, detailBack, detailStack]); // eslint-disable-line react-hooks/exhaustive-deps

  // [추가] 영상 재생 중(전체 화면) 에는 왼쪽 메뉴를 숨김
  useEffect(() => {
    const onFull = () => setPlaying(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  const showSide = !playing;

  // [추가] 이 기기에서 이미 로그인했으면 다시 로그인하지 않음
  // - Firebase 로그인 상태는 이 브라우저에 저장됨 (새로고침 · 다시 들어와도 유지)
  // - 들어왔을 때 로그인돼 있으면: 이용 안내 · 로그인 화면 대신 바로 홈 (프로필을 아직 안 골랐으면 프로필 선택)
  const afterLogin = () => setTab(useAuthStore.getState().currentProfileId ? "home" : "profiles");
  const startChecked = useRef(false);
  useEffect(() => {
    if (!authReady || startChecked.current) return;
    startChecked.current = true;
    if (user) afterLogin();
  }, [authReady, user]);

  // 로그인된 상태에서 로그인 화면으로 가려고 하면 (이용 안내 → 동의 등) 건너뜀
  const goLogin = () => (useAuthStore.getState().user ? afterLogin() : setTab("login"));

  // [추가] 로그아웃 → 로그인 화면
  const handleLogout = async () => {
    await onLogout();
    setTab("login");
  };

  // [수정] TV 로그인: PC 와 같은 계정으로 실제 로그인
  // - 성공 → 프로필 선택 → 홈 / 아이디 · 비밀번호 오류 → 로그인 화면에 안내 문구 (돌려준 글자)
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
      setTab("profiles"); // [수정] PC 와 같이 로그인하면 프로필 선택 (아빠 · 엄마 · 아들 · 딸)
      return "";
    }
    const err = useAuthStore.getState().loginError || "";
    if (err.includes("네트워크")) {
      setTab("network");
      return "";
    }
    return err || "이메일 또는 비밀번호가 올바르지 않습니다.";
  };

  // [수정] 검색: Enter → TV 검색 화면 (입력한 글자로 바로 검색)
  const [searchKey, setSearchKey] = useState(0);
  const openSearch = () => {
    if (tab === "search") return;
    setSearchKey((k) => k + 1);
    setTab("search");
  };
  const handleSearch = (e) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    openSearch();
  };
  const exit = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className={`tv-preview${showSide && sideOpen ? " is-side-open" : ""}${deviceClass}`} ref={previewRef}>
      {/* [추가] 태블릿 · 휴대폰을 세웠을 때: 메뉴 · TV 화면을 모두 덮는 "가로로 돌려 주세요" 안내 (TV.scss · 세로 화면에서만 보임) */}
      <div className="tv-rotate-notice" role="alert">
        <svg className="tv-rotate-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <g className="tv-rotate-icon-phone">
            <rect x="21" y="12" width="22" height="40" rx="4" />
            <path d="M29 46h6" />
          </g>
        </svg>
        <p className="tv-rotate-title">기기를 가로로 돌려 주세요</p>
        <p className="tv-rotate-desc">TV 화면은 가로로 볼 때 가장 잘 보여요.</p>
      </div>
      {/* [수정] 화면 메뉴: 아래 바 → 왼쪽 사이드 메뉴 (기본 열림 · 화살표로 닫고 열기 · 영상 재생 중에는 숨김)
          [수정] 닫으면 숨기지 않고 아이콘만 남은 좁은 메뉴(is-rail) — 방향키로 아이콘 · 열기 화살표까지 이동 가능
          - 글자는 .tv-side-label 로 감싸서 좁은 메뉴에서는 화면에서만 숨김 (화면 읽기 프로그램은 그대로 읽음) · TV.scss */}
      {showSide && (
        <aside className={`tv-side${sideOpen ? "" : " is-rail"}`} aria-label="TV 화면 메뉴">
          <div className="tv-side-head">
            <img className="tv-side-logo" src="/icons/shorts/logo_w.svg" alt="Apple TV" />

            {/* [수정] 로그인 전: "로그인" 글자 버튼 → TV 로그인 화면 / 로그인 후: 프로필 아이콘 → 프로필 선택 */}
            {user ? (
              <button
                type="button"
                className="tv-side-profile"
                aria-label={`프로필 ${currentProfile?.name || ""} · 프로필 변경`}
                onClick={() => setTab("profiles")}
              >
                <ProfileAvatar {...profileLook(profiles, currentProfileId || MAIN_PROFILE_ID)} size="sm" />
              </button>
            ) : (
              <button type="button" className="tv-side-login" onClick={goLogin}>
                로그인
              </button>
            )}

            <button
              type="button"
              className="tv-side-toggle"
              aria-label={sideOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={sideOpen}
              onClick={() => setSideOpen((v) => !v)}
            >
              <img src={sideOpen ? "/icons/nav/left-nav.svg" : "/icons/nav/right-nav.svg"} alt="" aria-hidden="true" />
            </button>
          </div>

          {/* [추가] 좁은 메뉴: 검색칸 대신 검색 아이콘 → 누르면 메뉴를 열고 검색칸에 바로 입력 */}
          {!sideOpen && (
            <button
              type="button"
              className="tv-side-item tv-side-search-btn"
              aria-label="검색"
              onClick={() => {
                setSideOpen(true);
                requestAnimationFrame(() => document.querySelector(".tv-side-search input")?.focus());
              }}
            >
              <span className="tv-side-icon" aria-hidden="true">
                <span className="tv-side-search-icon" />
              </span>
            </button>
          )}

          {/* [추가] 검색창 (시안: 회색 둥근 칸 + 검색 아이콘 + Search) · 좁은 메뉴에서는 숨김 */}
          {sideOpen && (
            <label className="tv-side-search">
              <span className="tv-side-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={query}
                placeholder="Search"
                aria-label="작품 · 인물 · 장르 검색"
                enterKeyHint="search"
                onChange={(e) => setQuery(e.target.value)}
                onFocus={openSearch}
                onKeyDown={handleSearch}
              />
            </label>
          )}

          {/* [수정] 메뉴를 묶음으로 (시안: Library · Apps 처럼 제목 + 접기 화살표) */}
          <nav className="tv-side-menu" role="tablist" aria-label="TV 화면">
            {/* 기본 메뉴: 홈 · 스포츠 · AI */}
            {TABS.filter((t) => t.id !== "terms").map((t) => (
              <button
                type="button"
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`tv-side-item${tab === t.id ? " is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <SideIcon name={t.icon} />
                <span className="tv-side-label">{t.label}</span>
              </button>
            ))}

            {/* [추가] 보관함 — 내 위시리스트 · 관심 경기 (영화 · 시리즈 · 애니메이션 · 오리지널스 · 스포츠) */}
            <button
              type="button"
              role="tab"
              aria-selected={tab === "library"}
              className={`tv-side-item${tab === "library" ? " is-active" : ""}`}
              onClick={() => setTab("library")}
            >
              <span className="tv-side-icon" aria-hidden="true">
                <span className="tv-side-heart-icon" />
              </span>
              <span className="tv-side-label">보관함</span>
            </button>

            {/* AI 어시스트: 홈 섹션 대신 메뉴에서 팝업으로 · 아이콘은 그라데이션이 흐르며 반짝임 */}
            {/* [수정] 계정 설정에서 Apple Assistant 를 끄면 메뉴에서 숨김 */}
            {assistantOn && (
              <button type="button" className={`tv-side-item${aiOpen ? " is-active" : ""}`} aria-haspopup="dialog" onClick={() => setAiOpen(true)}>
                <span className="tv-side-icon tv-side-icon--ai" aria-hidden="true">
                  <AiLogo size={26} />
                </span>
                <span className="tv-side-label">AI</span>
              </button>
            )}

            {/* 관심구단 묶음 — 팔로우한 팀 이름 (별 아이콘) · 누르면 그 팀 화면
                팔로우한 팀이 없으면 제목만 (누르면 스포츠 홈) */}
            <SideGroup
              title="관심구단"
              open={!sideOpen || !closedGroups.team} // [수정] 좁은 메뉴에서는 묶음 제목 없이 아이콘만 항상 보임
              empty={followedTeams.length === 0}
              onToggle={() => (followedTeams.length ? toggleGroup("team") : setTab("sport"))}
            >
              {followedTeams.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  role="tab"
                  aria-selected={teamTabId === t.id}
                  className={`tv-side-item${teamTabId === t.id ? " is-active" : ""}`}
                  onClick={() => setTab(`team:${t.id}`)}
                >
                  <span className="tv-side-icon" aria-hidden="true">
                    <span className="tv-side-star-icon" />
                  </span>
                  <span className="tv-side-label">{t.name}</span>
                </button>
              ))}
            </SideGroup>

            {/* 설정 묶음 — 프로필 변경 · 이용 안내 · 웹 화면으로 · 로그아웃(로그인했을 때만) */}
            <SideGroup title="설정" open={!sideOpen || !closedGroups.settings} onToggle={() => toggleGroup("settings")}>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "profiles"}
                className={`tv-side-item${tab === "profiles" ? " is-active" : ""}`}
                onClick={() => (user ? setTab("profiles") : goLogin())}
              >
                <SideIcon name="tv-family-icon.svg" />
                <span className="tv-side-label">프로필 변경</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "terms"}
                className={`tv-side-item${tab === "terms" ? " is-active" : ""}`}
                onClick={() => setTab("terms")}
              >
                <SideIcon name="tv-apple-tv-icon.svg" />
                <span className="tv-side-label">이용 안내</span>
              </button>
              <button type="button" className="tv-side-item" onClick={exit}>
                <SideIcon name="tv-show-icon.svg" />
                <span className="tv-side-label">웹 화면으로</span>
              </button>
              {user && (
                <button type="button" className="tv-side-item tv-side-logout" onClick={handleLogout}>
                  로그아웃
                </button>
              )}
            </SideGroup>
          </nav>

          {/* 안내 — PC: 리모컨(방향키) / [추가] 태블릿 · 휴대폰: 손가락 터치 */}
          {!sideOpen ? null : isTouch ? (
            <p className="tv-side-guide">
              손가락으로 이용해 주세요
              <span>눌러서 선택하고, 카드 줄은 옆으로 · 화면은 위아래로 밀어서 이동</span>
            </p>
          ) : (
            <p className="tv-side-guide">
              리모컨으로 이용해 주세요
              <span>키보드 방향키(← ↑ → ↓)로 이동하고 Enter 로 선택</span>
            </p>
          )}

        </aside>
      )}

      {/* [삭제] 메뉴를 닫았을 때 TV 화면 위에 떠 있던 열기 화살표 → 좁은 메뉴(is-rail) 안의 화살표로 (방향키로 갈 수 있음) */}

      <div className="tv-preview-area" ref={areaRef}>
        <div
          className="tv-preview-stage"
          ref={stageRef}
          role="tabpanel"
          style={{ width: stageW, height: stageH, transform: `scale(${scale})` }}
        >
          {tab === "terms" && <TvTerms onAgree={goLogin} onCancel={exit} />}
          {tab === "login" && (
            <TvKeyboard
              key="login"
              variant="login"
              onCancel={() => setTab("terms")}
              onSubmit={handleLogin}
            />
          )}
          {tab === "network" && <TvKeyboard key="network" variant="account" networkError onSubmit={() => setTab("login")} />}
          {tab === "profiles" && (
            <TvProfiles
              profiles={profiles}
              current={currentProfileId}
              max={PROFILE_MAX}
              onPick={(id) => {
                onSelectProfile(id);
                setTab("home");
              }}
              onAdd={() => setTab("profile-add")}
            />
          )}
          {/* [추가] 프로필 추가 → 끝나면 프로필 선택 화면으로 (추가한 프로필이 바로 보임) */}
          {tab === "profile-add" && (
            <TvProfileAdd
              nameMax={PROFILE_NAME_MAX}
              onCancel={() => setTab("profiles")}
              onSave={async (v) => {
                const id = await onAddProfile(v);
                if (id) setTab("profiles");
                return Boolean(id);
              }}
            />
          )}
          {tab === "home" && <TvHome onMenu={setTab} onDetail={openDetail} onGenre={openGenre} />}
          {genreId && <TvGenre key={genreId} id={genreId} onMenu={setTab} onDetail={openDetail} />}
          {tab === "sport" && <TvSportHome onMenu={setTab} onDetail={openDetail} />}
          {tab === "library" && <TvLibrary onMenu={setTab} onDetail={openDetail} />}
          {tab === "detail" && detailItem && <TvDetail key={detailItem.key || detailItem.title} item={detailItem} onOpen={openDetail} onBack={closeDetail} />}
          {tab === "search" && <TvSearch key={searchKey} onMenu={setTab} onDetail={openDetail} initialQuery={query.trim()} />}
          {screenTeam && <TvTeam key={screenTeam.id} team={screenTeam} />}
        </div>
      </div>

      {/* [추가] 로그인 전: 콘텐츠를 누르면 웹과 같은 안내 팝업 · 로그인 버튼은 TV 로그인 화면으로 */}
      <SubscribeGate onLogin={goLogin} />

      {/* [추가] AI 어시스트 팝업 (웹과 같은 팝업) */}
      {/* [수정] TV: 결과 카드 전체가 버튼 (+ 없음) · 방향키 이동 · Enter 로 TV 상세 (웹 주소로 나가지 않음)
          · 상세에서 뒤로 오면 보던 결과 그대로 (restoreState) */}
      {aiOpen && assistantOn && (
        <AiAssistantPopup
          tv
          restoreState={aiRestore}
          onOpenDetail={(r, snapshot) => openDetail(ottItem({ title: r.title, ...r.detail, id: r.id }, r.type), snapshot)}
          onClose={() => {
            setAiOpen(false);
            setAiRestore(null);
          }}
        />
      )}
    </div>
  );
};

export default TvPreview;
