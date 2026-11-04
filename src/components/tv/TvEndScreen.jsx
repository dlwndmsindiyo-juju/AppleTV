import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getTeamById } from "../../data/sportTeams";
import { TV_REPLAY_MATCHES } from "../../data/tvReplayMatches";
import { TV_SPORT_BG } from "../../data/tvSportData";
import TeamBadge from "../sport/TeamBadge";
import { findNext } from "./tvFocus";
import { sportSummary, cleanText } from "./tvDetailItems";
import { TvActionButtons, PlayIcon, PlusIcon, TextIcon, useInterest } from "./TvActions"; // [정리] 상세 화면과 같은 버튼
import { useAutoCountdown } from "../common/AutoNext"; // [추가] 5초 뒤 다음 영상

// TV 영상 끝 화면 (시안: 10 · 처음부터 보기) — 영상을 끝까지 보면 TvPlayer 가 보여줌 · 스타일: TV.scss (.tv-end)
// - 왼쪽 위: 시청한 영상 211 × 118 + 아래 제목 (Label/default-B · Light/0)
// - 제목 "처음부터 보기" Display/XL · Light/0 / 아래 "MLS · 경기 하이라이트" Display/M · Light/500
// - 오른쪽 위 버튼 3개 (142 × 80 · 패딩 18 56): 시청하기 · 관심 경기 · 경기정보
//   · 선택된(포커스) 버튼은 Primary, 나머지 Dark/300 · 버튼 아래 글자 SF Pro Medium 23 / 36 Dark/200 (선택: Light/0)
// - 아래: 경기 다시보기 · 하이라이트 (다른 TV 섹션과 같은 제목 · 카드 크기 · 글자)
// - 1920 × 1080 기준으로 그리고 창 크기에 맞춰 비율대로 줄임 · 리모컨 방향키로 이동

