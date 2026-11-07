// src/components/layout/SubscribeGate.jsx
// 로그인 전 안내 팝업 (Header 에서 한 번만 렌더)
// - 로그인 전에도 모든 섹션 · 페이지(작품 상세 · 검색 · 스포츠 등)는 그대로 둘러볼 수 있음
// - 콘텐츠를 직접 감상할 때만 "구독 후 이용해주세요." (reason: "watch")
//     · 작품 재생 (상세 페이지 재생하기 · 회차 · 영상 · 이어보기)  → MovieDetail 에서 요청
//     · 스포츠 경기 라이브 · 하이라이트 · 다시보기 · 시리즈 · 숏츠 재생 → 아래 WATCH_ROUTES · WATCH_SELECTOR
// - 계정이 있어야 저장되는 기능(찜 · 관심 인물 등)은 "로그인 후 이용해주세요." (reason: "account")
// - 다른 곳에서 열기: window.dispatchEvent(new CustomEvent("subscribe-gate:open", { detail: { reason } }))
// - [추가] 로그인했지만 구독 전인 계정도 감상 · AI 취향 선택 때 "구독 후 이용해주세요." → [구독하기] → 구독 팝업(SubscribePopup)이 그 화면 위에 뜸
// - [추가] reason "ai": AI 추천 팝업에서 취향 버튼 (로그인 전: [계정 만들기] → 로그인 화면)
// - [추가] GateCard: 같은 디자인의 팝업 카드만 따로 (로그인 → 프로필 선택 화면에서 사용)
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore, isSubscribed } from "../../store/useAuthStore";
import { SubscribePopup } from "../../pages/Subscribe";

// 들어가면 바로 영상이 재생되는 스포츠 페이지 (예정된 경기 /sport/upcoming 은 카운트다운이라 제외)
const WATCH_ROUTES = ["/sport/match/", "/sport/replay", "/sport/highlights", "/sport/series"];

// 누르면 바로 재생되는 버튼 · 감상 페이지로 가는 링크
const WATCH_SELECTOR = [
  "[data-gate='watch']",
  ".sport-sf-play", // 숏츠 재생
  ...WATCH_ROUTES.map((path) => `a[href^='${path}']`),
].join(",");

const isWatchRoute = (pathname) => WATCH_ROUTES.some((p) => pathname.startsWith(p));

const TEXT = {
  watch: {
    title: "구독 후 이용해주세요.",
    button: "구독하기",
  },
  account: {
    title: "로그인 후 이용해주세요.",
    desc: "찜 · 관심 인물 같은 기능은 Apple 계정으로 로그인하면 이용할 수 있어요.",
    button: "로그인",
  },
  // [추가] AI 작품 추천 (로그인 전)
  ai: {
    title: "구독 후 이용해주세요.",
    desc: "AI 작품 추천은 Apple TV를 구독하면 이용할 수 있어요.",
    button: "계정 만들기",
  },
};

// [추가] 구독 전(로그인함) 계정에 보여줄 글
const MEMBER_TEXT = {
  title: "구독 후 이용해주세요.",
  button: "구독하기",
};

