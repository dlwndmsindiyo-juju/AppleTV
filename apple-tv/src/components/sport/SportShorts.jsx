import React, { useEffect, useMemo, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { useSportStore } from "../../store/useSportStore";
import { SPORT_TEAMS } from "../../data/sportTeams";
import { decodeHtml } from "./sportUtils";

import "swiper/css";

// =====================================================================
// 숏폼 (세로 카드 슬라이드)
// - 데이터: YouTube #shorts 검색 → 3분 이하 (useSportStore.onFetchShorts, 6시간 캐시)
// - 가운데(활성) 카드만 밝게, 양옆 카드는 어둡게 / 좌우 끝 카드는 이너 밖으로 잘림
// - 카드 안: Apple TV · MLS 배지, 소리, 재생, 좋아요 · 공유, 팀 · 제목 · 경기 · 길이, 진행 바
// - 재생 버튼을 누르면 카드 안에서 바로 재생 (기본 음소거, 소리 버튼으로 켜고 끄기)
// - 아이콘: public/icons/shorts/ (logo_w.svg) · 좋아요/공유/소리는 색을 바꿀 수 있게 SVG 를 그대로 옮겨 씀
// =====================================================================

const ICON_BASE = `${import.meta.env.BASE_URL}icons/shorts/`;

// MLS 구단 약칭 (data/sportTeams.js 의 id 기준)
const TEAM_ABBR = {
  atlanta: "ATL", charlotte: "CLT", chicago: "CHI", cincinnati: "CIN", columbus: "CLB",
  dc: "DC", miami: "MIA", montreal: "MTL", nashville: "NSH", "new-england": "NE",
  nycfc: "NYC", "red-bulls": "RBNY", orlando: "ORL", philadelphia: "PHI", toronto: "TOR",
  austin: "ATX", colorado: "COL", dallas: "DAL", houston: "HOU", "kansas-city": "SKC",
  "la-galaxy": "LA", lafc: "LAFC", minnesota: "MIN", portland: "POR", "salt-lake": "RSL",
  "san-diego": "SD", "san-jose": "SJ", seattle: "SEA", "st-louis": "STL", vancouver: "VAN",
};

// 제목에 나오는 구단 찾기 (한글 짧은 이름 / 영문 이름, 나오는 순서대로 최대 2팀)
const findTeams = (text = "") => {
  const lower = text.toLowerCase();
  return SPORT_TEAMS
    .map((team) => {
      const idx = [team.shortName, team.name, team.enName]
        .filter(Boolean)
        .map((n) => lower.indexOf(n.toLowerCase()))
        .filter((i) => i >= 0);
      return idx.length ? { team, at: Math.min(...idx) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at)
    .slice(0, 2)
    .map(({ team }) => team);
};

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
  const shortsVideos = useSportStore((state) => state.shortsVideos);
  const fetchShorts = useSportStore((state) => state.onFetchShorts);
  useEffect(() => { fetchShorts(); }, [fetchShorts]);

  const [playingId, setPlayingId] = useState(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState({});
  const frames = useRef({});

  // 카드에 쓸 값 정리 (팀 약칭 · 경기 · 길이 · 좋아요)
  const items = useMemo(() => (shortsVideos || [])
    .filter((v) => v?.id?.videoId)
    .map((v) => {
      const sn = v.snippet || {};
      const videoTitle = decodeHtml(sn.title);
      const teams = findTeams(videoTitle);
      const match = teams.length === 2
        ? `${teams[0].shortName} vs. ${teams[1].shortName}`
        : decodeHtml(sn.channelTitle);
      return {
        id: v.id.videoId,
        title: videoTitle,
        tag: teams[0] ? TEAM_ABBR[teams[0].id] || teams[0].shortName : decodeHtml(sn.channelTitle),
        meta: [match, v.durationText].filter(Boolean).join(" · "),
        seconds: Number.isFinite(v.seconds) ? v.seconds : 30,
        likeCount: v.likeCount || 0,
        thumb: sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${v.id.videoId}/hqdefault.jpg`,
      };
    }), [shortsVideos]);

  // 소리 켜기 / 끄기 (재생 중인 영상에 바로 적용)
  const toggleSound = (id) => {
    const next = !muted;
    setMuted(next);
    if (playingId === id) sendPlayer(frames.current[id], next ? "mute" : "unMute");
  };

  const toggleLike = (id) => setLiked((prev) => ({ ...prev, [id]: !prev[id] }));

  const share = async (item) => {
    const url = `https://www.youtube.com/shorts/${item.id}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url });
      else {
        await navigator.clipboard.writeText(url);
        alert("링크가 복사되었습니다.");
      }
    } catch { /* 공유 취소 무시 */ }
  };

  return (
    <section className="sport-shorts sport-shortform" aria-labelledby="sport-shortform-title">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title" id="sport-shortform-title">{title}</h3>
          <a className="sport-more" href="https://www.youtube.com/@MLS/shorts" target="_blank" rel="noreferrer">
            전체 보기 <span aria-hidden="true">→</span>
          </a>
        </div>

        {items.length === 0 ? (
          <p className="sport-empty">숏폼 영상이 없습니다.</p>
        ) : (
          <Swiper
            className="sport-sf-swiper"
            slidesPerView="auto"
            spaceBetween={22}
            centeredSlides
            loop={items.length >= 6}
            slideToClickedSlide
            initialSlide={Math.min(3, items.length - 1)}
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
                        src={`https://www.youtube.com/embed/${item.id}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&loop=1&playlist=${item.id}&playsinline=1&rel=0&enablejsapi=1`}
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

                    {/* 가운데 재생 / 일시정지 */}
                    <button
                      type="button"
                      className="sport-sf-play"
                      onClick={() => setPlayingId(playing ? null : item.id)}
                      aria-label={playing ? `${item.title} 정지` : `${item.title} 재생`}
                    >
                      <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
                    </button>

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
                        <span className="sport-sf-count">{formatCount(item.likeCount + (isLiked ? 1 : 0))}</span>
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
    </section>
  );
};

export default SportShorts;
