import React from "react";

// 리그 순위 (바로가기 카드 4개)
const leagueLinks = [
  { label: "라이브", path: "#" },
  { label: "일정 · 스코어", path: "#" },
  { label: "리그 및 팀", path: "#" },
  { label: "하이라이트", path: "#" },
];

const SportLeague = ({ title = "리그 순위" }) => {
  return (
    <section className="sport-league">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <a className="sport-more" href="#">
            전체 보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
          </a>
        </div>

        <ul className="sport-league-list">
          {leagueLinks.map((item) => (
            <li key={item.label}>
              <a className="sport-league-card" href={item.path}>
                <span className="sport-league-icon" aria-hidden="true">
                  <img className="play-icon" src="/icons/play-b.svg" alt="" aria-hidden="true" />
                </span>
                <span className="sport-league-label">{item.label}</span>
                <span className="sport-league-arrow" aria-hidden="true">
                  <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default SportLeague;
