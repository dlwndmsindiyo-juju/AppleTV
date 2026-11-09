import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useTeamStore, selectFollowedTeams } from "../store/useTeamStore";
import SportTeamCard from "../components/sport/SportTeamCard";
import DetailBackLink from "../components/common/DetailBackLink";
import { SPORT_TEAMS_PATH } from "../components/sport/SportTeams";

// [추가] 관심 구단 — 프로필 메뉴 > 관심 구단 (나의 목록과 같은 페이지 틀 · .wish-page)
// - 팔로우한 구단 카드 · 별 버튼으로 팔로우 취소 (토스트는 useTeamStore)
const FavoriteTeams = () => {
  const teams = useTeamStore(useShallow(selectFollowedTeams));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="wish-page fav-teams-page">
      <DetailBackLink to="/" label="홈으로" overlay />
      <div className="wish-inner">
        <h2 className="wish-title">관심 구단</h2>
        <p className="wish-desc">팔로우한 구단 {teams.length}팀</p>

        {teams.length === 0 ? (
          <div className="wish-empty fav-teams-empty">
            <p>아직 팔로우한 구단이 없어요.</p>
            <Link to={SPORT_TEAMS_PATH} className="fav-teams-more">
              구단 둘러보기
            </Link>
          </div>
        ) : (
          <>
            <ul className="fav-teams-list">
              {teams.map((team) => (
                <li key={team.id}>
                  <SportTeamCard team={team} showFullName />
                </li>
              ))}
            </ul>
            <Link to={SPORT_TEAMS_PATH} className="fav-teams-more">
              구단 더 추가하기
            </Link>
          </>
        )}
      </div>
    </main>
  );
};

export default FavoriteTeams;
