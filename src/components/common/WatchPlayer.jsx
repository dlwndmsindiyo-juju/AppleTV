// src/components/common/WatchPlayer.jsx
// 재생 팝업용 YouTube 플레이어 — 재생 위치를 알려줌 (이어보기 기록용)
// - YouTube IFrame Player API 사용 (일반 iframe 은 몇 초까지 봤는지 알 수 없음)
// - startAt: 이어서 볼 위치(초)
// - onProgress(position, duration): 재생 중 5초마다 · 일시정지 · 끝남 · 팝업 닫을 때 호출
// - [추가] onEnded(): 영상을 끝까지 봤을 때 (계정 설정 "다음 에피소드 · 추천 항목 재생" 자동 재생용)
// - [수정] 휴대폰 · 태블릿(터치 기기): 재생 버튼을 한 번 더 누르지 않아도 바로 재생
//   · 터치 기기는 소리 있는 영상의 자동 재생을 막아 YouTube 재생 버튼이 다시 뜸
//   → 소리를 끈 채 바로 재생하고, 화면 위 [소리 켜기] 버튼을 누르면 소리가 켜짐 (누른 동작이라 기기가 허용)
//   · PC 는 예전처럼 소리와 함께 바로 재생
import React, { useEffect, useRef, useState } from "react";
import { loadYouTubeApi } from "./youtubeApi"; // [정리] YouTube API 불러오기 공용

const SAVE_EVERY_MS = 5000;

// 터치 기기 (휴대폰 · 태블릿)
const isTouchDevice = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(hover: none), (pointer: coarse)").matches);

// API 스크립트 불러오기는 공용 파일 (components/common/youtubeApi.js)

const WatchPlayer = ({ videoKey, startAt = 0, onProgress, onEnded, title = "영상" }) => {
  const wrapRef = useRef(null);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  const endedRef = useRef(onEnded); // [추가]
  endedRef.current = onEnded;
  const playerRef = useRef(null);
  const [muted, setMuted] = useState(false); // [추가] 터치 기기에서 소리 끈 채 시작했는지

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
        const muteFirst = isTouchDevice();
        player = new YT.Player(host, {
          videoId: videoKey,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, mute: muteFirst ? 1 : 0, start: Math.floor(startAt) || 0, rel: 0, playsinline: 1 },
          events: {
            onReady: (e) => {
              e.target.getIframe()?.setAttribute("title", title);
              e.target.getIframe()?.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
              playerRef.current = e.target;
              if (muteFirst) {
                e.target.mute();
                setMuted(true);
              }
              e.target.playVideo(); // 자동 재생이 늦거나 막혀도 한 번 더 시작
            },
            onStateChange: (e) => {
              clearInterval(timer);
              if (e.data === YT.PlayerState.PLAYING) {
                timer = setInterval(report, SAVE_EVERY_MS);
              } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
                report();
                if (e.data === YT.PlayerState.ENDED) endedRef.current?.(); // [추가] 끝까지 봤을 때
              }
            },
          },
        });
      })
      .catch((error) => console.error(error));

    return () => {
      cancelled = true;
      clearInterval(timer);
      playerRef.current = null;
      setMuted(false);
      report(); // 팝업을 닫을 때 마지막 위치 저장
      try {
        player?.destroy?.();
      } catch {
        // 무시
      }
      if (wrap) wrap.innerHTML = "";
    };
  }, [videoKey, startAt, title]);

  // [추가] 소리 켜기 (누른 동작 안에서 켜야 터치 기기가 허용)
  const unmute = () => {
    try {
      playerRef.current?.unMute();
      playerRef.current?.setVolume?.(100);
      playerRef.current?.playVideo();
    } catch {
      // 무시
    }
    setMuted(false);
  };

  return (
    <div className="watch-player-wrap">
      <div className="watch-player" ref={wrapRef} />
      {muted && (
        <button type="button" className="watch-unmute" onClick={unmute}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            <line x1="22" y1="9" x2="16" y2="15" />
            <line x1="16" y1="9" x2="22" y2="15" />
          </svg>
          소리 켜기
        </button>
      )}
    </div>
  );
};

export default WatchPlayer;
