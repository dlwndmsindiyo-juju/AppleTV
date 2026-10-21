import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useSportStore } from "../../store/useSportStore";
import { upcomingMatchesData } from "../../data/mockMatches";
import { SPORT_TEAMS } from "../../data/sportTeams";
import { decodeHtml } from "./sportUtils";
import SportHero from "./SportHero";

// =====================================================================
// 스포츠 상세 (하나의 컴포넌트로 3개 상세 사용)
//   /sport/replay      → 경기 다시보기 상세 (SportReplay "전체 보기" · 카드)
//   /sport/upcoming    → 예정된 경기 상세   (SportUpcoming "전체 보기" · 카드)
//   /sport/highlights  → 하이라이트 상세    (SportHighlights "전체 보기" · 카드)
//   ?id=영상ID(경기ID) 로 오른쪽 목록 중 선택된 항목을 지정 (없으면 첫 번째)
// 구조: 왼쪽 큰 화면(영상 플레이어 / 카운트다운) + 아래 정보, 오른쪽 목록
// =====================================================================

const MATCH_BG = "/images/matches/matches-bg.png";

// 예정 경기 카운트다운: 실제 경기 시간 대신 상세에 들어올 때마다 9시간부터 줄어들게 (시연용)
const COUNTDOWN_START_MS = 9 * 60 * 60 * 1000;

// 영문 구단명 → 한글 짧은 이름 (data/sportTeams.js), 없으면 원래 이름
const teamLabel = (team) => {
  if (!team) return "";
  const found = SPORT_TEAMS.find((t) => t.enName === team.name || t.enName === team.shortName);
  return found?.shortName || team.shortName || team.name || "";
};

// 2026.09.19
const dotDate = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

// 6월 13일 · 오전 9:30 / 6월 13일 토요일 · 오전 9:30
const kickoffLabel = (value, withWeekday = false) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", ...(withWeekday && { weekday: "long" }) });
  const time = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} · ${time}`;
};

const thumbOf = (video) =>
  video?.snippet?.thumbnails?.high?.url || video?.snippet?.thumbnails?.medium?.url ||
  (video?.id?.videoId ? `https://i.ytimg.com/vi/${video.id.videoId}/hqdefault.jpg` : "");

// ---------------------------------------------------------------------
// 상세 종류별 설정: 제목 · 데이터 불러오기 · 목록 항목 만들기
// 항목 공통 모양: { id, title, meta, thumb, videoId?, kickoff?, info: { title, desc, meta } }
// ---------------------------------------------------------------------
const DETAIL_CONFIG = {
  // 경기 다시보기: TheSportsDB 최신 경기 하이라이트
  replay: {
    title: "경기 다시보기",
    empty: "다시볼 경기가 없습니다.",
    buildItems: ({ sdbPool }) =>
      (sdbPool || []).map((video) => {
        const ev = video.event || {};
        const title = decodeHtml(video.snippet?.title);
        const hasScore = ev.homeScore != null && ev.awayScore != null;
        return {
          id: video.id.videoId,
          videoId: video.id.videoId,
          title,
          meta: "영상 다시보기",
          thumb: thumbOf(video),
          info: {
            title: [ev.home && ev.away ? `${ev.home} vs ${ev.away}` : title, dotDate(ev.date)].filter(Boolean).join(", "),
            desc: [video.snippet?.channelTitle, hasScore ? `최종 스코어 ${ev.homeScore} : ${ev.awayScore}` : ""].filter(Boolean).join(" · "),
            meta: "경기 다시보기",
          },
        };
      }),
  },

  // 하이라이트: LIVE 하이라이트(TheSportsDB) + 카테고리 영상(YouTube)
  highlights: {
    title: "하이라이트",
    empty: "하이라이트 영상이 없습니다.",
    buildItems: ({ highlightList, categories }) => {
      const seen = new Set();
      const rows = [
        ...(categories || []).filter((c) => c.video?.id?.videoId).map((c) => ({ video: c.video, label: c.label })),
        ...(highlightList || []).map((video) => ({ video, label: "하이라이트" })),
      ];
      return rows
        .filter(({ video }) => !seen.has(video.id.videoId) && seen.add(video.id.videoId))
        .map(({ video, label }) => {
          const sn = video.snippet || {};
          const meta = [label, video.durationText].filter(Boolean).join(" · ");
          const title = decodeHtml(sn.title);
          return {
            id: video.id.videoId,
            videoId: video.id.videoId,
            title,
            meta,
            thumb: thumbOf(video),
            info: {
              title: [sn.channelTitle, dotDate(sn.publishedAt || video.event?.date)].filter(Boolean).join(", ") || title,
              desc: decodeHtml(sn.description) || title,
              meta,
            },
          };
        });
    },
  },

  // 예정된 경기: mockMatches 예정 경기 (카운트다운)
  upcoming: {
    title: "예정된 경기",
    empty: "예정된 경기가 없습니다.",
    buildItems: () =>
      (upcomingMatchesData || []).map((match) => {
        const name = `${teamLabel(match.homeTeam)} VS ${teamLabel(match.awayTeam)}`;
        const kickoff = match.utcDate || match.date || null;
        return {
          id: String(match.id),
          title: name,
          meta: kickoffLabel(kickoff) || match.status || "",
          thumb: match.thumb || MATCH_BG,
          badge: "예정",
          kickoff,
          match,
          info: { label: "예정 경기", title: kickoffLabel(kickoff, true) || match.status || "", desc: name },
        };
      }),
  },
};

