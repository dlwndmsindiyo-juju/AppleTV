// TV 리모컨 방향키 이동 공용 (TvPreview · 영상 끝 화면 TvEndScreen · AI 팝업 · 검색)
// [추가] filter(btn): 있으면 그 조건에 맞는 버튼만 (예: AI 팝업에서 화면에 안 보이는 버튼 빼기) · 없으면 예전과 같음
// [추가] 왼쪽 메뉴 검색칸(.tv-side-search input)도 방향키로 고를 수 있게 같이 찾음 (홈 · 스포츠 메뉴와 같은 방식)
// [수정] TV 가이드 — 거리보다 "사용자가 예상하는 곳"으로
// - ← → : 카드 줄(TV_ROW) 안에 있으면 같은 줄 안에서만 이동
//         · 줄 끝에서 → 는 그대로 멈춤 · 줄 처음에서 ← 는 줄 밖(왼쪽 메뉴 등)으로
// - ↑ ↓ : 가장 가까운 다음 줄을 먼저 정하고, 그 줄에서 지금 카드와 같은 열(가로 위치가 가장 가까운 것)
export const FOCUSABLE = "button:not([disabled]), .tv-side-search input:not([disabled])";
export const TV_ROW = ".tv-sport-track, .tv-team-track, .tv-end-track, [data-tv-row]";

const center = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, w: r.width };
};

export const findNext = (root, current, key, filter = null) => {
  const buttons = [...root.querySelectorAll(FOCUSABLE)].filter((btn) => !filter || filter(btn));
  if (!current || !buttons.includes(current)) return buttons[0];

  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const from = center(current);

  // 방향에 맞는 후보
  const inDirection = (list) =>
    list
      .filter((btn) => btn !== current)
      .map((btn) => {
        const c = center(btn);
        return { btn, dx: c.x - from.x, dy: c.y - from.y };
      })
      .filter(
        ({ dx, dy }) =>
          (key === "ArrowRight" && dx > 1) ||
          (key === "ArrowLeft" && dx < -1) ||
          (key === "ArrowDown" && dy > 1) ||
          (key === "ArrowUp" && dy < -1)
      );

  // ---------- 좌우: 같은 줄 안에서 ----------
  if (horizontal) {
    const row = current.closest(TV_ROW);
    if (row) {
      const same = inDirection(buttons.filter((b) => row.contains(b)));
      if (same.length) {
        same.sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx));
        return same[0].btn;
      }
      if (key === "ArrowRight") return null; // 줄 끝: 멈춤
      // 줄 처음에서 ← : 줄 밖으로 (아래 공통 계산 · 같은 줄은 제외)
      const outside = inDirection(buttons.filter((b) => !row.contains(b)));
      return pickNearest(outside, true);
    }
    return pickNearest(inDirection(buttons), true);
  }

  // ---------- 위아래: 가장 가까운 줄 → 같은 열 ----------
  const cands = inDirection(buttons);
  if (!cands.length) return null;
  const nearestMain = Math.min(...cands.map((c) => Math.abs(c.dy)));
  const tolerance = Math.max(from.h * 0.5, 12);
  const rowCands = cands.filter((c) => Math.abs(c.dy) <= nearestMain + tolerance);
  rowCands.sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx) || Math.abs(a.dy) - Math.abs(b.dy));
  return rowCands[0].btn;
};

// 가는 방향 거리 + 옆으로 벗어난 거리(가중치) — 예전 계산
const pickNearest = (cands, horizontal) => {
  let best = null;
  let bestScore = Infinity;
  cands.forEach(({ btn, dx, dy }) => {
    const main = horizontal ? Math.abs(dx) : Math.abs(dy);
    const side = horizontal ? Math.abs(dy) : Math.abs(dx);
    const score = main + side * 3;
    if (score < bestScore) {
      bestScore = score;
      best = btn;
    }
  });
  return best;
};