// =====================================================================
// [추가] 안내 팝업 카드 (스포츠 · 상세 등과 같은 디자인 · .subscribe-gate-*)
// - Esc · 바깥 누르면 닫힘 · 열리면 주 버튼에 포커스 · 뒤 화면 스크롤 막기
// =====================================================================
export const GateCard = ({ title, desc, button, onPrimary, onClose }) => {
  const primaryRef = useRef(null);
  const latest = useRef(onClose);
  latest.current = onClose;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && latest.current();
    document.addEventListener("keydown", onKey);
    primaryRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <div className="subscribe-gate" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="subscribe-gate-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-gate-title"
        aria-describedby="subscribe-gate-desc"
      >
        <div className="subscribe-gate-logo" aria-hidden="true">
          <img src="/icons/header-icon.svg" alt="" />
        </div>
        <h2 className="subscribe-gate-title" id="subscribe-gate-title">
          {title}
        </h2>
        <p className="subscribe-gate-desc" id="subscribe-gate-desc">
          {desc}
        </p>
        <div className="subscribe-gate-actions">
          <button ref={primaryRef} type="button" className="subscribe-gate-btn" onClick={onPrimary}>
            {button}
          </button>
          <button type="button" className="subscribe-gate-btn subscribe-gate-btn--secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const WATCH_DESC = "Apple TV를 구독하면 모든 작품을 바로 시청할 수 있어요.";

// onLogin: [추가] 로그인 버튼을 눌렀을 때 웹 로그인 페이지 대신 할 일 (TV 미리보기: TV 로그인 화면으로)
const SubscribeGate = ({ onLogin } = {}) => {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [reason, setReason] = useState(null); // null | "watch" | "account" | "ai"
  const [leaveOnClose, setLeaveOnClose] = useState(false); // 감상 페이지에 바로 들어온 경우: 닫으면 스포츠 홈으로
  const [subOpen, setSubOpen] = useState(false); // [추가] 구독 팝업 (로그인했지만 구독 전)
  const lastFocus = useRef(null);

  const loggedOut = authReady && !user;
  const notMember = authReady && Boolean(user) && !isSubscribed(user); // [추가] 로그인했지만 구독 전
  const gated = loggedOut || (notMember && !onLogin); // TV 미리보기(onLogin)는 예전처럼 로그인 전만

  // 어디서든 팝업 열기 (상세 페이지 재생 · 찜 · 관심 인물 등)
  useEffect(() => {
    const onOpen = (e) => {
      const u = useAuthStore.getState().user;
      const r = ["account", "ai"].includes(e.detail?.reason) ? e.detail.reason : "watch";
      if (u && (isSubscribed(u) || r === "account" || onLogin)) return; // 구독 중 · 로그인한 계정의 계정 기능 · TV 미리보기는 그대로
      lastFocus.current = document.activeElement;
      setLeaveOnClose(false);
      setReason(r);
    };
    window.addEventListener("subscribe-gate:open", onOpen);
    return () => window.removeEventListener("subscribe-gate:open", onOpen);
  }, [onLogin]);

  // 감상 버튼 · 링크만 먼저 받아서 팝업으로 대신함 (나머지 클릭은 그대로 동작)
  useEffect(() => {
    if (!gated) return undefined;
    const onClick = (e) => {
      const el = e.target.closest?.(WATCH_SELECTOR);
      if (!el || el.closest(".subscribe-gate")) return;
      e.preventDefault();
      e.stopPropagation();
      lastFocus.current = el;
      setLeaveOnClose(false);
      setReason("watch");
    };
    document.addEventListener("click", onClick, true); // capture: 각 섹션의 onClick 보다 먼저
    return () => document.removeEventListener("click", onClick, true);
  }, [gated]);

  // 감상 페이지 주소로 바로 들어온 경우 (새로고침 · 공유 링크)
  useEffect(() => {
    if (gated && isWatchRoute(pathname)) {
      setLeaveOnClose(true);
      setReason("watch");
    } else {
      setReason(null); // 페이지가 바뀌거나 로그인 · 구독하면 닫기
    }
  }, [pathname, gated]);

  const close = useCallback(() => {
    setReason(null);
    if (leaveOnClose) {
      navigate("/sport", { replace: true });
      return;
    }
    lastFocus.current?.focus?.(); // 누른 버튼으로 포커스 되돌리기
  }, [leaveOnClose, navigate]);

  // [추가] 구독 팝업: 닫으면 보던 화면 그대로 · 구독 완료 → [홈으로 돌아가기]
  if (subOpen) {
    return (
      <SubscribePopup
        onClose={() => setSubOpen(false)}
        onDone={() => {
          setSubOpen(false);
          navigate("/", { replace: true });
        }}
      />
    );
  }

  if (!reason) return null;

  const member = Boolean(user); // 로그인함(구독 전)
  const text = member ? { ...TEXT.watch, ...MEMBER_TEXT } : TEXT[reason];
  const watchDesc = pathname.startsWith("/sport")
    ? "Apple TV를 구독하면 경기 라이브 · 하이라이트 · 다시보기를 모두 시청할 수 있어요."
    : WATCH_DESC;
  const desc = reason === "ai" ? TEXT.ai.desc : reason === "watch" ? watchDesc : text.desc;

  const goNext = () => {
    setReason(null);
    if (onLogin) {
      onLogin(reason);
      return;
    }
    // [추가] 로그인했지만 구독 전 → 지금 화면 위에 구독 팝업
    if (member) {
      setSubOpen(true);
      return;
    }
    navigate("/login", {
      state: { from: leaveOnClose ? "/sport" : pathname, intent: reason === "account" ? "login" : "subscribe" },
    });
  };

  return <GateCard title={text.title} desc={desc} button={text.button} onPrimary={goNext} onClose={close} />;
};

export default SubscribeGate;
