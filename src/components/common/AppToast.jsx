// src/components/common/AppToast.jsx
// [추가] 공용 토스트 (utils/toast.js 의 showToast 로 띄움) — 3초 뒤 저절로 사라짐
// - 모양: 위시리스트 토스트와 같은 .wish-toast (App.scss) · 아이콘만 종류별로
// - 쓰는 곳: 공개 알림 켜기 · 끄기 / 구단 팔로우 · 취소 / 작품 평점 저장 · 수정
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TOAST_EVENT } from "../../utils/toast";

const TOAST_MS = 3000;

// 아이콘 (흰 선 · 24)
const ICONS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  "bell-off": (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
      <path d="M4 4l16 16" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />,
  "star-off": (
    <>
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" />
      <path d="M4 4l16 16" />
    </>
  ),
};

const AppToast = () => {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const onToast = (e) => setToast(e.detail);
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return createPortal(
    <div className="wish-toast app-toast" role="status" aria-live="polite" key={toast.id}>
      <span className="wish-toast-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[toast.icon] || ICONS.check}
        </svg>
      </span>
      <p>{toast.text}</p>
    </div>,
    document.body,
  );
};

export default AppToast;
