import { create } from "zustand";
import { persist } from "zustand/middleware";

// 관심 구단 구독 상태 (스포츠 홈 슬라이드 + 구단 전체 페이지에서 함께 사용)
// persist: localStorage 에 자동 저장되어 새로고침해도 유지
export const useTeamStore = create(
  persist(
    (set) => ({
      // 구독한 구단 id 배열 (data/sportTeams.js 의 id)
      favorites: [],

      // 구독 / 해제
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((v) => v !== id)
            : [...state.favorites, id],
        })),

      // 전체 해제
      clearFavorites: () => set({ favorites: [] }),
    }),
    { name: "sport-favorite-teams" }
  )
);
