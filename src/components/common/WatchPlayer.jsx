// src/components/common/WatchPlayer.jsx
// 재생 팝업용 YouTube 플레이어 — 재생 위치를 알려줌 (이어보기 기록용)
// - YouTube IFrame Player API 사용 (일반 iframe 은 몇 초까지 봤는지 알 수 없음)
// - startAt: 이어서 볼 위치(초)
// - onProgress(position, duration): 재생 중 5초마다 · 일시정지 · 끝남 · 팝업 닫을 때 호출
import React, { useEffect, useRef } from "react";

const SAVE_EVERY_MS = 5000;

// API 스크립트는 한 번만 불러옴
let apiPromise = null;
const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube API 를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
};

const WatchPlayer = ({ videoKey, startAt = 0, onProgress, title = "영상" }) => {
  const wrapRef = useRef(null);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  useEffect(() => {
    let player = null;
    let timer = null;
    let cancelled = false;
    const wrap = wrapRef.current;

    const report = () => {
      try {
        if (!player?.getCurrentTime) return;
        const position = player.getCurrentTime();
        const duration = player.getDuration();
        if (duration > 0) progressRef.current?.(position, duration);
      } catch {
        // 플레이어가 이미 사라진 경우 무시
      }
    };

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !wrap) return;
        // YT.Player 가 바꿔치기할 자리 (React 가 관리하는 요소와 분리)
        const host = document.createElement("div");
        wrap.appendChild(host);
        player = new YT.Player(host, {
          videoId: videoKey,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, start: Math.floor(startAt) || 0, rel: 0, playsinline: 1 },
          events: {
            onReady: (e) => {
              e.target.getIframe()?.setAttribute("title", title);
            },
            onStateChange: (e) => {
              clearInterval(timer);
              if (e.data === YT.PlayerState.PLAYING) {
                timer = setInterval(report, SAVE_EVERY_MS);
              } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
                report();
              }
            },
          },
        });
      })
      .catch((error) => console.error(error));

    return () => {
      cancelled = true;
      clearInterval(timer);
      report(); // 팝업을 닫을 때 마지막 위치 저장
      try {
        player?.destroy?.();
      } catch {
        // 무시
      }
      if (wrap) wrap.innerHTML = "";
    };
  }, [videoKey, startAt, title]);

  return <div className="watch-player" ref={wrapRef} />;
};

export default WatchPlayer;
