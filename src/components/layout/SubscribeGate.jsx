// src/components/layout/SubscribeGate.jsx
// 로그인 전 구독 유도 팝업 ("구독 후 이용해주세요.")
// - 로그인 전 TV 홈(/) · 스포츠(/sport…) 에서 본문(main) 안의 링크 · 버튼을 누르면
//   이동/동작 대신 이 팝업을 먼저 보여줌 (작품 상세 · 재생 · 알림 받기 · 관심있는 구단 팔로우 등 전부)
// - 섹션마다 코드를 고치지 않도록 한 곳에서 클릭을 먼저 받아 처리 (Header 에서 한 번만 렌더)
// - 그대로 동작해야 하는 것은 FREE_SELECTOR 에서 제외
//   (로그인 · 구독으로 가는 버튼, 슬라이드 화살표 · 점, 탭, 에코시스템 안내, AI 어시스턴트 띠)
// - 따로 열어두고 싶은 버튼이 생기면 그 요소에 data-gate="free" 를 붙이면 됨
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

const FREE_SELECTOR = [
  "[data-gate='free']",
  "a[href^='/login']",
  "a[href^='/subscribe']",
  "a[href^='/ecosystem']",
  ".swiper-button-prev",
  ".swiper-button-next",
  ".swiper-pagination-bullet",
  "[role='tab']",
  ".ai-promo",
].join(",");

const SubscribeGate = () => {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const primaryRef = useRef(null);
  const lastFocus = useRef(null);

  // 로그인 전 + TV 홈 / 스포츠 / 검색 화면에서만 동작
  const active =
    authReady &&
    !user &&
    (pathname === "/" || pathname.startsWith("/sport") || pathname.startsWith("/search"));

  // 어디서든 팝업 열기 (헤더 검색창 · 검색 페이지에서 window 이벤트로 요청)
  useEffect(() => {
    const onOpen = () => {
      if (!useAuthStore.getState().user) {
        lastFocus.current = document.activeElement;
        setOpen(true);
      }
    };
    window.addEventListener("subscribe-gate:open", onOpen);
    return () => window.removeEventListener("subscribe-gate:open", onOpen);
  }, []);

  // 본문 안 링크 · 버튼 클릭을 먼저 받아서 팝업으로 대신함
  useEffect(() => {
    if (!active) return undefined;

    const onClick = (e) => {
      const el = e.target.closest("a, button, [role='button']");
      if (!el || !el.closest("main")) return; // 헤더 · 푸터 · 하단 배너는 그대로
      if (el.closest(".subscribe-gate") || el.closest(FREE_SELECTOR)) return;

      e.preventDefault();
      e.stopPropagation();
      lastFocus.current = el;
      setOpen(true);
    };

    document.addEventListener("click", onClick, true); // capture: 각 섹션의 onClick 보다 먼저
    return () => document.removeEventListener("click", onClick, true);
  }, [active]);

  // 페이지가 바뀌거나 로그인하면 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname, user]);

  const close = useCallback(() => {
    setOpen(false);
    lastFocus.current?.focus?.(); // 누른 버튼으로 포커스 되돌리기
  }, []);

  // 열렸을 때: Esc 로 닫기 · 구독 버튼에 포커스 · 뒤 화면 스크롤 막기
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    primaryRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!open) return null;

  const goSubscribe = () => {
    setOpen(false);
    navigate("/login", { state: { from: pathname, intent: "subscribe" } });
  };

  return createPortal(
    <div className="subscribe-gate" onMouseDown={(e) => e.target === e.currentTarget && close()}>
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
          구독 후 이용해주세요.
        </h2>
        <p className="subscribe-gate-desc" id="subscribe-gate-desc">
          {pathname.startsWith("/sport")
            ? "Apple TV를 구독하면 경기 시청과 관심 구단 팔로우를 모두 이용할 수 있어요."
            : pathname.startsWith("/search")
              ? "Apple TV를 구독하면 작품 · 인물 검색과 모든 작품을 이용할 수 있어요."
              : "Apple TV를 구독하면 모든 작품과 기능을 이용할 수 있어요."}
        </p>
        <div className="subscribe-gate-actions">
          <button
            ref={primaryRef}
            type="button"
            className="subscribe-gate-btn"
            onClick={goSubscribe}
          >
            구독하기
          </button>
          <button
            type="button"
            className="subscribe-gate-btn subscribe-gate-btn--secondary"
            onClick={close}
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SubscribeGate;
