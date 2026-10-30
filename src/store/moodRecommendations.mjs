// 장르만으로 보충하지 않고, 각 기분을 위한 작품만 엄격하게 조회합니다.
// - 시리즈: Apple TV+ 오리지널 (방송사 2552 확인)
// - [추가] 영화: Apple TV+ 영화 [영문 제목, 개봉 연도] (제목 + 연도가 정확히 맞는 작품만)
// - 결과는 시리즈 · 영화를 번갈아 섞고, 각 작품에 media_type("tv" | "movie") 과 소개 한 줄(tagline)이 들어 있음
export const MOOD_TITLES = {
  심심한: ['Silo', 'Dark Matter', 'Severance', 'Foundation', 'Slow Horses', 'Murderbot'],
  힘든: ['Ted Lasso', 'Shrinking', 'Acapulco', 'Loot', 'Stick'],
  슬픈: ['Shrinking', 'Ted Lasso', 'Acapulco', 'Platonic', 'Loot'],
  즐거움: ['Acapulco', 'Platonic', 'The Studio', 'Loot', 'Mythic Quest', 'Carpool Karaoke: The Series'],
  화남: ['See', 'Slow Horses', 'Murderbot', 'Monarch: Legacy of Monsters', 'Criminal Record'],
};
export const MOOD_MOVIES = {
  심심한: [['F1', 2025], ['The Gorge', 2025], ['Ghosted', 2023]],
  힘든: [['CODA', 2021], ['Finch', 2021], ['The Lost Bus', 2025]],
  슬픈: [['CODA', 2021], ['Finch', 2021]],
  즐거움: [['Fly Me to the Moon', 2024], ['Wolfs', 2024], ['The Instigators', 2024]],
  화남: [['Greyhound', 2020], ['Emancipation', 2022], ['Napoleon', 2023]],
};
const normalize = (title = '') => title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const pending = new Map();
export async function fetchMoodRecommendations(mood, { apiKey, fetcher = fetch } = {}) {
  const titles = MOOD_TITLES[mood];
  if (!titles) return [];
  if (!apiKey) throw new Error('기분별 추천에 TMDB API 키가 필요합니다.');
  const request = async (path, params = {}) => {
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    for (const [key, value] of Object.entries({ api_key: apiKey, language: 'ko-KR', ...params })) url.searchParams.set(key, value);
    const response = await fetcher(url.toString());
    if (!response.ok) throw new Error('기분별 추천을 불러오지 못했습니다.');
    return response.json();
  };
  const load = (title) => {
    const key = `${apiKey}:${title}`;
    if (!pending.has(key)) {
      const work = (async () => {
        const data = await request('/search/tv', { query: title, include_adult: 'false' });
        for (const row of data.results || []) {
          if (![row.name, row.original_name].some(name => normalize(name) === normalize(title))) continue;
          const detail = await request(`/tv/${row.id}`);
          if (!detail.networks?.some(network => network.id === 2552)) continue;
          return { ...row, ...detail, media_type: 'tv', genre_ids: detail.genres?.map(genre => genre.id) || row.genre_ids || [] };
        }
        return null;
      })();
      pending.set(key, work);
      work.then(result => { if (!result) pending.delete(key); }, () => pending.delete(key));
    }
    return pending.get(key);
  };
  // [추가] 영화: 제목 + 개봉 연도로 찾기
  const loadMovie = ([title, year]) => {
    const key = `${apiKey}:movie:${title}:${year}`;
    if (!pending.has(key)) {
      const work = (async () => {
        const data = await request('/search/movie', { query: title, primary_release_year: String(year), include_adult: 'false' });
        const row = (data.results || []).find(r => [r.title, r.original_title].some(name => normalize(name) === normalize(title)));
        if (!row) return null;
        const detail = await request(`/movie/${row.id}`);
        return { ...row, ...detail, media_type: 'movie', genre_ids: detail.genres?.map(genre => genre.id) || row.genre_ids || [] };
      })();
      pending.set(key, work);
      work.then(result => { if (!result) pending.delete(key); }, () => pending.delete(key));
    }
    return pending.get(key);
  };
  const [tvResults, movieResults] = await Promise.all([
    Promise.allSettled(titles.map(load)),
    Promise.allSettled((MOOD_MOVIES[mood] || []).map(loadMovie)),
  ]);
  const pick = (results) => results.filter(result => result.status === 'fulfilled' && result.value).map(result => result.value);
  const series = pick(tvResults);
  const movies = pick(movieResults);
  // 시리즈 · 영화 번갈아 섞기
  const list = [];
  for (let i = 0; i < Math.max(series.length, movies.length); i += 1) {
    if (series[i]) list.push(series[i]);
    if (movies[i]) list.push(movies[i]);
  }
  // 일시적인 실패를 빈 추천으로 캐시하지 않도록 호출부에 전달합니다.
  if (!list.length && [...tvResults, ...movieResults].some(result => result.status === 'rejected')) throw new Error('기분별 추천을 다시 시도해주세요.');
  return [...new Map(list.map(item => [`${item.media_type}_${item.id}`, item])).values()];
}
