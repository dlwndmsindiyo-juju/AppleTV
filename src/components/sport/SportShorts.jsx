import { openShare } from "../../utils/share"; // [추가] 공유 팝업
import { useAuthStore } from "../../store/useAuthStore"; // [추가] 로그인 전 좋아요 막기
import { openSubscribeGate } from "../../utils/subscribeGate";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { SPORT_SHORTS } from "../../data/sportShorts";
import { usePlayableIds } from "../../utils/youtubePlayable"; // [추가] 연령 제한 · 퍼가기 금지 영상 빼기 (데이터는 그대로)

import "swiper/css";
import SportSectionHead from "./SportSectionHead"; // [정리] 섹션 머리 공용
import VideoPopup from "../common/VideoPopup"; // [추가] 재생: 전체 화면 팝업 (다른 재생 버튼과 같은 방식)
import WatchPlayer from "../common/WatchPlayer"; // [추가] OTT · 경기 시청과 같은 플레이어

// =====================================================================
// 숏폼 (세로 카드 슬라이드)
// - 데이터: data/sportShorts.js (정해진 경기 영상만 · 썸네일은 public/images/sport/shorts/)
// - 가운데(활성) 카드만 밝게, 양옆 카드는 어둡게 / 좌우 끝 카드는 이너 밖으로 잘림
// - 카드 안: Apple TV · MLS 배지, 소리, 재생, 좋아요 · 공유, 팀 · 제목 · 경기 · 길이, 진행 바
// - [수정] 재생 버튼을 누르면 전체 화면 팝업에서 바로 소리와 함께 재생 (VideoPopup + WatchPlayer · 다른 재생 버튼과 통일)
// - 아이콘: public/icons/shorts/ (logo_w.svg) · 좋아요/공유/소리는 색을 바꿀 수 있게 SVG 를 그대로 옮겨 씀
// =====================================================================

const ICON_BASE = `${import.meta.env.BASE_URL}icons/shorts/`;

// 영상 길이: 24 → 0:24
const formatDuration = (sec = 0) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

// 좋아요 수: 12.8만 / 3.4천 / 512
const formatCount = (n) => {
  if (!n) return "좋아요";
  const trim = (v) => String(Number(v.toFixed(1)));
  if (n >= 10000) return `${trim(n / 10000)}만`;
  if (n >= 1000) return `${trim(n / 1000)}천`;
  return String(n);
};

// YouTube 플레이어에 명령 보내기 (enablejsapi=1 필요)
const sendPlayer = (iframe, func) => {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
};

// ----- 아이콘 (보내주신 SVG 그대로) -----
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

