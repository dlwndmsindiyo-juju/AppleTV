import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { useSportStore } from "../../store/useSportStore";
import { getMockLiveMatch, MOCK_LIVE_IDS } from "./liveMatchAdapter";

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

// 시간 표기 (시안: "1회 44:00" — 45분까지 1회, 그 뒤 2회)
const PERIOD_LABEL = ["1회", "2회"];
const clockText = (minute) => {
  if (!minute && minute !== 0) return "LIVE";
  const m = Number(minute);
  return `${PERIOD_LABEL[m > 45 ? 1 : 0]} ${String(m).padStart(2, "0")}:00`;
};

// 카드 한 장에 쓰는 모양으로 정리
const fromMock = (m) => {
  const home = m.teams[m.homeId];
  const away = m.teams[m.awayId];
  const side = (t) => ({
    name: t.name || t.shortName,
    crest: MATCH_BADGE_FILE[t.id] ? `/images/matches/${MATCH_BADGE_FILE[t.id]}.svg` : t.logo,
    code: TEAM_CODE[t.id] || codeFromName(t.enName || t.name),
  });
  return { id: String(m.id), home: side(home), away: side(away), score: m.score, minute: m.minute };
};

const fromLive = (m) => {
  const side = (t = {}) => ({ name: t.name || t.shortName || "", crest: t.crest, code: codeFromName(t.name || t.shortName) });
  const sc = m.score?.fullTime || {};
  return { id: String(m.id), home: side(m.homeTeam), away: side(m.awayTeam), score: { home: sc.home ?? 0, away: sc.away ?? 0 }, minute: m.minute };
};

const Crest = ({ team }) =>
  team.crest ? (
    <img className="sport-lv-crest" src={team.crest} alt="" />
  ) : (
    <span className="sport-lv-crest is-empty" aria-hidden="true">{team.code}</span>
  );

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
                  {card.thumb && <img className="sport-lv-thumb" src={card.thumb} alt="" loading="lazy" />}
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
                    <span className="sport-lv-time">{clockText(card.minute)}</span>
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
