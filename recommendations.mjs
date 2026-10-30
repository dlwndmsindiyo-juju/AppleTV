export const GENRES = ['코미디', '호러', '로맨스', '스릴러', 'SF', '애니메이션'];
export const MOODS = ['가볍게 웃기', '긴장감 넘치는', '따뜻한 갈등', '몰입감 있는'];
export const DURATIONS = ['30분 이하', '1시간 내외', '영화 한 편', '상관없음'];
const moodKeys = { '가볍게 웃기':'light', '가볍게 웃고 싶어요':'light', '긴장감 넘치는':'tense', '긴장감':'tense', '따뜻한 갈등':'warm', '따뜻한 감동':'warm', '갈등':'warm', '몰입감 있는':'immersive' };
export const CONFIG = { moodThreshold: 0.65, shortMax: 30, hourMin: 40, hourMax: 75, featureMin: 60 };

function durationMatch(item, duration) {
  const any = !duration || ['상관없음','상관없어요','any'].includes(duration);
  const runtimes = item.type === 'series' ? item.sampleEpisodes : [{ minutes: item.runtimeMinutes, title: item.title, url: item.appleUrl }];
  const valid = runtimes.filter(r => Number.isFinite(r.minutes));
  const predicate = r => any || (duration === '30분 이하' ? r.minutes <= CONFIG.shortMax : duration === '1시간 내외' ? r.minutes >= CONFIG.hourMin && r.minutes <= CONFIG.hourMax : duration === '영화 한 편' ? item.type === 'movie' && r.minutes >= CONFIG.featureMin : false);
  const episode = valid.find(predicate) || [...valid].sort((a,b) => Math.abs(a.minutes - (duration === '30분 이하' ? 25 : 60)) - Math.abs(b.minutes - (duration === '30분 이하' ? 25 : 60)))[0] || null;
  return { matches: any || valid.some(predicate), episode };
}

/** Pure, deterministic ranking. Catalog is passed explicitly; no API key or network required.
 * genreMode=all requires every selected genre; any supports OR-style multi-select.
 * includeExpanded defaults false: never silently violate selected constraints.
 */
export function recommend(catalog, preferences, { limit = 20, includeExpanded = false, genreMode = 'all', page = 0 } = {}) {
  const selected = [...new Set(preferences.genres || [])];
  if (!selected.length || selected.some(g => !GENRES.includes(g))) throw new Error('올바른 장르를 하나 이상 선택하세요.');
  const mood = moodKeys[preferences.mood];
  if (preferences.mood && !mood) throw new Error('지원하지 않는 분위기입니다.');
  const duration = preferences.duration || '상관없음';
  if (![...DURATIONS,'상관없어요'].includes(duration)) throw new Error('지원하지 않는 시청 시간입니다.');
  if (!['all','any'].includes(genreMode)) throw new Error('genreMode는 all 또는 any여야 합니다.');
  const ranked = catalog.map(item => {
    const hitGenres = selected.filter(g => item.genres.includes(g));
    const genre = genreMode === 'all' ? hitGenres.length === selected.length : hitGenres.length > 0;
    const time = durationMatch(item,duration);
    const moodScore = mood ? item.moodScores[mood] : 1;
    const atmosphere = !mood || moodScore >= CONFIG.moodThreshold;
    const relaxations = [];
    if (!genre) relaxations.push('장르');
    if (!atmosphere) relaxations.push('분위기');
    if (!time.matches) relaxations.push('시청 시간');
    const score = Math.round((Number(genre)*110 + hitGenres.length/selected.length*20 + Number(time.matches)*55 + moodScore*50)*100)/100;
    const runtimeLabel = time.episode ? `${item.type === 'series' ? '공식 페이지 노출 회차: ' + time.episode.title + ' · ' : ''}${time.episode.minutes}분` : '시간 미확인';
    return { ...item, genre: item.genres.join(' · '), overview: item.synopsisExcerpt, score, moodScore, exactMatch: !relaxations.length, relaxations, runtimeLabel, selectedEpisode: item.type === 'series' ? time.episode : null,
      reason: `${genre ? '장르 일치' : '연관 장르로 확장'} / ${atmosphere ? '분위기 편집 기준 충족' : '분위기 조건 완화'} / ${time.matches ? '시간 조건 충족' : '시간 조건 완화'}. ${relaxations.length ? '확장 후보: ' + relaxations.join(', ') + ' 재확인 필요.' : '선택한 조건 모두 충족.'}` };
  }).filter(item => includeExpanded || item.exactMatch)
    .sort((a,b) => Number(b.exactMatch)-Number(a.exactMatch) || b.score-a.score || a.id.localeCompare(b.id));
  return ranked.slice(page*limit, (page+1)*limit);
}
