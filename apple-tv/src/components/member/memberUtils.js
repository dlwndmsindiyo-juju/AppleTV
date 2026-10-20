// 로그인 후 메인(member) 섹션 공용 유틸
export const IMG_BASE = "https://image.tmdb.org/t/p";

export const img = (path, size = "w500") =>
  path ? `${IMG_BASE}/${size}${path}` : "";

// TMDB 장르 id → 한글 (TV / 영화)
export const TV_GENRES = {
  10759: "액션·어드벤처", 16: "애니메이션", 35: "코미디", 80: "범죄", 99: "다큐",
  18: "드라마", 10751: "가족", 10762: "키즈", 9648: "미스터리", 10764: "리얼리티",
  10765: "SF·판타지", 10766: "연속극", 10767: "토크", 10768: "전쟁·정치", 37: "서부",
};

export const MOVIE_GENRES = {
  28: "액션", 12: "어드벤처", 16: "애니메이션", 35: "코미디", 80: "범죄",
  99: "다큐멘터리", 18: "드라마", 10751: "가족", 14: "판타지", 36: "역사",
  27: "공포", 10402: "음악", 9648: "미스터리", 10749: "로맨스", 878: "SF",
  53: "스릴러", 10752: "전쟁", 37: "서부",
};

// 장르 id 배열 → "코미디 · 드라마"
export const genreText = (ids = [], map = TV_GENRES, max = 2) =>
  ids.map((id) => map[id]).filter(Boolean).slice(0, max).join(" · ");

// 상세 페이지 경로 (라우터 경로가 다르면 여기 한 줄만 수정)
export const detailPath = (type, id) => `/${type}/${id}`;
