// src/utils/ageRating.js
// [추가] 청소년 관람불가 콘텐츠 판단 — 미성년자 계정이면 포스터 흐림 + 누르면 안내 팝업 (components/common/AgeGuard.jsx)
// - 미성년자: 구독할 때 신원 확인에 입력한 생년월일(users/{uid}.birthDate) 기준 · 청소년보호법처럼 "연 나이" 19세 미만
//   · 생년월일을 입력하지 않은 계정 · 로그아웃 상태는 제한하지 않음
// - 콘텐츠 등급: TMDB 한국 등급
//   · 영화 /movie/{id}/release_dates → KR "18" · "청소년관람불가" · "제한상영가"
//   · 시리즈 /tv/{id}/content_ratings → KR "19" · "18"
//   · 한국 등급이 없으면 미국 NC-17 만 성인물로 봄 (R · TV-MA 는 한국에서 15세가 많아 제외)
// - 결과는 작품마다 localStorage 에 30일 저장 · 동시에 6개까지만 요청
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const STORE_KEY = "age-rating-v1";
const TTL = 30 * 24 * 60 * 60 * 1000;
const ADULT_AGE = 19;

const KR_MOVIE_ADULT = ["18", "19", "청소년관람불가", "제한상영가", "R18"];
const KR_TV_ADULT = ["19", "18", "청소년관람불가"];

// ---------- 미성년자 ----------
export const birthKey = (uid) => `birthDate:${uid}`;

// "YYYY/MM/DD" · "YYYY-MM-DD" → "YYYY-MM-DD"
export const normalizeBirth = (v) => {
  const m = /^(\d{4})[/.-]?(\d{2})[/.-]?(\d{2})$/.exec(String(v || "").trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
};

export const getBirthDate = (user) => {
  if (!user) return "";
  if (user.birthDate) return normalizeBirth(user.birthDate);
  try {
    return normalizeBirth(localStorage.getItem(birthKey(user.uid)));
  } catch {
    return "";
  }
};

// 연 나이 (올해 - 태어난 해)
export const koreanYearAge = (birth) => {
  const b = normalizeBirth(birth);
  if (!b) return null;
  return new Date().getFullYear() - Number(b.slice(0, 4));
};

export const isMinorUser = (user) => {
  const age = koreanYearAge(getBirthDate(user));
  return age != null && age < ADULT_AGE;
};

// ---------- 콘텐츠 등급 ----------
const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeOne = (key, adult) => {
  try {
    const all = readAll();
    all[key] = { adult, t: Date.now() };
    const keys = Object.keys(all);
    if (keys.length > 3000) delete all[keys[0]];
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    // 저장 못 해도 동작에는 영향 없음
  }
};

// 이미 아는 결과 (모르면 undefined)
export const knownAdult = (type, id) => {
  const hit = readAll()[`${type}_${id}`];
  return hit && Date.now() - hit.t < TTL ? hit.adult : undefined;
};

const pickAdult = (type, data) => {
  const results = data?.results || [];
  if (type === "movie") {
    const certs = (country) =>
      (results.find((r) => r.iso_3166_1 === country)?.release_dates || []).map((d) => String(d.certification || "").trim()).filter(Boolean);
    const kr = certs("KR");
    if (kr.length) return kr.some((c) => KR_MOVIE_ADULT.includes(c));
    return certs("US").includes("NC-17");
  }
  const rating = (country) => String(results.find((r) => r.iso_3166_1 === country)?.rating || "").trim();
  const kr = rating("KR");
  if (kr) return KR_TV_ADULT.includes(kr);
  return false;
};

// 동시에 6개까지만
const MAX_RUNNING = 6;
let running = 0;
const waiting = [];
const runLimited = (task) =>
  new Promise((resolve, reject) => {
    const start = () => {
      running += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          running -= 1;
          waiting.shift()?.();
        });
    };
    if (running < MAX_RUNNING) start();
    else waiting.push(start);
  });

const inflight = new Map();

// 청소년 관람불가인지 (true / false) — 확인하지 못하면 false
export const fetchIsAdult = (type, id) => {
  if (!TMDB_KEY || !id || !["movie", "tv"].includes(type)) return Promise.resolve(false);
  const known = knownAdult(type, id);
  if (known !== undefined) return Promise.resolve(known);
  const key = `${type}_${id}`;
  if (inflight.has(key)) return inflight.get(key);
  const path = type === "movie" ? `movie/${id}/release_dates` : `tv/${id}/content_ratings`;
  const task = runLimited(async () => {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/${path}?api_key=${TMDB_KEY}`);
      if (!res.ok) throw new Error(`TMDB ${res.status}`);
      const adult = pickAdult(type, await res.json());
      writeOne(key, adult);
      return adult;
    } catch {
      return false; // 다음에 다시 확인 (저장하지 않음)
    } finally {
      inflight.delete(key);
    }
  });
  inflight.set(key, task);
  return task;
};

// 주소 → { type, id } (작품 상세 주소만)
// - /movie/123 · /tv/123 · /search/title/movie/123 · /detail/123?type=tv
export const parseContentPath = (href) => {
  let url;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const p = url.pathname;
  let m = /^\/(movie|tv)\/(\d+)\/?$/.exec(p);
  if (m) return { type: m[1], id: m[2] };
  m = /^\/search\/title\/(movie|tv)\/(\d+)\/?$/.exec(p);
  if (m) return { type: m[1], id: m[2] };
  m = /^\/detail\/(\d+)\/?$/.exec(p);
  if (m) {
    const type = url.searchParams.get("type");
    return { type: type === "tv" ? "tv" : "movie", id: m[1] };
  }
  return null;
};
