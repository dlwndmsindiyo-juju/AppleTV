// 장르만으로 보충하지 않고, 각 기분을 위한 작품만 엄격하게 조회합니다.
export const MOOD_TITLES = {
  심심한: ['Silo', 'Dark Matter', 'Severance', 'Foundation', 'Slow Horses', 'Murderbot'],
  힘든: ['Ted Lasso', 'Shrinking', 'Acapulco', 'Loot', 'Stick'],
  슬픈: ['Shrinking', 'Ted Lasso', 'Acapulco', 'Platonic', 'Loot'],
  즐거움: ['Acapulco', 'Platonic', 'The Studio', 'Loot', 'Mythic Quest', 'Carpool Karaoke: The Series'],
  화남: ['See', 'Slow Horses', 'Murderbot', 'Monarch: Legacy of Monsters', 'Criminal Record'],
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
          return { ...row, ...detail, genre_ids: detail.genres?.map(genre => genre.id) || row.genre_ids || [] };
        }
        return null;
      })();
      pending.set(key, work);
      work.then(result => { if (!result) pending.delete(key); }, () => pending.delete(key));
    }
    return pending.get(key);
  };
  const results = await Promise.allSettled(titles.map(load));
  const list = results.filter(result => result.status === 'fulfilled' && result.value).map(result => result.value);
  // 일시적인 실패를 빈 추천으로 캐시하지 않도록 호출부에 전달합니다.
  if (!list.length && results.some(result => result.status === 'rejected')) throw new Error('기분별 추천을 다시 시도해주세요.');
  return [...new Map(list.map(item => [item.id, item])).values()];
}
