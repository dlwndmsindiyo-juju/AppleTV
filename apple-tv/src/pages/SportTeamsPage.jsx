import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SPORT_TEAMS, CONFERENCES } from "../data/sportTeams";
import { useTeamStore } from "../store/useTeamStore";
import SportTeamCard from "../components/sport/SportTeamCard";

const SEARCH_ICON = `${import.meta.env.BASE_URL}icons/search.svg`;

// 구단 전체 페이지 (구독할 수 있는 MLS 구단 모아보기)
const SportTeamsPage = () => {
  const navigate = useNavigate();
  const favorites = useTeamStore((s) => s.favorites);
  const clearFavorites = useTeamStore((s) => s.clearFavorites);

  const [filter, setFilter] = useState("all"); // all | east | west | mine
  const [keyword, setKeyword] = useState("");

  // 페이지 진입 시 맨 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filters = useMemo(
    () => [
      { key: "all", label: "전체", count: SPORT_TEAMS.length },
      { key: "east", label: "동부", count: SPORT_TEAMS.filter((t) => t.conference === "east").length },
      { key: "west", label: "서부", count: SPORT_TEAMS.filter((t) => t.conference === "west").length },
      { key: "mine", label: "내 구단", count: favorites.length },
    ],
    [favorites.length]
  );

  // 탭 + 검색어 적용
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return SPORT_TEAMS.filter((t) => {
      if (filter === "mine" && !favorites.includes(t.id)) return false;
      if ((filter === "east" || filter === "west") && t.conference !== filter) return false;
      if (!q) return true;
      return [t.name, t.shortName, t.enName].some((v) => v.toLowerCase().includes(q));
    });
  }, [filter, keyword, favorites]);

  // 컨퍼런스별로 묶기 (팀이 없는 그룹은 숨김)
  const groups = Object.keys(CONFERENCES)
    .map((key) => ({
      key,
      label: CONFERENCES[key],
      teams: filtered.filter((t) => t.conference === key),
    }))
    .filter((g) => g.teams.length > 0);

  const handleClear = () => {
    if (window.confirm("구독한 구단을 모두 해제할까요?")) clearFavorites();
  };

  return (
    <section className="sport-teams-page">
      {/* 상단 그라데이션 띠 */}
      <div className="sport-teams-hero">
        <div className="inner">
          <button type="button" className="sport-teams-back" onClick={() => navigate(-1)}>
            ← 스포츠 홈
          </button>
          <h2 className="sport-teams-page-title">관심 구단 구독</h2>
          <p className="sport-teams-page-desc">
            MLS 30개 구단 중 좋아하는 팀을 구독하고 경기 알림과 일정을 받아보세요.
          </p>
          <div className="sport-teams-summary">
            <span>
              구독 중 <strong>{favorites.length}</strong>팀
            </span>
            {favorites.length > 0 && (
              <button type="button" className="sport-teams-clear" onClick={handleClear}>
                전체 해제
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="inner sport-teams-body">
        {/* 탭 + 검색 */}
        <div className="sport-teams-toolbar">
          <ul className="sport-team-filter" role="tablist">
            {filters.map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  className={filter === f.key ? "active" : ""}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span className="count">{f.count}</span>
                </button>
              </li>
            ))}
          </ul>

          <label className="sport-team-search">
            <img src={SEARCH_ICON} alt="" />
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="구단 이름 검색"
              aria-label="구단 이름 검색"
            />
          </label>
        </div>

        {/* 컨퍼런스별 구단 목록 */}
        {groups.length === 0 ? (
          <p className="sport-team-empty">
            {filter === "mine" && !keyword
              ? "아직 구독한 구단이 없어요. + 버튼으로 관심 구단을 추가해 보세요."
              : "검색 결과가 없어요."}
          </p>
        ) : (
          groups.map((g) => (
            <div className="sport-team-group" key={g.key}>
              <h3 className="sport-team-group-title">
                {g.label}
                <span className="count">{g.teams.length}</span>
              </h3>
              <ul className="sport-team-list">
                {g.teams.map((team) => (
                  <li key={team.id}>
                    <SportTeamCard team={team} showFullName />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default SportTeamsPage;
