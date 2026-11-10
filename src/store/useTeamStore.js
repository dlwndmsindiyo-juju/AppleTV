import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getTeamById } from "../data/sportTeams";
import { showToast } from "../utils/toast"; // [추가] 팔로우 · 취소 토스트
import { useAuthStore } from "./useAuthStore"; // [추가] 계정별 관심 구단 (로그인한 계정 uid)

// 관심 구단 구독 상태 (스포츠 홈 슬라이드 + 구단 전체 페이지 + 스포츠 히어로에서 함께 사용)
// persist: localStorage 에 자동 저장되어 새로고침해도 유지
// - favorites : 팔로우한 순서대로 쌓임 → [0] 이 "처음 팔로우한 팀"
// - heroTeamId: 히어로에 보여줄 팀 (여러 팀을 팔로우했을 때 사용자가 고른 팀, 없으면 처음 팔로우한 팀)
// - [추가] 계정별로 따로 저장 (byUser[uid]) · favorites / heroTeamId 는 "지금 로그인한 계정" 것만 보여 줌
//   · 로그아웃: favorites 가 비어 보이고 팔로우 버튼을 눌러도 팔로우되지 않음 (로그인 안내 토스트)
//   · 다시 로그인: 그 계정이 팔로우했던 목록을 되살림 → 다른 계정 · 로그아웃 상태에 이전 목록이 남지 않음

// 지금 계정의 목록을 byUser 에도 같이 저장
const withOwner = (state, next) => {
  if (!state.owner) return next;
  const mine = { favorites: next.favorites ?? state.favorites, heroTeamId: next.heroTeamId ?? null };
  return { ...next, byUser: { ...state.byUser, [state.owner]: mine } };
};

export const useTeamStore = create(
  persist(
    (set, get) => ({
      // 구독한 구단 id 배열 (data/sportTeams.js 의 id)
      favorites: [],
      heroTeamId: null,
      owner: null, // [추가] 지금 로그인한 계정 uid (로그아웃이면 null)
      byUser: {}, // [추가] { [uid]: { favorites, heroTeamId } }
      legacy: null, // [추가] 계정별 저장 이전에 팔로우해 둔 목록 → 처음 로그인한 계정으로 옮김

      // 구독 / 해제 (히어로로 고른 팀을 해제하면 처음 팔로우한 팀으로 돌아감)
      // [추가] 팔로우 · 팔로우 취소 토스트 (스포츠 홈 · 구단 카드 · 히어로 · TV 관심구단 공통)
      // [추가] 로그아웃 상태에서는 팔로우하지 않고 로그인 안내 토스트
      toggleFavorite: (id) => {
        if (!get().owner) {
          showToast("로그인하면 관심 구단을 팔로우할 수 있어요.", { icon: "star-off" });
          return;
        }
        set((state) => {
          const following = state.favorites.includes(id);
          const name = getTeamById(id)?.name || "구단";
          showToast(following ? `${name} 팔로우를 취소했어요.` : `${name}을(를) 팔로우했어요. 관심 구단에서 볼 수 있어요.`, {
            icon: following ? "star-off" : "star",
          });
          return withOwner(state, {
            favorites: following
              ? state.favorites.filter((v) => v !== id)
              : [...state.favorites, id],
            heroTeamId: following && state.heroTeamId === id ? null : state.heroTeamId,
          });
        });
      },

      // 히어로에 보여줄 팀 고르기 (팔로우한 팀만)
      setHeroTeam: (id) =>
        set((state) => (state.owner && state.favorites.includes(id) ? withOwner(state, { heroTeamId: id }) : {})),

      // 전체 해제
      clearFavorites: () => set((state) => withOwner(state, { favorites: [], heroTeamId: null })),

      // [추가] 로그인 · 로그아웃 · 계정 바뀜 → 그 계정의 목록으로 바꿈 (아래 useAuthStore 구독에서 호출)
      syncOwner: (uid) =>
        set((state) => {
          if (state.owner === uid && (uid || state.favorites.length === 0)) return {};
          if (!uid) return { owner: null, favorites: [], heroTeamId: null };
          let byUser = state.byUser || {};
          let legacy = state.legacy;
          if (!byUser[uid] && legacy?.favorites?.length) {
            byUser = { ...byUser, [uid]: legacy };
            legacy = null;
          }
          const mine = byUser[uid] || { favorites: [], heroTeamId: null };
          return { owner: uid, byUser, legacy, favorites: mine.favorites || [], heroTeamId: mine.heroTeamId || null };
        }),
    }),
    {
      name: "sport-favorite-teams",
      version: 1,
      // [추가] 예전 저장값(계정 구분 없음) → legacy 로 보관
      migrate: (saved, version) => {
        if (version < 1 && saved) {
          return { favorites: [], heroTeamId: null, owner: null, byUser: {}, legacy: { favorites: saved.favorites || [], heroTeamId: saved.heroTeamId || null } };
        }
        return saved;
      },
    }
  )
);

// [추가] 로그인 상태가 바뀔 때마다 그 계정의 관심 구단으로 맞춤 (처음 한 번 + 이후 변경)
const syncFromAuth = (user) => useTeamStore.getState().syncOwner(user?.uid || null);
syncFromAuth(useAuthStore.getState().user);
useAuthStore.subscribe((state, prev) => {
  if (state.user?.uid !== prev?.user?.uid) syncFromAuth(state.user);
});

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
