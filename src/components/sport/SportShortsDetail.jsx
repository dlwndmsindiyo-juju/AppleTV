import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { openShare } from "../../utils/share";
import { openSubscribeGate } from "../../utils/subscribeGate";
import { useAuthStore, useSettings } from "../../store/useAuthStore";
import { loadYouTubeApi } from "../common/youtubeApi";
import AutoNext from "../common/AutoNext"; // [추가] 끝나면 "다음 숏폼 · N초 후 재생" (지금 재생 · 취소)
import VideoPopup from "../common/VideoPopup"; // [추가] 전체보기: 작품 상세와 같은 재생 팝업
import WatchPlayer from "../common/WatchPlayer";

// =====================================================================
// [추가] 숏폼 상세 (/sport/shorts) — 세로 카드 하나 + 오른쪽 정보 · UP NEXT · 양옆 이전 / 다음
// - 데이터: data/sportShorts.js 그대로 (SportDetail 의 shorts 목록 · 재생 못 하는 영상은 이미 빠져 있음)
//   · 화면에 쓰는 값: tag · title · match · seconds(있으면) · likeCount · thumb · videoId
// - 카드: 홈 숏폼 카드와 같은 구성 (Apple TV · MLS / 소리 · 재생 · 좋아요 · 공유 · 팀 · 제목 · 경기 / 진행 바)
//   · 재생 버튼 → 카드 안에서 바로 재생 (YouTube 컨트롤 없이) · 재생 중 카드를 누르면 일시정지 / 다시 재생
//   · 진행 바: 실제 재생 위치 (YouTube API)
//   · [수정] 끝나면 계정 설정 "추천 항목 재생" 이 켜져 있을 때 카드 위에 "다음 숏폼 · 5초 후 재생" 안내
//     → 지금 재생 / 시간이 다 되면 다음 숏폼 재생 · 취소하면 그대로
//   · [추가] 작품 상세와 같은 재생 · 일시정지 버튼 + 전체보기 버튼 (카드 오른쪽 위 · 같은 동그라미 모양)
//     → 전체보기: 작품 상세 [전체보기]와 같은 재생 팝업 (화면 가득 · 하단 재생바 · 보던 위치부터 · 끝나면 다음 숏폼 안내)
//   · [추가] 재생 버튼 한 번으로 바로 재생: YouTube 스크립트를 미리 불러 두고,
//     소리 있는 자동 재생이 막히면 소리를 끈 채 재생 (오른쪽 위 소리 버튼으로 켜기)
// - 이전 / 다음: 양옆 동그라미 버튼 · 키보드 ← → · UP NEXT 목록
//   · [수정] UP NEXT: 메인 숏폼 데이터 전체를 지금 숏폼 다음 순서부터(끝나면 처음으로) 보여주고 스크롤
// - [수정] [전체 경기 보기] 위 설명 문구는 모든 숏폼이 같은 문구 (SHORTS_DESC)
// - 로그인 전: 재생 · 좋아요 · 공유는 로그인 안내 (홈 숏폼과 같음)
// - 스타일: sport-member.scss "숏폼 상세" · 크기 변수: _variables.scss $shorts-detail-*
// =====================================================================

const ICON_BASE = `${import.meta.env.BASE_URL}icons/shorts/`;

// [추가] 모든 숏폼에 같은 설명 (두 줄)
const SHORTS_DESC = [
  "경기의 흐름을 바꾼 결정적인 순간을 짧고 선명하게 만나보세요.",
  "MLS Season Pass가 엄선한 장면을 바로 이어서 시청할 수 있습니다.",
];

// 터치 기기는 소리를 끈 채 시작 (소리 있는 자동 재생을 막음 → 소리 버튼으로 켜기)
const isTouchDevice = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(hover: none), (pointer: coarse)").matches);

// 영상 길이: 24 → 0:24
const formatDuration = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

