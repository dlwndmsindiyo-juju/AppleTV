import React from "react";
import { useSportStore } from "../../store/useSportStore";
import { isLive, formatKickoff, getScore } from "./sportUtils";

// 예정된 경기 (4개 카드)
const SportUpcoming = ({ title = "예정된 경기" }) => {
  const { upcomingMatches } = useSportStore();

  const matches = (upcomingMatches || []).slice(0, 4);

  return (
    <section className="sport-upcoming" id="sport-upcoming">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <a className="sport-more" href="#">
            전체 보기 <span aria-hidden="true">→</span>
          </a>
        </div>

        {matches.length === 0 ? (
          <p className="sport-empty">예정된 경기가 없습니다.</p>
        ) : (
        <ul className="sport-match-list">
          {matches.map((match) => {
            const live = isLive(match);
            const score = getScore(match);

            return (
              <li className="sport-match-card" key={match.id}>
                <span className="sport-match-status">
                  {live ? "LIVE" : formatKickoff(match.utcDate)}
                </span>

                <div className="sport-match-body">
                  <div className="sport-match-teams">
                    {[match.homeTeam, match.awayTeam].map((team, i) => (
                      <div className="sport-match-team" key={i}>
                        {team?.crest ? (
                          <img src={team.crest} alt="" />
                        ) : (
                          <span className="sport-crest-empty" />
                        )}
                        <span className="sport-match-team-name">
                          {team?.shortName || team?.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <span className="sport-match-score">
                    {score ? `${score.home} : ${score.away}` : "VS"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </section>
  );
};

export default SportUpcoming;
