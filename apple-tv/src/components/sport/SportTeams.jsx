import React, { useEffect, useMemo, useState } from "react";
import { SPORT_TEAMS, CONFERENCES } from "../../data/sportTeams";

// 구독한 구단은 새로고침해도 유지되도록 localStorage 에 저장
const STORAGE_KEY = "sportFavoriteTeams";
const PREVIEW_COUNT = 8; // 처음에 보여줄 카드 수 (PC 4개 × 2줄)

const loadFavorites = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

// 관심있는 구단 (구독 방식)
const SportTeams = ({ title = "관심있는 구단" }) => {
  const [favorites, setFavorites] = useState(loadFavorites); // 구독한 팀 id
  const [filter, setFilter] = useState("all"); // all | east | west | mine
  const [expanded, setExpanded] = useState(false); // 전체 보기 여부

  // 구독 목록이 바뀔 때마다 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // 저장 실패(사생활 보호 모드 등)는 무시
    }
  }, [favorites]);

  const toggle = (id) =>
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );

  // 필터 탭 (개수 표시용)
  const filters = useMemo(
    () => [
      { key: "all", label: "전체", count: SPORT_TEAMS.length },
      { key: "east", label: "동부", count: SPORT_TEAMS.filter((t) => t.conference === "east").length },
      { key: "west", label: "서부", count: SPORT_TEAMS.filter((t) => t.conference === "west").length },
      { key: "mine", label: "내 구단", count: favorites.length },
    ],
    [favorites.length]
  );

  // 선택한 탭에 맞는 팀 목록
  const filtered = useMemo(() => {
    if (filter === "mine") return SPORT_TEAMS.filter((t) => favorites.includes(t.id));
    if (filter === "all") return SPORT_TEAMS;
    return SPORT_TEAMS.filter((t) => t.conference === filter);
  }, [filter, favorites]);

  const visible = expanded ? filtered : filtered.slice(0, PREVIEW_COUNT);

  const handleFilter = (key) => {
    setFilter(key);
    setExpanded(false);
  };

  return (
    <section className="sport-teams">
      <div className="inner">
        <div className="sport-teams-head">
          <div>
            <h3 className="sport-teams-title">{title}</h3>
            <p className="sport-teams-desc">
              좋아하는 팀을 등록하면 경기 알림과 일정을 빠르게 확인할 수 있어요.
            </p>
          </div>
          <p className="sport-teams-count">
            구독 중 <strong>{favorites.length}</strong>팀
          </p>
        </div>

        {/* 필터 탭 */}
        <ul className="sport-team-filter" role="tablist">
          {filters.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={filter === f.key ? "active" : ""}
                onClick={() => handleFilter(f.key)}
              >
                {f.label}
                <span className="count">{f.count}</span>
              </button>
            </li>
          ))}
        </ul>

        {filtered.length === 0 ? (
          <p className="sport-empty">
            아직 구독한 구단이 없어요. + 버튼으로 관심 구단을 추가해 보세요.
          </p>
        ) : (
          <>
            <ul className="sport-team-list">
              {visible.map((team) => {
                const on = favorites.includes(team.id);
                return (
                  <li className={`sport-team-card${on ? " on" : ""}`} key={team.id}>
                    <div className="sport-team-logo">
                      <img src={team.logo} alt="" loading="lazy" />
                    </div>
                    <div className="sport-team-info">
                      <span className="sport-team-name">{team.name}</span>
                      <span className="sport-team-meta">
                        {CONFERENCES[team.conference]}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`sport-team-add${on ? " on" : ""}`}
                      onClick={() => toggle(team.id)}
                      aria-pressed={on}
                      aria-label={`${team.name} 관심 구단 ${on ? "해제" : "등록"}`}
                    >
                      {on ? "✓" : "+"}
                    </button>
                  </li>
                );
              })}
            </ul>

            {filtered.length > PREVIEW_COUNT && (
              <button
                type="button"
                className="sport-team-more"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "접기" : `전체 구단 보기 (${filtered.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default SportTeams;