// 좋아요 수: 12.8만 / 3.4천 / 512 (홈 숏폼과 같은 규칙)
const formatCount = (n) => {
  if (!n) return "좋아요";
  const trim = (v) => String(Number(v.toFixed(1)));
  if (n >= 10000) return `${trim(n / 10000)}만`;
  if (n >= 1000) return `${trim(n / 1000)}천`;
  return String(n);
};

// ----- 아이콘 (홈 숏폼 카드와 같은 SVG) -----
const SoundIcon = ({ muted }) => (
  <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
    <path
      d={muted
        ? "M6.43121 0.650391L3.1784 3.50753H0.648438V7.79325H3.1784L6.43121 10.6504V0.650391Z M9.3 3.9L12.6 7.4 M12.6 3.9L9.3 7.4"
        : "M9.3226 3.86468C9.73319 4.37143 9.9569 5.00123 9.9569 5.65039C9.9569 6.29955 9.73319 6.92936 9.3226 7.43611M11.1297 2.07896C11.6106 2.5445 11.9926 3.10017 12.2533 3.71343C12.5141 4.32668 12.6484 4.98519 12.6484 5.65039C12.6484 6.31559 12.5141 6.9741 12.2533 7.58735C11.9926 8.20061 11.6106 8.75628 11.1297 9.22182M6.43121 0.650391L3.1784 3.50753H0.648438V7.79325H3.1784L6.43121 10.6504V0.650391Z"}
      strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"
    />
  </svg>
);

const LikeIcon = ({ on }) => (
  <svg width="30" height="13" viewBox="0 0 30 13" fill={on ? "currentColor" : "none"} aria-hidden="true">
    <path
      d="M20.739 1.72712C20.4075 1.40569 20.0133 1.15061 19.5792 0.976554C19.1451 0.802496 18.6796 0.712891 18.2094 0.712891C17.7393 0.712891 17.2738 0.802496 16.8397 0.976554C16.4055 1.15061 16.0114 1.40569 15.6799 1.72712L15.0313 2.41501L14.3178 1.72712C13.6469 1.08029 12.737 0.716907 11.7883 0.716907C10.8395 0.716907 9.92959 1.08029 9.25871 1.72712C8.58783 2.37395 8.21094 3.25124 8.21094 4.16599C8.21094 5.08075 8.58783 5.95804 9.25871 6.60487L9.97218 7.29275L15.0313 11.9829L20.0255 7.29275L20.739 6.60487C21.0724 6.28524 21.3369 5.90522 21.5175 5.48667C21.698 5.06812 21.7909 4.61929 21.7909 4.16599C21.7909 3.71269 21.698 3.26387 21.5175 2.84532C21.3369 2.42677 21.0724 2.04675 20.739 1.72712Z"
      strokeWidth="1.425" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"
    />
  </svg>
);

const ShareIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
    <g strokeWidth="1.425" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor">
      <path d="M20.4102 10.5042C20.4102 11.3911 19.6975 12.1101 18.8184 12.1101C17.9392 12.1101 17.2266 11.3911 17.2266 10.5042C17.2266 9.61738 17.9392 8.89844 18.8184 8.89844C19.6975 8.89844 20.4102 9.61738 20.4102 10.5042Z" />
      <path d="M12.7696 15.0003C12.7696 15.8872 12.0569 16.6061 11.1778 16.6061C10.2986 16.6061 9.58594 15.8872 9.58594 15.0003C9.58594 14.1135 10.2986 13.3945 11.1778 13.3945C12.0569 13.3945 12.7696 14.1135 12.7696 15.0003Z" />
      <path d="M20.4102 19.4964C20.4102 20.3833 19.6975 21.1022 18.8184 21.1022C17.9392 21.1022 17.2266 20.3833 17.2266 19.4964C17.2266 18.6096 17.9392 17.8906 18.8184 17.8906C19.6975 17.8906 20.4102 18.6096 20.4102 19.4964Z" />
      <path d="M12.5781 14.2303L17.4172 11.3398M12.5781 15.7719L17.4172 18.6623" />
    </g>
  </svg>
);