const SportShorts = ({ title = "숏폼" }) => {
  const [playingId, setPlayingId] = useState(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState({});
  const [fullItem, setFullItem] = useState(null); // [추가] 전체 화면으로 재생 중인 숏폼
  const frames = useRef({});

  // 카드에 쓸 값 정리 (경기 · 길이)
  // [수정] 재생할 수 없는 영상(연령 제한 · 퍼가기 금지)은 카드에서 뺌 — data/sportShorts.js 는 건드리지 않음
  const playable = usePlayableIds(SPORT_SHORTS.map((v) => v.videoId).filter(Boolean));
  const items = useMemo(() => SPORT_SHORTS
    .filter((v) => !v.videoId || playable.has(v.videoId))
    .map((v) => ({
      ...v,
      meta: [v.match, v.seconds ? formatDuration(v.seconds) : ""].filter(Boolean).join(" · "),
      seconds: v.seconds || 30,
      likeCount: v.likeCount || 0,
    })), [playable]);

  // 소리 켜기 / 끄기 (재생 중인 영상에 바로 적용)
  const toggleSound = (id) => {
    const next = !muted;
    setMuted(next);
    if (playingId === id) sendPlayer(frames.current[id], next ? "mute" : "unMute");
  };

  // [수정] 로그인 전에는 좋아요를 막고 로그인 안내 팝업
  // [추가] 로그인 후 누른 좋아요는 계정마다 이 브라우저에 저장 (새로고침해도 유지) · 누르면 숫자 +1
  const uid = useAuthStore((s) => s.user?.uid);
  const likeKey = uid ? `shortLikes:${uid}` : null;
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
  const toggleLike = (id) => {
    if (!useAuthStore.getState().user) {
      openSubscribeGate("account");
      return;
    }
    setLiked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      try {
        if (likeKey) localStorage.setItem(likeKey, JSON.stringify(next));
      } catch {
        /* 저장 못 해도 화면에서는 반영 */
      }
      return next;
    });
  };

  // [수정] 공유 팝업 (components/common/ShareSheet.jsx) · [추가] 로그인 전에는 막고 로그인 안내 팝업
  const share = (item) => {
    if (!useAuthStore.getState().user) {
      openSubscribeGate("account");
      return;
    }
    const url = item.videoId ? `https://www.youtube.com/shorts/${item.videoId}` : window.location.href;
    openShare({ title: item.title, url });
  };

  return (
    <section className="sport-shorts sport-shortform" aria-labelledby="sport-shortform-title">
      <div className="inner">
        <SportSectionHead title={title} titleId="sport-shortform-title" to="/sport/shorts" />

        {items.length === 0 ? (
          <p className="sport-empty">숏폼 영상이 없습니다.</p>
        ) : (
          <Swiper
            className="sport-sf-swiper"
            slidesPerView="auto"
            spaceBetween={22}
            // centeredSlides
            // loop={items.length >= 6}
            slideToClickedSlide
            // initialSlide={Math.min(3, items.length - 1)}
            onSlideChange={() => setPlayingId(null)}
          >
            {items.map((item) => {
              const playing = playingId === item.id;
              const isLiked = !!liked[item.id];
              return (
                <SwiperSlide key={item.id} className="sport-sf-slide">
                  <article className={`sport-sf-card${playing ? " is-playing" : ""}`}>
                    {/* 썸네일 / 재생 중이면 영상 */}
                    {playing ? (
                      <iframe
                        ref={(el) => { frames.current[item.id] = el; }}
                        className="sport-sf-media"
                        src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1&playlist=${item.videoId}&playsinline=1&rel=0&enablejsapi=1`}
                        title={item.title}
                        allow="autoplay; encrypted-media"
                      />
                    ) : (
                      <img className="sport-sf-media" src={item.thumb} alt="" loading="lazy" />
                    )}
                    <span className="sport-sf-shade" aria-hidden="true" />

                    {/* 상단: Apple TV · MLS / 소리 */}
                    <div className="sport-sf-top">
                      <span className="sport-sf-brand">
                        <span className="sport-sf-logo">
                          <img src={`${ICON_BASE}logo_w.svg`} alt="Apple TV" />
                        </span>
                        MLS
                      </span>
                      <button
                        type="button"
                        className="sport-sf-icon-btn sport-sf-sound"
                        onClick={() => toggleSound(item.id)}
                        aria-label={muted ? "소리 켜기" : "소리 끄기"}
                        aria-pressed={!muted}
                      >
                        <SoundIcon muted={muted} />
                      </button>
                    </div>

                    {/* 가운데 재생 / 일시정지 (영상 id 가 있을 때만) */}
                    {item.videoId && (
                    <button
                      type="button"
                      className="sport-sf-play"
                      onClick={() => { setPlayingId(null); setFullItem(item); }} // [수정] 바로 전체 화면 재생
                      aria-label={playing ? `${item.title} 정지` : `${item.title} 재생`}
                    >
                      {playing ? <span aria-hidden="true">❚❚</span> : <img className="play-icon" src="/icons/play-b.svg" alt="" aria-hidden="true" />}
                    </button>
                    )}

                    {/* 오른쪽: 좋아요 · 공유 */}
                    <div className="sport-sf-side">
                      <button
                        type="button"
                        className={`sport-sf-icon-btn sport-sf-like${isLiked ? " is-on" : ""}`}
                        onClick={() => toggleLike(item.id)}
                        aria-pressed={isLiked}
                        aria-label="좋아요"
                      >
                        <LikeIcon on={isLiked} />
                        {/* [수정] 누르면 숫자가 바로 +1 (큰 숫자도 1 단위로 보이게: 좋아요를 누른 카드는 정확한 숫자 · 예 5,201) */}
                        <span className="sport-sf-count" key={isLiked ? "on" : "off"}>
                          {isLiked ? (item.likeCount + 1).toLocaleString("ko-KR") : formatCount(item.likeCount)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="sport-sf-icon-btn sport-sf-share"
                        onClick={() => share(item)}
                        aria-label="공유하기"
                      >
                        <ShareIcon />
                      </button>
                    </div>

                    {/* 하단: 팀 · 제목 · 경기 · 길이 */}
                    <div className="sport-sf-info">
                      {item.tag && <span className="sport-sf-tag">{item.tag}</span>}
                      <h4 className="sport-sf-title">{item.title}</h4>
                      {item.meta && <span className="sport-sf-meta">{item.meta}</span>}
                    </div>

                    {/* 진행 바 (재생 중일 때 영상 길이만큼 채워짐) */}
                    <span className="sport-sf-progress" aria-hidden="true">
                      <span
                        key={playing ? `${item.id}-on` : item.id}
                        style={playing ? { animationDuration: `${item.seconds}s` } : undefined}
                      />
                    </span>
                  </article>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}
      </div>

      {/* [추가] 전체 화면 재생 팝업 ("← 뒤로" · Esc · 브라우저 뒤로가기로 닫기) */}
      <VideoPopup open={!!fullItem} onClose={() => setFullItem(null)} label={fullItem?.title || "숏폼"}>
        {fullItem && <WatchPlayer videoKey={fullItem.videoId} title={fullItem.title} />}
      </VideoPopup>
    </section>
  );
};

export default SportShorts;
