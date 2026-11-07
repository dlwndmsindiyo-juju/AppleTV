import { create } from "zustand";

// [추가] 히어로 먼저 보여 주기 — 페이지 히어로가 준비됐는지 (홈 · 로그인 후 홈 · 스포츠 홈)
// - 히어로(HeroSection · SportHero)가 첫 배경 이미지를 다 받으면 markHeroReady()
// - 아래 섹션(AfterHero)은 그 전까지 뼈대(스켈레톤)만 보여 주고, 준비되면 한꺼번에 나타남
// - 페이지를 열 때마다 resetHero() 로 다시 기다림 (AfterHero 가 처리)
export const useHeroReady = create((set) => ({
  ready: false,
  markHeroReady: () => set({ ready: true }),
  resetHero: () => set({ ready: false }),
}));

// 이미지 한 장을 미리 받아 두고 끝나면(실패해도) 알려줌
export const preloadImage = (src) =>
  new Promise((resolve) => {
    if (!src) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => (img.decode ? img.decode().catch(() => {}).then(resolve) : resolve());
    img.onerror = () => resolve();
    img.src = src;
  });
