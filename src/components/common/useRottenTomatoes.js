// src/components/common/useRottenTomatoes.js
// [추가] 로튼 토마토 평론가 점수 (OMDb API) — 상세 · 홈 히어로 배지 줄(InfoBadges)에서 사용
// - 순서: TMDB external_ids 로 IMDb id(tt…) 찾기 → OMDb 에서 Ratings 중 "Rotten Tomatoes" 값("54%")
// - 키: .env 의 VITE_OMDb_API_KEY (Vercel 환경 변수에도 같은 이름으로 넣어야 배포 사이트에서 보임)
// - 점수가 없는 작품(특히 시리즈는 OMDb 에 없는 경우가 많음) · 키가 없거나 요청 실패 → "" (배지 숨김)
// - 같은 작품은 한 번만 요청 · 무료 키는 하루 1,000회라 sessionStorage 에도 저장 (탭을 닫으면 지워짐)
import { useEffect, useState } from "react";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const OMDB_KEY = import.meta.env.VITE_OMDb_API_KEY;
const STORE_KEY = "rt-score-v1";

const memory = new Map(); // "tv_123" → Promise<"54%" | "">

const readStore = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeStore = (key, value) => {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), [key]: value }));
  } catch {
    // 저장 못 해도 화면에는 영향 없음
  }
};

const fetchScore = async (type, id) => {
  const ids = await fetch(`https://api.themoviedb.org/3/${type}/${id}/external_ids?api_key=${TMDB_KEY}`).then((r) =>
    r.ok ? r.json() : {},
  );
  const imdbId = ids.imdb_id;
  if (!imdbId) return "";
  const omdb = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbId}`).then((r) => (r.ok ? r.json() : {}));
  const rt = (omdb.Ratings || []).find((x) => x.Source === "Rotten Tomatoes")?.Value || "";
  return /^\d{1,3}%$/.test(rt) ? rt : "";
};

const loadScore = (type, id) => {
  const key = `${type}_${id}`;
  if (!memory.has(key)) {
    const saved = readStore()[key];
    if (saved !== undefined) {
      memory.set(key, Promise.resolve(saved));
    } else {
      memory.set(
        key,
        fetchScore(type, id)
          .then((score) => {
            writeStore(key, score);
            return score;
          })
          .catch(() => {
            memory.delete(key); // 실패하면 다음에 다시 시도
            return "";
          }),
      );
    }
  }
  return memory.get(key);
};

// type: "tv" | "movie" · id: TMDB id → "54%" | ""
export const useRottenTomatoes = (type, id) => {
  const key = `${type}_${id}`;
  const [state, setState] = useState({ key: null, score: "" });

  useEffect(() => {
    if (!OMDB_KEY || !TMDB_KEY || !id || (type !== "tv" && type !== "movie")) return undefined;
    let alive = true;
    loadScore(type, id).then((score) => {
      if (alive) setState({ key, score });
    });
    return () => {
      alive = false;
    };
  }, [type, id, key]);

  return state.key === key ? state.score : "";
};
