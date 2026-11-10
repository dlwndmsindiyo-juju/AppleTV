import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getTeamById } from "../data/sportTeams";
import { showToast } from "../utils/toast"; // [추가] 팔로우 · 취소 토스트

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
      // [추가] 팔로우 · 팔로우 취소 토스트 (스포츠 홈 · 구단 카드 · 히어로 · TV 관심구단 공통)
      toggleFavorite: (id) =>
        set((state) => {
          const following = state.favorites.includes(id);
          const name = getTeamById(id)?.name || "구단";
          showToast(following ? `${name} 팔로우를 취소했어요.` : `${name}을(를) 팔로우했어요. 관심 구단에서 볼 수 있어요.`, {
            icon: following ? "star-off" : "star",
          });
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
