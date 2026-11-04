import React, { useEffect, useRef } from "react";
import VideoPopup from "../common/VideoPopup";

// [추가] TV 영상 재생 — 카드를 누르면 그 영상을 화면 가득 바로 재생
// - 웹과 같은 전체 화면 팝업(VideoPopup) · 왼쪽 위 "← 뒤로" · Esc · 브라우저 뒤로가기로 닫기
// - 리모컨: 열리면 "← 뒤로" 버튼에 포커스 (Enter 로 닫기) · 닫으면 누른 카드로 포커스 되돌림
// - videoId: YouTube 영상 id (없으면 닫힘)
const TvPlayer = ({ videoId, title = "영상", onClose }) => {
  const lastFocus = useRef(null);

  useEffect(() => {
    if (!videoId) return undefined;
    lastFocus.current = document.activeElement;
    const t = setTimeout(() => document.querySelector(".video-popup .video-back-btn")?.focus(), 0);
    return () => {
      clearTimeout(t);
      lastFocus.current?.focus?.({ preventScroll: true });
    };
  }, [videoId]);

  return (
    <VideoPopup open={Boolean(videoId)} onClose={onClose} label={title} className="tv-video-popup">
      {videoId && (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}
    </VideoPopup>
  );
};

export default TvPlayer;
