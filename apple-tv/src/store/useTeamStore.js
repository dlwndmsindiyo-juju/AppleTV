import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getTeamById } from "../data/sportTeams";

// 관심 구단 구독 상태 (스포츠 홈 슬라이드 + 구단 전체 페이지 + 스포츠 히어로에서 함께 사용)
// persist: localStorage 에 자동 저장되어 새로고침해도 유지
// - favorites : 팔로우한 순서대로 쌓임 → [0] 이 "처음 팔로우한 팀"
// - heroTeamId: 히어로에 보여줄 팀 (여러 팀을 팔로우했을 때 사용자가 고른 팀, 없으면 처음 팔로우한 팀)
export const useTeamStore = create(
  persist(
    (set) => ({
      // 구독한 구단 id 배열 (data/sportTeams.js 의 id)
      favorites: [],
      heroTeamId: null,

      // 구독 / 해제 (히어로로 고른 팀을 해제하면 처음 팔로우한 팀으로 돌아감)
      toggleFavorite: (id) =>
        set((state) => {
          const following = state.favorites.includes(id);
          return {
            favorites: following
              ? state.favorites.filter((v) => v !== id)
              : [...state.favorites, id],
            heroTeamId: following && state.heroTeamId === id ? null : state.heroTeamId,
          };
        }),

      // 히어로에 보여줄 팀 고르기 (팔로우한 팀만)
      setHeroTeam: (id) =>
        set((state) => (state.favorites.includes(id) ? { heroTeamId: id } : {})),

      // 전체 해제
      clearFavorites: () => set({ favorites: [], heroTeamId: null }),
    }),
    { name: "sport-favorite-teams" }
  )
);

// 히어로에 보여줄 구단 (팔로우한 팀이 없으면 null → 기존 경기 히어로)
// 사용: const heroTeam = useTeamStore(selectHeroTeam);
export const selectHeroTeam = (state) => {
  const id = state.favorites.includes(state.heroTeamId) ? state.heroTeamId : state.favorites[0];
  return id ? getTeamById(id) || null : null;
};

// 팔로우한 구단 목록 (팔로우한 순서, 히어로의 팀 선택 칩에 사용)
// 사용: const followed = useTeamStore(useShallow(selectFollowedTeams));  (zustand/react/shallow)
export const selectFollowedTeams = (state) =>
  state.favorites.map(getTeamById).filter(Boolean);
