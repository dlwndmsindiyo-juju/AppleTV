import React from "react";
import { useTeamStore } from "../../store/useTeamStore";
import StarIcon from "./StarIcon";

// 구단 카드 (스포츠 홈 슬라이드 / 구단 전체 페이지 공용)
// showFullName: 짧은 이름 아래에 전체 이름을 함께 표시 (구단 페이지용)
const SportTeamCard = ({ team, showFullName = false }) => {
  const on = useTeamStore((s) => s.favorites.includes(team.id));
  const toggleFavorite = useTeamStore((s) => s.toggleFavorite);

  return (
    <div className={`sport-team-card${on ? " on" : ""}`}>
      <div className="sport-team-logo">
        <img src={team.logo} alt="" loading="lazy" />
      </div>

      <div className="sport-team-info">
        <span className="sport-team-name" title={team.name}>
          {team.shortName}
        </span>
        {showFullName && <span className="sport-team-meta">{team.name}</span>}
      </div>

      <button
        type="button"
        className={`sport-team-add${on ? " on" : ""}`}
        onClick={() => toggleFavorite(team.id)}
        aria-pressed={on}
        aria-label={`${team.name} ${on ? "팔로우 해제" : "팔로우"}`}
      >
        <StarIcon filled={on} size={20} />
      </button>
    </div>
  );
};

export default SportTeamCard;
