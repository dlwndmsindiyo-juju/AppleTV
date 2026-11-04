// src/components/common/AutoNext.jsx
// [추가] 영상이 끝나면 "N초 후 다음 영상 재생" 안내 — 계정 설정의 자동 재생 토글과 연결
// - 다음 에피소드 재생 (autoplayNext) · 추천 항목 재생 (autoplayRecommend)
// - 웹: <AutoNext /> 카드 (영상 팝업 · 스포츠 상세 플레이어 오른쪽 아래) — 스타일: App.scss (.auto-next) · mobile.scss
// - TV: useAutoCountdown 만 가져가서 끝 화면(TvEndScreen)에 표시
// - 시간이 다 되면 onPlay · "취소" 를 누르면 onCancel (그 자리에서 멈춤)
import React, { useEffect, useRef, useState } from "react";

export const AUTO_NEXT_SECONDS = 5;

// 남은 초 (active 동안 1초씩 줄고 0이 되면 onDone 한 번) — key 가 바뀌면 처음부터
export const useAutoCountdown = (active, onDone, seconds = AUTO_NEXT_SECONDS, key = "") => {
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setLeft(seconds);
  }, [active, seconds, key]);

  useEffect(() => {
    if (!active) return undefined;
    if (left <= 0) {
      doneRef.current?.();
      return undefined;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [active, left]);

  return left;
};

// kind: "다음 에피소드" · "추천 콘텐츠" · "다음 영상" / title · image: 다음에 재생할 것
const AutoNext = ({ kind, title, image, seconds = AUTO_NEXT_SECONDS, onPlay, onCancel, className = "" }) => {
  const left = useAutoCountdown(true, onPlay, seconds, title);
  const playRef = useRef(null);

  // 나타나면 "지금 재생" 에 포커스 (키보드 · 리모컨)
  useEffect(() => {
    playRef.current?.focus({ preventScroll: true });
  }, [title]);

  return (
    <div className={`auto-next ${className}`.trim()} role="status" aria-live="polite">
      {image && <img className="auto-next-thumb" src={image} alt="" aria-hidden="true" />}
      <div className="auto-next-text">
        <span className="auto-next-kind">{kind}</span>
        <strong className="auto-next-title">{title}</strong>
        <span className="auto-next-count">{Math.max(0, left)}초 후 재생</span>
      </div>
      <div className="auto-next-actions">
        <button type="button" className="auto-next-btn is-primary" ref={playRef} onClick={onPlay}>
          <img src="/icons/play-w.svg" alt="" aria-hidden="true" />
          지금 재생
        </button>
        <button type="button" className="auto-next-btn" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
};

export default AutoNext;
