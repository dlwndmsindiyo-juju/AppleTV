import catalog from "./appleTvCatalog.json";
import { recommend } from "./recommendationEngine.mjs";

export const GENRES = ["코미디", "호러", "로맨스", "스릴러", "SF", "애니메이션"];
export const MOODS = ["가볍게 웃고 싶어요", "긴장감 넘치는", "따뜻한 감동", "몰입감 있는", "편안한 힐링"];
export const DURATIONS = ["30분 이하", "1시간 내외", "영화 한 편", "상관없어요"];
const PAGE_SIZE = 6;
const MAX_RESULTS = 20;
// 장르(복수 선택 AND)·분위기·시간을 함께 반영합니다. 부족한 조건은 사용자 선택 후에만 확장합니다.
export function getContentRecommendations(preferences, { signal, page = 0, includeExpanded = false } = {}) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const exact = recommend(catalog, preferences, { limit: MAX_RESULTS, genreMode: "all" });
  const all = includeExpanded
    ? recommend(catalog, preferences, { limit: MAX_RESULTS, genreMode: "all", includeExpanded: true })
    : exact;
  const start = Math.max(0, Math.trunc(page)) * PAGE_SIZE;
  const items = all.slice(start, start + PAGE_SIZE).map(item => ({
    ...item,
    poster: item.portraitPoster || item.poster,
    runtimeText: item.selectedEpisode ? `${item.selectedEpisode.title} · ${item.selectedEpisode.minutes}분`
      : item.runtimeMinutes ? `${item.runtimeMinutes}분` : "",
  }));
  // 팝업의 기존 Array 응답 형식을 유지하면서 마지막 페이지 정보를 전달합니다.
  items.hasMore = start + items.length < all.length;
  items.total = all.length;
  items.exactTotal = exact.length;
  return items;
}

// 기존 호출부와의 호환용 별칭. 고정 예시 데이터는 사용하지 않습니다.
export const getExampleRecommendations = getContentRecommendations;
