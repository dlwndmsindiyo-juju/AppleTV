const API = 'https://api.themoviedb.org/3';
const normalize = (value = '') => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// Apple 작품 ID를 TMDB 상세 ID처럼 사용하지 않습니다. 동명 작품은 제목·공개 연도·방송사를 대조합니다.
export async function resolveContentDetail(item, { signal, apiKey = import.meta.env?.VITE_TMDB_API_KEY, fetcher = fetch } = {}) {
  if (!apiKey) return null;
  const type = item.type === 'series' ? 'tv' : 'movie';
  const names = new Set([normalize(item.title), normalize(item.originalTitle)]);
  const yearOf = row => Number((row.first_air_date || row.release_date || '').slice(0, 4)) || null;
  const request = async (endpoint, parameters = {}) => {
    const url = new URL(`${API}${endpoint}`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', 'ko-KR');
    for (const [key,value] of Object.entries(parameters)) url.searchParams.set(key,value);
    const response = await fetcher(url.toString(), { signal });
    if (!response.ok) throw new Error('작품 상세 정보를 불러오지 못했습니다.');
    return response.json();
  };
  const candidates = new Map();
  const queries = [...new Set([item.originalTitle, item.title].filter(Boolean))];
  for (const query of queries) {
    const result = await request(`/search/${type}`, { query, include_adult: 'false' });
    for (const row of result.results || []) {
      if (!Number.isSafeInteger(row.id) || row.id <= 0) continue;
      const candidateNames = [row.name, row.title, row.original_name, row.original_title].filter(Boolean).map(normalize);
      if (!candidateNames.some(name => names.has(name))) continue;
      const year = yearOf(row);
      if (item.releaseYear && year && Math.abs(year-item.releaseYear)>1) continue;
      candidates.set(row.id, row);
    }
  }
  const verified = [];
  for (const row of [...candidates.values()].slice(0, 5)) {
    const detail = await request(`/${type}/${row.id}`, {
      append_to_response: 'credits,similar,images,videos',
      include_image_language: 'ko,en,null', include_video_language: 'ko,en,null',
    });
    if (detail.id !== row.id) continue;
    if (![detail.name, detail.title, detail.original_name, detail.original_title].filter(Boolean).map(normalize).some(name => names.has(name))) continue;
    const year = yearOf(detail);
    if (item.releaseYear && year && Math.abs(year-item.releaseYear)>1) continue;
    const appleNetwork = type === 'tv' && detail.networks?.some(n => n.id === 2552);
    if (item.isAppleOriginal && type === 'tv' && !appleNetwork) continue;
    if (type === 'movie' && item.runtimeMinutes && detail.runtime && Math.abs(item.runtimeMinutes-detail.runtime)>15) continue;
    const yearMatches = Boolean(item.releaseYear && year && year === item.releaseYear);
    // 연도 근거도 방송사 근거도 없으면 자동으로 동명 작품을 선택하지 않습니다.
    if (!yearMatches && !appleNetwork && (!item.releaseYear || !year)) continue;
    verified.push({ id:row.id, type, detail, score:Number(yearMatches)*10+Number(appleNetwork)*5 });
  }
  verified.sort((a,b)=>b.score-a.score);
  if (!verified.length || (verified[1] && verified[0].score === verified[1].score)) return null;
  return verified[0];
}
