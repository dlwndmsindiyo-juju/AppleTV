// src/data/posterShelves.js
// [추가] 로그인 후 메인 — TMDB 로 채우는 섹션 목록 (components/member/PosterShelves.jsx)
// - id 로 홈(MemberHome.jsx)에서 원하는 자리에 넣음: <Shelf id="all-movies" />
// - 전체 보기(/browse/{id})도 같은 조건으로 더 많이 (pages/MemberBrowse.jsx)
// - sources: TMDB 에서 가져올 목록 (여러 개면 번갈아 섞음)
//   · path: TMDB 주소 (/discover/movie · /trending/tv/week 등) · params: 조건 · type: movie | tv
//   · apple: true 면 먼저 Apple TV+ 작품만 (영화: 제공 서비스 Apple TV+ · 시리즈: 방송사 Apple TV+)
//     → 개수가 모자라면 조건은 그대로 두고 Apple TV+ 제한만 빼서 채움
// - design: "top10" 이면 맨 위 인기 콘텐츠(Top10Section)와 같은 디자인 · 없으면 포스터만
// - limit: 홈에서 보여 줄 개수 · more: true 면 "전체 보기"
// - 장르 id: 영화 SF 878 · 로맨스 10749 · 드라마 18 · 스릴러 53 · 공포 27 · 코미디 35 · 다큐 99 · 가족 10751 · 애니 16
//            시리즈 SF·판타지 10765 · 드라마 18 · 미스터리 9648 · 범죄 80 · 코미디 35 · 다큐 99 · 키즈 10762
//            (시리즈에는 로맨스 · 스릴러 · 공포 장르가 없음 → 로맨스 · 공포는 영화만, 스릴러는 미스터리 · 범죄)
export const POSTER_SHELVES = {
  "movie-top10": {
    title: "영화 TOP 10",
    design: "top10",
    limit: 10,
    sources: [{ path: "/trending/movie/week", type: "movie" }],
  },
  "all-movies": {
    title: "모든 영화",
    limit: 20,
    more: true,
    sources: [{ path: "/discover/movie", type: "movie", params: { "vote_count.gte": 100 } }],
  },
  "series-top10": {
    title: "시리즈 TOP 10",
    design: "top10",
    limit: 10,
    sources: [{ path: "/trending/tv/week", type: "tv" }],
  },
  "all-series": {
    title: "모든 시리즈",
    limit: 20,
    more: true,
    sources: [{ path: "/discover/tv", type: "tv", params: { "vote_count.gte": 100 } }],
  },
  documentary: {
    title: "다큐멘터리",
    limit: 20,
    // Apple TV+ 다큐멘터리 (모자라면 다른 다큐로 채움)
    sources: [
      { path: "/discover/tv", type: "tv", apple: true, params: { with_genres: 99 } },
      { path: "/discover/movie", type: "movie", apple: true, params: { with_genres: 99 } },
    ],
  },
  "all-documentaries": {
    title: "모든 다큐멘터리",
    limit: 20,
    more: true,
    sources: [
      { path: "/discover/movie", type: "movie", params: { with_genres: 99, "vote_count.gte": 20 } },
      { path: "/discover/tv", type: "tv", params: { with_genres: 99, "vote_count.gte": 20 } },
    ],
  },
  kids: {
    title: "키즈",
    limit: 20,
    more: true,
    sources: [
      { path: "/discover/tv", type: "tv", apple: true, params: { with_genres: 10762 } },
      { path: "/discover/movie", type: "movie", apple: true, params: { with_genres: "10751,16" } },
    ],
  },

  // ---------- 장르별 모음 (홈: 장르 카드 한 줄 · 누르면 /browse/genre-xxx 에서 그 장르 작품) ----------
  "genre-sf": {
    title: "SF",
    genre: true,
    sources: [
      { path: "/discover/movie", type: "movie", params: { with_genres: 878 } },
      { path: "/discover/tv", type: "tv", params: { with_genres: 10765 } },
    ],
  },
  "genre-romance": {
    title: "로맨스",
    genre: true,
    sources: [{ path: "/discover/movie", type: "movie", params: { with_genres: 10749 } }],
  },
  "genre-drama": {
    title: "드라마",
    genre: true,
    sources: [
      { path: "/discover/movie", type: "movie", params: { with_genres: 18 } },
      { path: "/discover/tv", type: "tv", params: { with_genres: 18 } },
    ],
  },
  "genre-thriller": {
    title: "스릴러",
    genre: true,
    sources: [
      { path: "/discover/movie", type: "movie", params: { with_genres: 53 } },
      { path: "/discover/tv", type: "tv", params: { with_genres: "9648|80" } },
    ],
  },
  "genre-horror": {
    title: "공포",
    genre: true,
    sources: [{ path: "/discover/movie", type: "movie", params: { with_genres: 27 } }],
  },
  "genre-comedy": {
    title: "코미디",
    genre: true,
    sources: [
      { path: "/discover/movie", type: "movie", params: { with_genres: 35 } },
      { path: "/discover/tv", type: "tv", params: { with_genres: 35 } },
    ],
  },
  "genre-kids": {
    title: "키즈",
    genre: true,
    sources: [
      { path: "/discover/tv", type: "tv", params: { with_genres: 10762 } },
      { path: "/discover/movie", type: "movie", params: { with_genres: "10751,16" } },
    ],
  },
};

// 장르별 모음 섹션에 나오는 순서
export const GENRE_COLLECTION = ["genre-sf", "genre-romance", "genre-drama", "genre-thriller", "genre-horror", "genre-comedy", "genre-kids"];

export const BROWSE_LIMIT = 40; // 전체 보기에서 보여 줄 개수 (TMDB 2쪽)