const Chevron = ({ dir = "right" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points={dir === "left" ? "15 5 8 12 15 19" : "9 5 16 12 9 19"} />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

// ---------------------------------------------------------------------
// 카드 안 YouTube 플레이어 (컨트롤 없이 · 진행 위치를 알려줌)
// ---------------------------------------------------------------------
const useShortPlayer = ({ videoId, active, muted, onEnded, onAutoMuted }) => {
  const autoMutedRef = useRef(onAutoMuted);
  autoMutedRef.current = onAutoMuted;
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const [state, setState] = useState({ paused: false, progress: 0, duration: 0 });

  useEffect(() => {
    if (!active || !videoId) return undefined;
    let cancelled = false;
    let timer = null;
    let autoTimer = null;
    let player = null;
    const wrap = hostRef.current;
    setState({ paused: false, progress: 0, duration: 0 });

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !wrap) return;
        const host = document.createElement("div");
        wrap.appendChild(host);
        player = new YT.Player(host, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, modestbranding: 1, mute: mutedRef.current ? 1 : 0 },
          events: {
            onReady: (e) => {
              playerRef.current = e.target;
              e.target.getIframe()?.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
              if (mutedRef.current) e.target.mute();
              e.target.playVideo();
              // [추가] 소리 있는 자동 재생이 막혔으면 소리 끄고 재생
              autoTimer = setTimeout(() => {
                try {
                  const s = e.target.getPlayerState?.();
                  if (cancelled || s === YT.PlayerState.PLAYING || s === YT.PlayerState.BUFFERING || s === YT.PlayerState.ENDED) return;
                  e.target.mute();
                  e.target.playVideo();
                  autoMutedRef.current?.();
                } catch {
                  // 무시
                }
              }, 1500);
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.PLAYING) setState((s) => ({ ...s, paused: false }));
              if (e.data === YT.PlayerState.PAUSED) setState((s) => ({ ...s, paused: true }));
              if (e.data === YT.PlayerState.ENDED) {
                setState((s) => ({ ...s, progress: 1, paused: true }));
                endedRef.current?.();
              }
            },
          },
        });
        // 진행 바: 0.25초마다 재생 위치
        timer = setInterval(() => {
          try {
            const d = player?.getDuration?.() || 0;
            const t = player?.getCurrentTime?.() || 0;
            if (d > 0) setState((s) => ({ ...s, progress: Math.min(1, t / d), duration: d }));
          } catch {
            // 플레이어 준비 전
          }
        }, 250);
      })
      .catch((error) => console.error(error));

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(autoTimer);
      playerRef.current = null;
      try {
        player?.destroy?.();
      } catch {
        // 무시
      }
      if (wrap) wrap.innerHTML = "";
    };
  }, [videoId, active]);

  // 소리 켜기 / 끄기 (누른 동작 안에서 바로 적용)
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (muted) p.mute();
      else {
        p.unMute();
        p.setVolume?.(100);
      }
    } catch {
      // 무시
    }
  }, [muted]);

  const togglePause = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (state.paused) p.playVideo();
      else p.pauseVideo();
    } catch {
      // 무시
    }
  }, [state.paused]);

  return { hostRef, ...state, togglePause };
};

