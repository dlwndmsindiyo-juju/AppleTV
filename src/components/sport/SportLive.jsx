import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { useSportStore } from "../../store/useSportStore";
import { getMockLiveMatch, MOCK_LIVE_IDS } from "./liveMatchAdapter";
import { SPORT_TEAMS } from "../../data/sportTeams";

// =====================================================================
// 라이브 (시안: 영상 썸네일 위에 LIVE 배지 + 아래 스코어보드)
// [홈 엠블럼] 2  1회 44:00  0 [원정 엠블럼]  · 엠블럼 아래 팀 약칭 (MA · SD)
// - 경기: 진행 중인 실제 경기(liveMatches · TheSportsDB livescore)가 있으면 그 경기,
//         없으면 목업 라이브 경기(liveMatchAdapter 의 sample · l1 ~ l7) → 라이브 상세와 같은 경기
// - 배경: 영상 썸네일 (MLS 하이라이트 클립 liveClips → 없으면 TheSportsDB highlightList), 경기 순서대로
// - 카드 · 전체 보기 → 라이브 상세 (/sport/match/:id) · 로그인 전에는 구독 팝업
// =====================================================================

// 팀 뱃지 파일 (public/images/matches/{파일}.svg — 라이브 상세 SportLivePage 와 같은 목록)
const MATCH_BADGE_FILE = {
  atlanta: "atlanta", austin: "austin", cincinnati: "cincinnati", columbus: "columbus",
  dc: "DC", miami: "miami", minnesota: "minnesota", montreal: "montreal", nashville: "nashville",
  orlando: "orlando", "red-bulls": "redbull", "san-jose": "sanjose", seattle: "seattle",
  "st-louis": "st-louis", toronto: "toronto", vancouver: "vancouver",
};

// 엠블럼 아래 팀 약칭 (시안: MA · SD · AT)
const TEAM_CODE = {
  atlanta: "AT", charlotte: "CH", chicago: "CF", cincinnati: "CI", columbus: "CO", dc: "DC",
  miami: "MA", montreal: "MO", nashville: "NA", "new-england": "NE", nycfc: "NY", "red-bulls": "RB",
  orlando: "OR", philadelphia: "PH", toronto: "TO", austin: "AU", colorado: "CL", dallas: "DA",
  houston: "HO", "kansas-city": "KC", "la-galaxy": "LA", lafc: "LF", minnesota: "MN", portland: "PO",
  "salt-lake": "RS", "san-diego": "SD", "san-jose": "SJ", seattle: "SE", "st-louis": "SL", vancouver: "VA",
};

