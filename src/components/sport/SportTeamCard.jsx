import React from "react";
import { useTeamStore } from "../../store/useTeamStore";
import StarIcon from "./StarIcon";

// 구단 카드 (스포츠 홈 슬라이드 / 구단 전체 페이지 공용)
// showFullName: 짧은 이름 아래에 전체 이름을 함께 표시 (구단 페이지용)
// - [추가] --team-color · --team-ink: 구단 대표색 · 그 위에 잘 보이는 글자색 (휴대폰 구단 페이지 카드 배경용 · mobile.scss)

// 대표색이 밝으면 검은 글자 · 어두우면 흰 글자
const inkFor = (hex = "") => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? "#171717" : "#ffffff";
};
const SportTeamCard = ({ team, showFullName = false }) => {
  const on = useTeamStore((s) => s.favorites.includes(team.id));
  const toggleFavorite = useTeamStore((s) => s.toggleFavorite);

  return (
    <div
      className={`sport-team-card${on ? " on" : ""}`}
      style={{ "--team-color": team.color, "--team-ink": inkFor(team.color) }}
    >
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