// ---------------------------------------------------------------------
const SportShortsDetail = ({ items, current, onSelect }) => {
  const settings = useSettings();
  const index = Math.max(0, items.indexOf(current));
  const prev = items[index - 1];
  const next = items[index + 1];
  // [수정] 지금 숏폼을 뺀 전체 — 다음 순서부터, 끝까지 가면 처음부터
  const upNext = [...items.slice(index + 1), ...items.slice(0, index)];
  const upNextRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(isTouchDevice);
  const [ended, setEnded] = useState(false); // [추가] 끝남 → 다음 숏폼 안내
  const [full, setFull] = useState(null); // [추가] 전체보기 팝업 { item, startAt }
  const [fullEnded, setFullEnded] = useState(false);
  const autoRef = useRef(false); // 다음 숏폼으로 넘어가면서 바로 재생할지

  // [추가] YouTube 스크립트를 미리 불러 둠 → 재생 버튼을 누르자마자 플레이어 생성 (누른 동작이 유효할 때 재생)
  useEffect(() => {
    loadYouTubeApi().catch(() => {});
  }, []);

  // 다른 숏폼으로 바뀌면: 자동 이어보기면 바로 재생 · 아니면 썸네일부터
  useEffect(() => {
    setPlaying(autoRef.current);
    setEnded(false);
    autoRef.current = false;
    upNextRef.current?.scrollTo?.({ top: 0 }); // [추가] UP NEXT 는 바로 다음 숏폼부터 보이게
  }, [current.id]);

  const go = useCallback(
    (item, { autoplay = false } = {}) => {
      if (!item) return;
      autoRef.current = autoplay;
      onSelect(item.id);
    },
    [onSelect]
  );

  const player = useShortPlayer({
    videoId: current.videoId,
    active: playing,
    muted,
    onEnded: () => setEnded(true),
    onAutoMuted: () => setMuted(true),
  });
  const showUpNext = ended && playing && settings.autoplayRecommend && Boolean(next);

  // [추가] 전체보기: 카드 영상은 멈추고 같은 위치부터 재생 팝업으로
  const openFull = () => {
    const startAt = playing && player.duration ? Math.floor(player.progress * player.duration) : 0;
    setPlaying(false);
    setEnded(false);
    setFullEnded(false);
    setFull({ item: current, startAt: startAt >= Math.floor(player.duration || 0) ? 0 : startAt });
  };
  const fullIndex = full ? items.findIndex((v) => v.id === full.item.id) : -1;
  const fullNext = fullIndex >= 0 ? items[fullIndex + 1] : null;

  // 키보드 ← → 로 이전 / 다음 (입력창에 있을 때는 그대로)
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "ArrowLeft" && prev) go(prev, { autoplay: playing });
      if (e.key === "ArrowRight" && next) go(next, { autoplay: playing });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, go, playing]);

  // 좋아요: 홈 숏폼과 같은 저장 (계정마다 이 브라우저에 · shortLikes:uid)
  const uid = useAuthStore((s) => s.user?.uid);
  const likeKey = uid ? `shortLikes:${uid}` : null;
  const [liked, setLiked] = useState({});
  useEffect(() => {
    if (!likeKey) {
      setLiked({});
      return;
    }
    try {
      setLiked(JSON.parse(localStorage.getItem(likeKey) || "{}"));
    } catch {
      setLiked({});
    }
  }, [likeKey]);
  const needLogin = () => {
    if (useAuthStore.getState().user) return false;
    openSubscribeGate("account");
    return true;
  };
  const toggleLike = () => {
    if (needLogin()) return;
    setLiked((prevLiked) => {
      const nextLiked = { ...prevLiked, [current.id]: !prevLiked[current.id] };
      if (!nextLiked[current.id]) delete nextLiked[current.id];
      try {
        if (likeKey) localStorage.setItem(likeKey, JSON.stringify(nextLiked));
      } catch {
        /* 저장 못 해도 화면에서는 반영 */
      }
      return nextLiked;
    });
  };
  const share = () => {
    if (needLogin()) return;
    const url = current.videoId ? `https://www.youtube.com/shorts/${current.videoId}` : window.location.href;
    openShare({ title: current.title, url });
  };

  const isLiked = Boolean(liked[current.id]);
  const likeCount = current.likeCount || 0;
  // 길이: 데이터의 seconds → 없으면 재생을 시작한 뒤 영상 길이
  const seconds = current.seconds || (playing && player.duration ? Math.round(player.duration) : 0);
  const meta = [current.match, seconds ? formatDuration(seconds) : ""].filter(Boolean).join(" · ");

  return (
    <div className="sport-shorts-detail">
      {/* 이전 */}
      <button
        type="button"
        className="ssd-nav ssd-nav--prev"
        onClick={() => go(prev, { autoplay: playing })}
        disabled={!prev}
        aria-label="이전 숏폼"
      >
        <Chevron dir="left" />
      </button>

      {/* 세로 카드 */}
      <article className={`ssd-card${playing ? " is-playing" : ""}${player.paused ? " is-paused" : ""}`}>
        {playing ? (
          <div className="ssd-media ssd-media--video" ref={player.hostRef} />
        ) : (
          <img className="ssd-media" src={current.thumb} alt="" />
        )}
        {/* 재생 중: 카드를 누르면 일시정지 / 다시 재생 */}
        {playing && (
          <button
            type="button"
            className="ssd-tap"
            onClick={player.togglePause}
            aria-label={player.paused ? `${current.title} 다시 재생` : `${current.title} 일시정지`}
          />
        )}
        <span className="ssd-shade" aria-hidden="true" />

        {/* 상단: Apple TV · MLS / 소리 */}
        <div className="ssd-top">
          <span className="ssd-brand">
            <span className="ssd-logo">
              <img src={`${ICON_BASE}logo_w.svg`} alt="Apple TV" />
            </span>
            MLS
          </span>
          <div className="ssd-top-actions">
            <button
              type="button"
              className="ssd-icon-btn ssd-sound"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "소리 켜기" : "소리 끄기"}
              aria-pressed={!muted}
            >
              <SoundIcon muted={muted} />
            </button>
            {/* [추가] 재생 · 일시정지 (작품 상세와 같은 버튼) */}
            {current.videoId && (
              <button
                type="button"
                className="ssd-ctrl-btn"
                data-gate="watch"
                onClick={() => (playing ? player.togglePause() : setPlaying(true))}
                aria-label={playing && !player.paused ? "일시정지" : "재생"}
                title={playing && !player.paused ? "일시정지" : "재생"}
              >
                {playing && !player.paused ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
                  </svg>
                )}
              </button>
            )}
            {/* [추가] 전체보기 (작품 상세와 같은 버튼 · 같은 재생 팝업) */}
            {current.videoId && (
              <button
                type="button"
                className="ssd-ctrl-btn"
                data-gate="watch"
                onClick={openFull}
                aria-label="전체 화면으로 재생"
                title="전체보기"
              >
                <span className="ssd-full-icon" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* 가운데 재생 (재생 전 · 일시정지 중) */}
        {current.videoId && (!playing || player.paused) && (
          <button
            type="button"
            className="ssd-play"
            data-gate="watch"
            onClick={() => (playing ? player.togglePause() : setPlaying(true))}
            aria-label={`${current.title} 재생`}
          >
            <img className="play-icon" src="/icons/play-b.svg" alt="" aria-hidden="true" />
          </button>
        )}
        {/* 재생 중: 마우스를 올리면 일시정지 표시 */}
        {playing && !player.paused && (
          <span className="ssd-play ssd-play--pause" aria-hidden="true">
            <PauseIcon />
          </span>
        )}

        {/* 오른쪽: 좋아요 · 공유 */}
        <div className="ssd-side">
          <button
            type="button"
            className={`ssd-icon-btn ssd-like${isLiked ? " is-on" : ""}`}
            onClick={toggleLike}
            aria-pressed={isLiked}
            aria-label="좋아요"
          >
            <LikeIcon on={isLiked} />
            <span className="ssd-count">
              {isLiked ? (likeCount + 1).toLocaleString("ko-KR") : formatCount(likeCount)}
            </span>
          </button>
          <button type="button" className="ssd-icon-btn ssd-share" onClick={share} aria-label="공유하기">
            <ShareIcon />
          </button>
        </div>

        {/* 하단: 팀 · 제목 · 경기 · 길이 */}
        <div className="ssd-card-info">
          {current.tag && <span className="ssd-tag">{current.tag}</span>}
          <p className="ssd-card-title">{current.title}</p>
          {meta && <span className="ssd-card-meta">{meta}</span>}
        </div>

        {/* [추가] 끝나면 다음 숏폼 안내 (5초 후 재생 · 지금 재생 · 취소) */}
        {showUpNext && (
          <AutoNext
            className="auto-next--inline ssd-auto-next"
            kind="다음 숏폼"
            title={next.title}
            image={next.thumb}
            onPlay={() => go(next, { autoplay: true })}
            onCancel={() => setEnded(false)}
          />
        )}

        {/* 진행 바 */}
        <span className="ssd-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${playing ? player.progress : 0})` }} />
        </span>
      </article>

      {/* [추가] 전체보기 재생 팝업 — 작품 상세와 같은 팝업 (닫기 · Esc · 뒤로가기) · 끝나면 다음 숏폼 안내 */}
      <VideoPopup
        open={Boolean(full)}
        onClose={() => {
          setFull(null);
          setFullEnded(false);
        }}
        label={full?.item.title || "숏폼"}
      >
        {full && (
          <WatchPlayer
            key={full.item.videoId}
            videoKey={full.item.videoId}
            startAt={full.startAt}
            title={full.item.title}
            onEnded={() => setFullEnded(true)}
          />
        )}
        {full && fullEnded && settings.autoplayRecommend && fullNext?.videoId && (
          <AutoNext
            kind="다음 숏폼"
            title={fullNext.title}
            image={fullNext.thumb}
            onPlay={() => {
              setFullEnded(false);
              setFull({ item: fullNext, startAt: 0 });
              onSelect(fullNext.id); // 팝업을 닫으면 상세도 그 숏폼
            }}
            onCancel={() => setFullEnded(false)}
          />
        )}
      </VideoPopup>

      {/* 오른쪽 정보 */}
      <div className="ssd-info">
        <h3 className="ssd-title">{current.title}</h3>
        {meta && <p className="ssd-meta">{meta}</p>}
        <p className="ssd-desc">
          {SHORTS_DESC[0]}
          <br />
          {SHORTS_DESC[1]}
        </p>
        <Link className="ssd-full-btn" to="/sport/replay">
          <img className="play-icon" src="/icons/play-b.svg" alt="" aria-hidden="true" />
          전체 경기 보기
        </Link>

        {upNext.length > 0 && (
          <div className="ssd-upnext">
            <p className="ssd-upnext-label">UP NEXT</p>
            <ul className="ssd-upnext-list" ref={upNextRef}>
              {upNext.map((item, i) => (
                <li key={item.id}>
                  <button type="button" className="ssd-upnext-item" onClick={() => go(item, { autoplay: playing })}>
                    <span className="ssd-upnext-thumb">
                      <img src={item.thumb} alt="" loading="lazy" />
                    </span>
                    <span className="ssd-upnext-text">
                      <span className="ssd-upnext-kind">
                        {i === 0 ? `다음 숏폼${settings.autoplayRecommend ? " · 자동 재생" : ""}` : "숏폼"}
                      </span>
                      <span className="ssd-upnext-title">{item.title}</span>
                    </span>
                    <span className="ssd-upnext-arrow">
                      <Chevron />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 다음 */}
      <button
        type="button"
        className="ssd-nav ssd-nav--next"
        onClick={() => go(next, { autoplay: playing })}
        disabled={!next}
        aria-label="다음 숏폼"
      >
        <Chevron />
      </button>
    </div>
  );
};

export default SportShortsDetail;
