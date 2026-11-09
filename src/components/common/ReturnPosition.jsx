// src/components/common/ReturnPosition.jsx
// [추가] 웹: 뒤로 오면 보던 자리 그대로 — 스크롤 위치 + 키보드로 고르고 있던 콘텐츠(포커스)
// - 페이지마다(주소 기록 key) 스크롤 · 마지막 포커스 순서를 저장 → 브라우저 뒤로 · "← 홈으로"(뒤로) 로 돌아오면 되살림
// - 내용이 늦게 그려지는 페이지(데이터 불러오기)를 위해 최대 약 2초 동안 높이가 충분해질 때까지 기다렸다가 이동
// - 새로 이동(링크 클릭)한 페이지는 건드리지 않음 (각 페이지의 맨 위로 이동 그대로)
// - App.jsx 에 한 번만 둠 · 화면에 그리는 것은 없음
import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const KEY = "return-position-v1";
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex="0"]';

const readAll = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};
const writeOne = (key, value) => {
  try {
    const all = readAll();
    all[key] = { ...all[key], ...value };
    const keys = Object.keys(all);
    if (keys.length > 50) delete all[keys[0]]; // 오래된 기록 정리
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // 저장 못 해도 화면에는 영향 없음
  }
};

const ReturnPosition = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const keyRef = useRef(location.key);

  // 페이지가 바뀌는 순간 바로 "지금 페이지" 표시를 바꿈 → 이전 페이지 기록이 새 페이지 높이(잘린 스크롤)로 덮이지 않게
  useLayoutEffect(() => {
    keyRef.current = location.key;
  }, [location.key]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual"; // 브라우저 자동 복원과 겹치지 않게
  }, []);

  // 지금 페이지의 스크롤 · 포커스 기록
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (keyRef.current !== location.key) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (keyRef.current === location.key) writeOne(location.key, { y: window.scrollY });
      });
    };
    const onFocus = (e) => {
      if (keyRef.current !== location.key) return;
      const list = [...document.querySelectorAll(FOCUSABLE)];
      const index = list.indexOf(e.target);
      if (index >= 0) writeOne(location.key, { focus: index, y: window.scrollY });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocus);
    };
  }, [location.key]);

  // 뒤로 · 앞으로 온 페이지: 저장한 자리로
  useEffect(() => {
    if (navType !== "POP") return undefined;
    const saved = readAll()[location.key];
    if (!saved) return undefined;
    const y = saved.y || 0;
    let tries = 0;
    let timer = 0;
    const restore = () => {
      const tall = document.documentElement.scrollHeight >= y + window.innerHeight;
      if (!tall && tries++ < 20) {
        timer = setTimeout(restore, 100);
        return;
      }
      window.scrollTo(0, y);
      // 키보드로 고르던 콘텐츠에 다시 포커스 (화면은 움직이지 않게)
      if (saved.focus != null) {
        const el = [...document.querySelectorAll(FOCUSABLE)][saved.focus];
        el?.focus({ preventScroll: true });
      }
    };
    timer = setTimeout(restore, 50);
    return () => clearTimeout(timer);
  }, [location.key, navType]);

  return null;
};

export default ReturnPosition;
