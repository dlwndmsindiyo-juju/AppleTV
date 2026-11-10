// src/utils/youtubePlayable.js
// [추가] 사이트 안에서 재생할 수 없는 YouTube 영상을 미리 걸러냄
// - YouTube Data API videos?part=contentDetails,status (영상 50개까지 한 번에 · 1유닛)
// - 빼는 영상
//   · 연령 제한: contentDetails.contentRating.ytRating === "ytAgeRestricted" (다른 사이트에 넣으면 재생 안 됨)
//   · 퍼가기 금지: status.embeddable === false
//   · 비공개 · 한국에서 막힌 영상: status.privacyStatus === "private" · regionRestriction 에 KR 차단
//   · 삭제된 영상: videos 응답에 아예 없음
// - 결과는 영상마다 localStorage 에 7일 저장 → 같은 영상은 다시 묻지 않음
// - 키가 없거나 요청이 실패하면 걸러내지 않고 그대로 둠 (영상 목록이 통째로 사라지지 않게)
import { useEffect, useMemo, useState } from "react";

const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const STORE_KEY = "yt-playable-v1";
const TTL = 7 * 24 * 60 * 60 * 1000;
const REGION = "KR";

const readAll = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeAll = (all) => {
  try {
    // 너무 많이 쌓이면 오래된 것부터 정리 (최대 1000개)
    const entries = Object.entries(all);
    const trimmed = entries.length > 1000 ? Object.fromEntries(entries.sort((a, b) => b[1].t - a[1].t).slice(0, 1000)) : all;
    localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch {
    // 저장 못 해도 동작에는 영향 없음
  }
};

// videos API 응답 한 개 → 사이트 안에서 재생 가능한지
export const isPlayableVideo = (video) => {
  if (!video) return false;
  if (video.contentDetails?.contentRating?.ytRating === "ytAgeRestricted") return false;
  if (video.status && video.status.embeddable === false) return false;
  if (video.status?.privacyStatus === "private") return false;
  const region = video.contentDetails?.regionRestriction;
  if (region?.blocked?.includes(REGION)) return false;
  if (region?.allowed && !region.allowed.includes(REGION)) return false;
  return true;
};

const inflight = new Map(); // 같은 영상을 동시에 묻지 않게

// 영상 id 목록 → 재생 가능한 id 의 Set
export const checkPlayable = async (ids = []) => {
  const list = [...new Set(ids.filter(Boolean))];
  if (!list.length || !YOUTUBE_KEY) return new Set(list);

  const now = Date.now();
  const saved = readAll();
  const unknown = list.filter((id) => !saved[id] || now - saved[id].t > TTL);

  // 아직 모르는 영상만 50개씩 묻기
  const batches = [];
  for (let i = 0; i < unknown.length; i += 50) batches.push(unknown.slice(i, i + 50));
  await Promise.all(
    batches.map((batch) => {
      const key = batch.join(",");
      if (!inflight.has(key)) {
        const task = (async () => {
          try {
            const qs = new URLSearchParams({ part: "contentDetails,status", id: key, key: YOUTUBE_KEY });
            const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${qs}`);
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error?.message || `YouTube videos HTTP ${res.status}`);
            const found = Object.fromEntries((data.items || []).map((v) => [v.id, isPlayableVideo(v)]));
            const all = readAll();
            const t = Date.now();
            batch.forEach((id) => {
              all[id] = { ok: Boolean(found[id]), t }; // 응답에 없으면 삭제 · 비공개 영상
            });
            writeAll(all);
          } catch (error) {
            console.warn("[youtubePlayable] 확인 실패 — 이번에는 걸러내지 않음:", error.message);
          } finally {
            inflight.delete(key);
          }
        })();
        inflight.set(key, task);
      }
      return inflight.get(key);
    }),
  );

  const result = readAll();
  // 확인하지 못한 영상(요청 실패)은 재생 가능으로 둠
  return new Set(list.filter((id) => result[id]?.ok !== false));
};

// 목록(배열)에서 재생할 수 없는 영상 빼기 — getId(item) 로 영상 id 꺼냄
export const filterPlayable = async (items = [], getId = (v) => v?.id?.videoId || v?.id) => {
  const ok = await checkPlayable(items.map(getId));
  return items.filter((item) => {
    const id = getId(item);
    return !id || ok.has(id);
  });
};

// [화면용] 고정 데이터 · TMDB 예고편처럼 화면에서 가진 영상 id 목록을 걸러 씀
// - 반환: 재생 가능한 id 의 Set (확인 중에는 이미 저장된 결과만 반영 · 모르는 영상은 일단 보여 줌)
export const usePlayableIds = (ids = []) => {
  const key = ids.filter(Boolean).join(",");
  const initial = useMemo(() => {
    const saved = readAll();
    return new Set(ids.filter((id) => id && saved[id]?.ok !== false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const [playable, setPlayable] = useState(initial);

  useEffect(() => {
    let alive = true;
    setPlayable(initial);
    if (!key) return undefined;
    checkPlayable(key.split(",")).then((set) => alive && setPlayable(set));
    return () => {
      alive = false;
    };
  }, [key, initial]);

  return playable;
};
