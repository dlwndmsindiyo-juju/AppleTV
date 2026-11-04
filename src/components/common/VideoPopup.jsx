import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// 전체 화면 영상 팝업 공용 (OTT 상세 재생 · 검색 예고편 · 스포츠 히어로 경기 시청)
// - body 에 바로 그림 (페이지 전환 애니메이션(.page-fade) 안에 갇히면 화면이 아니라 페이지 전체 기준으로 고정돼서)
// - 왼쪽 위 작은 "← 뒤로" 버튼 · Esc · 브라우저 뒤로가기 모두 같은 동작: 팝업만 닫고 보던 화면으로
//   · 열 때 방문 기록을 하나 쌓아 두고, 뒤로가기를 누르면 그 기록만 지우면서 닫힘 (페이지는 그대로)
// - 스타일: App.scss (.video-popup · .video-back-btn)

// 열려 있는 동안 뒤로가기 · Esc 로 닫히게 하고, 닫기 함수를 돌려줌
export const usePopupBack = (open, onClose) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    // 개발 모드(StrictMode)에서 effect 가 두 번 실행돼도 기록은 한 번만 쌓음
    if (!window.history.state?.videoPopup) window.history.pushState({ videoPopup: true }, "");
    const onPop = () => closeRef.current?.();
    const onKey = (e) => e.key === "Escape" && window.history.back();
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return useCallback(() => window.history.back(), []);
};

// 작은 "← 뒤로" 버튼 (글자 Body/small · Light/0)
export const VideoBackButton = ({ onClick }) => (
  <button type="button" className="video-back-btn" onClick={onClick} aria-label="닫고 돌아가기">
    <span aria-hidden="true">←</span> 뒤로
  </button>
);

// 팝업 틀: open 일 때만 body 에 그림 · 뒤 화면 스크롤 막기
const VideoPopup = ({ open, onClose, label = "영상", className = "", children }) => {
  const close = usePopupBack(open, onClose);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={`video-popup${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-label={label}>
      <VideoBackButton onClick={close} />
      {children}
    </div>,
    document.body
  );
};

export default VideoPopup;
