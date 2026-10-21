import React, { useEffect } from "react";
import { useSportStore } from "../../store/useSportStore";
import { getScore, decodeHtml } from "./sportUtils";

// 팀 이름 비교용 (대소문자 · 공백 · FC 등 무시)
const norm = (name = "") =>
  name.toLowerCase().replace(/\b(fc|afc|cf|sc)\b/g, "").replace(/[^a-z0-9가-힣]/g, "");

// 종료 경기와 같은 경기의 TheSportsDB 하이라이트 찾기
const findVideo = (pool, home, away) => {
  const h = norm(home), a = norm(away);
  if (!h || !a) return null;
  return pool.find((v) => {
    const title = norm(v.snippet?.title);
    const eh = norm(v.event?.home), ea = norm(v.event?.away);
    return (eh && ea && eh.includes(h) && ea.includes(a)) || (title.includes(h) && title.includes(a));
  }) || null;
};

// 영상 다시보기 (최근 종료된 경기 5개)
// 1) football-data 종료 경기가 있으면: 같은 경기의 TheSportsDB 영상이 있으면 바로 재생, 없으면 YouTube 검색으로 이동
// 2) football-data 키가 없거나 결과가 없으면: TheSportsDB 최신 경기 하이라이트 5개로 카드 구성
const SportReplay = ({ title = "경기 다시보기" }) => {
  const finishedMatches = useSportStore((state) => state.finishedMatches);
  const sdbPool = useSportStore((state) => state.sportsDbHighlights);
  const fetchFinished = useSportStore((state) => state.onFetchFinishedMatches);
  const fetchSportsDb = useSportStore((state) => state.onFetchSportsDbHighlights);

  useEffect(() => {
    fetchFinished();
    fetchSportsDb();
  }, [fetchFinished, fetchSportsDb]);

  const cards = (finishedMatches || []).length > 0
    ? finishedMatches.slice(0, 5).map((match) => {
        const home = match.homeTeam?.shortName || match.homeTeam?.name;
        const away = match.awayTeam?.shortName || match.awayTeam?.name;
        const video = findVideo(sdbPool, match.homeTeam?.name || home, match.awayTeam?.name || away);
        const date = new Date(match.utcDate);
        return {
          key: match.id,
          home, away,
          homeCrest: match.homeTeam?.crest,
          awayCrest: match.awayTeam?.crest,
          score: getScore(match),
          thumb: video?.snippet?.thumbnails?.high?.url,
          date: `${date.getMonth() + 1}월 ${date.getDate()}일`,
          href: video
            ? `https://www.youtube.com/watch?v=${video.id.videoId}`
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${home} vs ${away} 풀경기 다시보기`)}`,
        };
      })
    : (sdbPool || []).slice(0, 5).map((video) => {
        const ev = video.event || {};
        const d = ev.date ? new Date(ev.date) : null;
        const hasScore = ev.homeScore !== null && ev.homeScore !== undefined && ev.awayScore !== null && ev.awayScore !== undefined;
        return {
          key: video.id.videoId,
          home: ev.home,
          away: ev.away,
          title: decodeHtml(video.snippet?.title),
          homeCrest: ev.homeBadge,
          awayCrest: ev.awayBadge,
          score: hasScore ? { home: ev.homeScore, away: ev.awayScore } : null,
          thumb: video.snippet?.thumbnails?.high?.url,
          date: d && !Number.isNaN(d.getTime()) ? `${d.getMonth() + 1}월 ${d.getDate()}일` : video.snippet?.channelTitle || "",
          href: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        };
      });

  return (
    <section className="sport-replay">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <a className="sport-more" href="#">
            전체 보기 <span aria-hidden="true">→</span>
          </a>
        </div>

        {cards.length === 0 ? (
          <p className="sport-empty">다시볼 경기가 없습니다.</p>
        ) : (
          <ul className="sport-replay-list">
            {cards.map((card) => (
              <li key={card.key}>
                <a className="sport-replay-card" href={card.href} target="_blank" rel="noreferrer">
                  <div
                    className="sport-replay-thumb"
                    style={card.thumb ? { backgroundImage: `url(${card.thumb})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  >
                    {card.homeCrest && <img src={card.homeCrest} alt="" />}
                    <span className="sport-replay-score">
                      {card.score ? `${card.score.home} : ${card.score.away}` : "VS"}
                    </span>
                    {card.awayCrest && <img src={card.awayCrest} alt="" />}
                  </div>
                  <span className="sport-replay-name">
                    {card.home && card.away ? `${card.home} vs ${card.away}` : card.title}
                  </span>
                  <span className="sport-replay-date">{card.date}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SportReplay;