// 남은 시간 (일 · 시 · 분 · 초)
const useCountdown = (target) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const end = target ? new Date(target).getTime() : NaN;
  const left = Number.isNaN(end) ? 0 : Math.max(0, end - now);
  const sec = Math.floor(left / 1000);
  return {
    done: left === 0,
    parts: [
      { label: "DAYS", value: String(Math.floor(sec / 86400)) },
      { label: "HOURS", value: String(Math.floor((sec % 86400) / 3600)).padStart(2, "0") },
      { label: "MINUTES", value: String(Math.floor((sec % 3600) / 60)).padStart(2, "0") },
      { label: "SECONDS", value: String(sec % 60).padStart(2, "0") },
    ],
  };
};

// 왼쪽 큰 화면 - 예정 경기 카운트다운
const DetailCountdown = ({ item, target }) => {
  const { done, parts } = useCountdown(target);
  return (
    <div className="sport-detail-countdown">
      <img className="sport-detail-countdown-bg" src={item.thumb} alt="" aria-hidden="true" />
      <div className="sport-detail-countdown-body">
        <p className="sport-detail-countdown-label">{done ? "MATCH IS STARTING" : "MATCH STARTS IN"}</p>
        <ol className="sport-detail-countdown-time">
          {parts.map((part, i) => (
            <li key={part.label}>
              {i > 0 && <span className="sport-detail-countdown-colon" aria-hidden="true">:</span>}
              <span className="sport-detail-countdown-unit">
                <strong>{part.value}</strong>
                <small>{part.label}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

// 왼쪽 큰 화면 - 영상 플레이어 (YouTube)
const DetailPlayer = ({ item }) => (
  <div className="sport-detail-player">
    <iframe
      key={item.videoId}
      src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&rel=0&playsinline=1`}
      title={item.title}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  </div>
);

const SportDetail = () => {
  const { type } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const config = DETAIL_CONFIG[type];

  // 상세에 들어온 시점 + 9시간 (목록에서 다른 경기를 눌러도 이어서 줄어들고, 다시 들어오면 9시간부터)
  const [countdownTarget, setCountdownTarget] = useState(() => Date.now() + COUNTDOWN_START_MS);
  // 다른 상세(/sport/replay 등)에서 예정 경기 상세로 바로 넘어와도 9시간부터 다시 시작
  useEffect(() => { setCountdownTarget(Date.now() + COUNTDOWN_START_MS); }, [type]);

  const sdbPool = useSportStore((state) => state.sportsDbHighlights);
  const highlightList = useSportStore((state) => state.highlightList);
  const categories = useSportStore((state) => state.highlightCategories);
  const finishedMatches = useSportStore((state) => state.finishedMatches);
  const fetchSportsDb = useSportStore((state) => state.onFetchSportsDbHighlights);
  const fetchHighlightList = useSportStore((state) => state.onFetchHighlightList);
  const fetchCategories = useSportStore((state) => state.onFetchHighlightCategories);

  // 상세 종류에 필요한 데이터만 불러오기
  const latestMatch = finishedMatches?.[0];
  useEffect(() => {
    if (type === "replay") fetchSportsDb();
    if (type === "highlights") {
      let cancelled = false;
      (async () => {
        await fetchHighlightList();
        if (!cancelled) fetchCategories(latestMatch);
      })();
      return () => { cancelled = true; };
    }
    return undefined;
  }, [type, fetchSportsDb, fetchHighlightList, fetchCategories, latestMatch]);

  const items = useMemo(
    () => (config ? config.buildItems({ sdbPool, highlightList, categories }) : []),
    [config, sdbPool, highlightList, categories]
  );

  // 페이지 이동 시 맨 위로
  useEffect(() => { window.scrollTo(0, 0); }, [type]);

  if (!config) return <Navigate to="/sport" replace />;

  const selectedId = searchParams.get("id");
  const current = items.find((item) => item.id === selectedId) || items[0];
  const select = (id) => setSearchParams({ id }, { replace: true });

  return (
    <main className={`sport-home sport-detail-page sport-detail-page--${type}`}>
      <SportHero />

      <section className={`sport-detail sport-detail--${type}`} aria-labelledby="sport-detail-title">
        <div className="inner">
          <h2 className="sport-sr-only" id="sport-detail-title">{config.title}</h2>

          {!current ? (
            <p className="sport-empty">{config.empty}</p>
          ) : (
            <div className="sport-detail-layout">
              {/* 왼쪽: 큰 화면 + 정보 */}
              <article className="sport-detail-stage">
                {type === "upcoming" ? <DetailCountdown item={current} target={countdownTarget} /> : <DetailPlayer item={current} />}

                <div className="sport-detail-info">
                  <p className="sport-detail-info-title">
                    {current.info.label && <span className="sport-detail-info-label">{current.info.label}</span>}
                    {current.info.title}
                  </p>
                  {current.info.desc && <p className="sport-detail-info-desc">{current.info.desc}</p>}
                  {current.info.meta && (
                    <span className="sport-detail-info-meta"><span aria-hidden="true">▶</span> {current.info.meta}</span>
                  )}
                </div>
              </article>

              {/* 오른쪽: 목록 */}
              <ul className="sport-detail-list" aria-label={`${config.title} 목록`}>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`sport-detail-item${item.id === current.id ? " is-active" : ""}`}
                      aria-current={item.id === current.id ? "true" : undefined}
                      onClick={() => select(item.id)}
                    >
                      <span className="sport-detail-thumb">
                        {item.thumb && <img src={item.thumb} alt="" loading="lazy" />}
                        {item.badge ? (
                          <span className="sport-detail-badge">{item.badge}</span>
                        ) : (
                          <span className="sport-detail-play" aria-hidden="true">▶</span>
                        )}
                      </span>
                      <span className="sport-detail-text">
                        <span className="sport-detail-title">{item.title}</span>
                        {item.meta && (
                          <span className="sport-detail-meta">
                            {!item.badge && <span aria-hidden="true">▶ </span>}
                            {item.meta}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link className="sport-detail-back" to="/sport">← 스포츠 홈으로</Link>
        </div>
      </section>
    </main>
  );
};

export default SportDetail;