const TV_W = 1920;
const TV_H = 1080;
// [수정] 화면 전체를 채움 (TV 미리보기와 같은 방식)
// - 1920 × 1080 이 다 들어가는 비율로 글자 · 버튼 크기를 맞추고, 남는 쪽(가로 또는 세로)은 화면을 늘려서 채움
const useStageSize = () => {
  const [size, setSize] = useState({ scale: 1, width: TV_W, height: TV_H });
  useLayoutEffect(() => {
    const update = () => {
      const scale = Math.min(window.innerWidth / TV_W, window.innerHeight / TV_H);
      setSize({ scale, width: window.innerWidth / scale, height: window.innerHeight / scale });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
};

export const ReplayCard = ({ match, onPlay }) => {
  const home = getTeamById(match.homeId);
  const away = getTeamById(match.awayId);
  const [h, a] = match.score;
  return (
    <button type="button" className="tv-end-replay" onClick={() => onPlay(match)} aria-label={`${match.home} ${h} 대 ${a} ${match.away} 다시보기`}>
      <span className="tv-end-replay-bg" style={{ backgroundImage: `url(${TV_SPORT_BG})` }} aria-hidden="true" />
      <img className="tv-end-replay-logo" src="/icons/shorts/logo_w.svg" alt="" aria-hidden="true" />
      <span className="tv-end-replay-line" aria-hidden="true" />
      <span className={`tv-end-replay-team is-home${h < a ? " is-lose" : ""}`}>
        <TeamBadge src={home?.badge} fallback={home?.logo} label={match.home} />
        <strong>{h}</strong>
        <span>{match.home}</span>
      </span>
      <span className="tv-end-replay-date">{match.date}</span>
      <span className={`tv-end-replay-team is-away${a < h ? " is-lose" : ""}`}>
        <TeamBadge src={away?.badge} fallback={away?.logo} label={match.away} />
        <strong>{a}</strong>
        <span>{match.away}</span>
      </span>
    </button>
  );
};

// video: { id, title, image, label, desc } · related: 같은 모양 배열 (하이라이트 줄)
// onReplay: 처음부터 다시 · onPlay(video): 다른 영상 재생 · onPlayMatch(match): 경기 다시보기 카드
// [추가] upNext: 자동 재생할 다음 영상 (계정 설정 "추천 항목 재생" · 없으면 안내 없음) · onCancelNext: "취소"
export const TvEndScreen = ({ video, related = [], onReplay, onPlay, onPlayMatch, notice = "", upNext = null, onCancelNext }) => {
  const { scale, width, height } = useStageSize();
  const rootRef = useRef(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const nextLeft = useAutoCountdown(Boolean(upNext), () => upNext && onPlay(upNext), undefined, upNext?.id); // [추가]
  const { saved, toggle: toggleInterest } = useInterest(video.id, {
    videoId: video.id, title: video.title, image: video.image, label: video.label, prefix: video.prefix, desc: video.desc,
  });

  useEffect(() => {
    setInfoOpen(false);
  }, [video.id]);

  // 리모컨 방향키 (끝 화면 안에서만)
  const handleKeyDown = (e) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const next = findNext(rootRef.current, document.activeElement, e.key);
    next?.focus({ preventScroll: true });
    next?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  };

  const actions = [
    { key: "watch", label: "시청하기", onClick: onReplay, icon: <PlayIcon /> },
    { key: "interest", label: "관심 경기", onClick: toggleInterest, pressed: saved, icon: <PlusIcon on={saved} /> },
    { key: "info", label: "경기 정보", onClick: () => setInfoOpen((v) => !v), pressed: infoOpen, icon: <TextIcon>경기정보</TextIcon> },
  ];

  const others = related.filter((v) => v.id !== video.id);

  return (
    <div className="tv-end" onKeyDown={handleKeyDown}>
      <div
        className="tv-end-stage"
        ref={rootRef}
        style={{ width, height, transform: `scale(${scale})` }}
      >
        <div className="tv-end-bg" style={{ "--tv-end-bg": `url(${TV_SPORT_BG})` }} aria-hidden="true" />

        {/* [수정] <header> 대신 <div> — 웹 헤더 스타일(App.scss header: 고정 · 배경 · 높이)이 덮어써서 위쪽에 어두운 띠가 생기던 문제 */}
        <div className="tv-end-head">
          <figure className="tv-end-watched">
            {video.image ? <img src={video.image} alt="" /> : <span className="tv-end-watched-empty" />}
            <figcaption>{video.title}</figcaption>
          </figure>

          <div className="tv-end-title">
            <h1>처음부터 보기</h1>
            <p>{video.prefix ?? "MLS"} · {video.label || "경기 하이라이트"}</p>
          </div>

          {/* 열리면 "시청하기" 에 포커스 (시안: 시청하기가 선택된 상태) */}
          <TvActionButtons actions={actions} focusOn={video.id} />

          {/* [추가] 5초 뒤 다음 영상 (계정 설정 "추천 항목 재생") · 취소하면 이 화면에 머묾 */}
          {upNext && (
            <div className="tv-end-next" role="status" aria-live="polite">
              <span className="tv-end-next-text">
                <span className="tv-end-next-kind">다음 영상 · {Math.max(0, nextLeft)}초 후 재생</span>
                <strong className="tv-end-next-title">{upNext.title}</strong>
              </span>
              <button type="button" className="tv-end-next-cancel" onClick={onCancelNext}>
                취소
              </button>
            </div>
          )}

          {/* 경기정보: 영상 설명 */}
          {infoOpen && (
            <div className="tv-end-info" role="note">
              <strong>{video.title}</strong>
              <p>{video.prefix === "영화" || video.prefix === "시리즈" ? video.desc || "작품 정보가 없습니다." : sportSummary(video)}</p>
            </div>
          )}
        </div>

        <div className="tv-end-body">
          <section className="tv-end-row">
            <h2 className="tv-end-row-title">경기 다시보기</h2>
            <div className="tv-end-track">
              {TV_REPLAY_MATCHES.map((m) => (
                <ReplayCard key={m.id} match={m} onPlay={onPlayMatch} />
              ))}
            </div>
          </section>

          {others.length > 0 && (
            <section className="tv-end-row">
              <h2 className="tv-end-row-title">하이라이트</h2>
              <div className="tv-end-track">
                {others.map((item) => (
                  <button type="button" key={item.id} className="tv-team-card" onClick={() => onPlay(item)}>
                    {item.image && <img className="tv-team-thumb" src={item.image} alt="" loading="lazy" />}
                    <span className="tv-team-card-text">
                      <strong className="tv-team-card-title">{item.title}</strong>
                      {cleanText(item.desc) && <span className="tv-team-card-desc">{cleanText(item.desc)}</span>}
                      <span className="tv-team-card-meta">
                        <img src="/icons/play-w.svg" alt="" aria-hidden="true" />
                        {item.meta || item.label}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {notice && <p className="tv-end-notice" role="status">{notice}</p>}
      </div>
    </div>
  );
};

export default TvEndScreen;
