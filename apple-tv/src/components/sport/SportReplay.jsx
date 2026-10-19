import React from "react";
import { useSportStore } from "../../store/useSportStore";
import { getScore } from "./sportUtils";

// 영상 다시보기 (최근 종료된 경기 5개 → 누르면 해당 경기 다시보기 검색)
const SportReplay = ({ title = "경기 다시보기" }) => {
  const { finishedMatches } = useSportStore();

  const matches = (finishedMatches || []).slice(0, 5);

  return (
    <section className="sport-replay">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <a className="sport-more" href="#">
            전체 보기 <span aria-hidden="true">→</span>
          </a>
        </div>

        {matches.length === 0 ? (
          <p className="sport-empty">다시볼 경기가 없습니다.</p>
        ) : (
          <ul className="sport-replay-list">
            {matches.map((match) => {
              const home = match.homeTeam?.shortName || match.homeTeam?.name;
              const away = match.awayTeam?.shortName || match.awayTeam?.name;
              const score = getScore(match);
              const date = new Date(match.utcDate);

              return (
                <li key={match.id}>
                  <a
                    className="sport-replay-card"
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                      `${home} vs ${away} 풀경기 다시보기`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="sport-replay-thumb">
                      {match.homeTeam?.crest && (
                        <img src={match.homeTeam.crest} alt="" />
                      )}
                      <span className="sport-replay-score">
                        {score ? `${score.home} : ${score.away}` : "VS"}
                      </span>
                      {match.awayTeam?.crest && (
                        <img src={match.awayTeam.crest} alt="" />
                      )}
                    </div>
                    <span className="sport-replay-name">
                      {home} vs {away}
                    </span>
                    <span className="sport-replay-date">
                      {date.getMonth() + 1}월 {date.getDate()}일
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SportReplay;
