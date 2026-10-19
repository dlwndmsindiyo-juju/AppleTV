import React, { useState } from "react";
import { useSportStore } from "../../store/useSportStore";

// 관심있는 구단 (리그 순위표의 팀 중 4개를 후보로 노출)
const SportTeams = ({ title = "관심있는 구단" }) => {
  const { standings } = useSportStore();
  const [selected, setSelected] = useState([]); // 관심 등록한 팀 id

  const teams = (standings || [])
    .map((row) => row.team)
    .filter(Boolean)
    .slice(0, 4);

  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );

  return (
    <section className="sport-teams">
      <div className="inner">
        <h3 className="sport-teams-title">{title}</h3>
        <p className="sport-teams-desc">
          좋아하는 팀을 등록하면 경기 알림과 일정을 빠르게 확인할 수 있어요.
        </p>

        {teams.length === 0 ? (
          <p className="sport-empty">구단 정보가 없습니다.</p>
        ) : (
          <ul className="sport-team-list">
            {teams.map((team) => {
              const on = selected.includes(team.id);
              return (
                <li className="sport-team-card" key={team.id}>
                  <div className="sport-team-logo">
                    {team.crest && <img src={team.crest} alt="" />}
                  </div>
                  <span className="sport-team-name">
                    {team.shortName || team.name}
                  </span>
                  <button
                    type="button"
                    className={`sport-team-add${on ? " on" : ""}`}
                    onClick={() => toggle(team.id)}
                    aria-pressed={on}
                    aria-label={`${team.shortName || team.name} 관심 구단 ${
                      on ? "해제" : "등록"
                    }`}
                  >
                    {on ? "✓" : "+"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SportTeams;
