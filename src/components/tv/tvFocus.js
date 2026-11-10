// TV 리모컨 방향키 이동 공용 (TvPreview · 영상 끝 화면 TvEndScreen)
// 방향키로 가장 가까운 버튼 찾기 (화면 위치 기준)
// [추가] filter(btn): 있으면 그 조건에 맞는 버튼만 (예: AI 팝업에서 화면에 안 보이는 버튼 빼기) · 없으면 예전과 같음
// [추가] 왼쪽 메뉴 검색칸(.tv-side-search input)도 방향키로 고를 수 있게 같이 찾음 (홈 · 스포츠 메뉴와 같은 방식)
export const FOCUSABLE = "button:not([disabled]), .tv-side-search input:not([disabled])";
export const findNext = (root, current, key, filter = null) => {
  const buttons = [...root.querySelectorAll(FOCUSABLE)].filter((btn) => !filter || filter(btn));
  if (!current || !buttons.includes(current)) return buttons[0];

  const from = current.getBoundingClientRect();
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;

  let best = null;
  let bestScore = Infinity;

  buttons.forEach((btn) => {
    if (btn === current) return;
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const dx = x - fx;
    const dy = y - fy;

    const ok =
      (key === "ArrowRight" && dx > 1) ||
      (key === "ArrowLeft" && dx < -1) ||
      (key === "ArrowDown" && dy > 1) ||
      (key === "ArrowUp" && dy < -1);
    if (!ok) return;

    // 가는 방향 거리 + 옆으로 벗어난 거리(가중치)
    const main = key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dx) : Math.abs(dy);
    const side = key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dy) : Math.abs(dx);
    const score = main + side * 3;

    if (score < bestScore) {
      bestScore = score;
      best = btn;
    }
  });

  return best;
};