// 목록에 없는 팀(실제 경기): 이름 앞 두 단어의 첫 글자 (FC · CF · SC 제외), 한 단어면 앞 두 글자
const codeFromName = (name = "") => {
  const words = name.replace(/\b(FC|CF|SC|AFC)\b/gi, "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] || "").slice(0, 2).toUpperCase();
};

// 경기별 전반/후반 표시는 최초 1회 랜덤 결정하여 리렌더링 중 유지합니다.
// 실제 API에서 period/half 정보를 제공하면 해당 값을 우선합니다.
const randomPeriods = new Map();
const clockText = (match) => {
  const id = String(match.id);
  const supplied = String(match.period ?? match.half ?? "").toLowerCase();
  let period;
  if (["first", "1", "1h", "first_half", "전반"].includes(supplied)) period = "전반";
  else if (["second", "2", "2h", "second_half", "후반"].includes(supplied)) period = "후반";
  else {
    if (!randomPeriods.has(id)) randomPeriods.set(id, Math.random() < 0.5 ? "전반" : "후반");
    period = randomPeriods.get(id);
  }
  const minute = Number(match.minute);
  const displayMinute = Number.isFinite(minute) && match.minute != null
    ? (period === "후반" && minute > 45 ? minute - 45 : minute)
    : 0;
  return `${period} ${displayMinute}분`;
};

// 엠블럼은 public/images/matches/*.svg 만 사용 · 파일이 없는 팀은 null → 약자 원으로 표시
const badgeOf = (id) => (MATCH_BADGE_FILE[id] ? `/images/matches/${MATCH_BADGE_FILE[id]}.svg` : null);

// 실제 경기 팀 이름 → 구단 id (영문/한글 이름으로 찾기)
const norm = (v = "") => v.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
const teamIdByName = (name = "") => {
  const n = norm(name);
  if (!n) return null;
  const t = SPORT_TEAMS.find((team) => [team.enName, team.name, team.shortName].some((v) => norm(v) === n));
  return t?.id || null;
};

// 카드 한 장에 쓰는 모양으로 정리
const fromMock = (m) => {
  const home = m.teams[m.homeId];
  const away = m.teams[m.awayId];
  const side = (t) => ({
    name: t.name || t.shortName,
    crest: badgeOf(t.id),
    code: TEAM_CODE[t.id] || codeFromName(t.enName || t.name),
  });
  return { id: String(m.id), home: side(home), away: side(away), score: m.score, minute: m.minute, period: m.period ?? m.half };
};

const fromLive = (m) => {
  const side = (t = {}) => {
    const id = teamIdByName(t.name) || teamIdByName(t.shortName);
    return { name: t.name || t.shortName || "", crest: badgeOf(id), code: TEAM_CODE[id] || codeFromName(t.name || t.shortName) };
  };
  const sc = m.score?.fullTime || {};
  return { id: String(m.id), home: side(m.homeTeam), away: side(m.awayTeam), score: { home: sc.home ?? 0, away: sc.away ?? 0 }, minute: m.minute, period: m.period ?? m.half };
};

// 엠블럼 파일이 없거나 못 불러오면 약자 원으로 대체
const Crest = ({ team }) => {
  const [broken, setBroken] = useState(false);
  return team.crest && !broken ? (
    <img className="sport-lv-crest" src={team.crest} alt="" onError={() => setBroken(true)} />
  ) : (
    <span className="sport-lv-crest is-empty" aria-hidden="true">{team.code}</span>
  );
};

// hqdefault · sddefault 썸네일은 위아래 검은 띠(4:3)가 있어 잘라서 표시
const isLetterbox = (url = "") => /\/(hq|sd)default\.jpg/.test(url);

export default function SportLive() {
  const clips = useSportStore((state) => state.liveClips);
  const sdbVideos = useSportStore((state) => state.highlightList);
  const liveMatches = useSportStore((state) => state.liveMatches);
  const fetchLiveClips = useSportStore((state) => state.onFetchLiveClips);
  const fetchHighlightList = useSportStore((state) => state.onFetchHighlightList);
  useEffect(() => { fetchLiveClips(); fetchHighlightList(); }, [fetchLiveClips, fetchHighlightList]);

  // 배경 영상 썸네일 (경기 순서대로 하나씩)
  const thumbs = useMemo(
    () =>
      (clips.length > 0 ? clips : sdbVideos)
        .filter((v) => v.id?.videoId)
        .map((v) => v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${v.id.videoId}/hqdefault.jpg`),
    [clips, sdbVideos]
  );

  const cards = useMemo(() => {
    const matches = liveMatches?.length > 0
      ? liveMatches.map(fromLive)
      : MOCK_LIVE_IDS.map(getMockLiveMatch).filter(Boolean).map(fromMock);
    return matches.map((m, i) => ({ ...m, thumb: thumbs.length ? thumbs[i % thumbs.length] : "" }));
  }, [liveMatches, thumbs]);

  return (
    <section className="sport-live" id="sport-live" aria-labelledby="sport-live-title">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title" id="sport-live-title">라이브</h3>
          {cards.length > 0 && (
            <Link className="sport-more" to={`/sport/match/${cards[0].id}`}>
              전체 보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
            </Link>
          )}
        </div>

        {cards.length === 0 ? (
          <p className="sport-empty" role="status">진행 중인 경기가 없습니다</p>
        ) : (
          <Swiper
            className="sport-lv-swiper"
            modules={[Navigation]}
            navigation
            grabCursor
            slidesPerView="auto"
            spaceBetween={32}
            breakpoints={{ 0: { spaceBetween: 12 }, 768: { spaceBetween: 24 }, 1025: { spaceBetween: 32 } }}
          >
            {cards.map((card) => (
              <SwiperSlide key={card.id} className="sport-lv-slide">
                <Link
                  className="sport-lv-card"
                  to={`/sport/match/${card.id}`}
                  aria-label={`${card.home.name} ${card.score.home} 대 ${card.score.away} ${card.away.name} 라이브 시청`}
                >
                  {card.thumb && (
                    <img className={`sport-lv-thumb${isLetterbox(card.thumb) ? " is-letterbox" : ""}`} src={card.thumb} alt="" loading="lazy" />
                  )}
                  <span className="sport-lv-badge">
                    <img src="/icons/live/live-icon.svg" alt="" aria-hidden="true" />
                    LIVE
                  </span>
                  <span className="sport-lv-board" aria-hidden="true">
                    <span className="sport-lv-team">
                      <Crest team={card.home} />
                      <b>{card.home.code}</b>
                    </span>
                    <strong className="sport-lv-score">{card.score.home}</strong>
                    <span className="sport-lv-time">{clockText(card)}</span>
                    <strong className="sport-lv-score">{card.score.away}</strong>
                    <span className="sport-lv-team">
                      <Crest team={card.away} />
                      <b>{card.away.code}</b>
                    </span>
                  </span>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}
