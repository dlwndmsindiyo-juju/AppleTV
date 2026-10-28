// src/store/useWatchStore.js
// 시청 기록 (이어보기) — 계정 하나에 저장
// - Firestore: users/{uid}/watchHistory/{movie_123 | tv_456}
//   { id, type, title, backdrop_path, poster_path, genre,
//     season, episode, episodeName,   ← 시리즈만 (영화는 null)
//     videoKey,                       ← 마지막으로 재생한 영상 (같은 영상이면 이어서 재생)
//     position, duration,             ← 본 위치 · 전체 길이 (초)
//     updatedAt }                     ← 마지막으로 본 시각 (최근 순 정렬)
// - 재생 위치는 상세 페이지 재생 팝업(WatchPlayer)이 몇 초마다 저장
import { useEffect } from "react";
import { create } from "zustand";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export const WATCH_DONE_RATIO = 0.95; // 이만큼 보면 다 본 작품 → 이어보기에서 빠짐
const HISTORY_LIMIT = 30;

export const watchKey = (type, id) => `${type === "tv" ? "tv" : "movie"}_${id}`;

// 이어볼 수 있는 기록인지 (조금이라도 봤고, 끝까지 보지 않음)
export const isResumable = (h) =>
  Boolean(h && h.duration > 0 && h.position > 0 && h.position / h.duration < WATCH_DONE_RATIO);

// 같은 영상을 다시 열 때 시작 위치 (다 본 영상은 처음부터)
export const resumeAt = (h, videoKey) =>
  h && h.videoKey === videoKey && isResumable(h) ? Math.floor(h.position) : 0;

const historyRef = (uid) => collection(db, "users", uid, "watchHistory");

// 재생 기록 지우기 (계정 설정) — 이 계정의 시청 기록 문서를 모두 삭제
export const clearWatchHistory = async (uid) => {
  if (!uid) return;
  const snap = await getDocs(historyRef(uid));
  const docs = snap.docs || [];
  // 한 번에 최대 500개까지 묶어서 삭제
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
};

let unsubscribe = null;

export const useWatchStore = create((set, get) => ({
  uid: null,
  status: "idle", // idle | loading | ready | error
  items: [], // 최근에 본 순서

  // 로그인 계정의 시청 기록 실시간 연결 (uid 가 없으면 연결 해제)
  onConnect: (uid) => {
    if (get().uid === uid && (uid ? unsubscribe : true)) return;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (!uid) {
      set({ uid: null, status: "idle", items: [] });
      return;
    }
    set({ uid, status: "loading", items: [] });
    unsubscribe = onSnapshot(
      query(historyRef(uid), orderBy("updatedAt", "desc"), limit(HISTORY_LIMIT)),
      (snap) => {
        const items = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
        set({ status: "ready", items });
      },
      (error) => {
        console.error("시청 기록 불러오기 실패:", error);
        set({ status: "error" });
      }
    );
  },

  // 작품의 시청 기록 하나 (없으면 undefined)
  getEntry: (type, id) => get().items.find((h) => h.type === type && h.id === id),

  // 재생 위치 저장
  onSaveProgress: async (entry) => {
    const { uid } = get();
    if (!uid || !entry?.id || !(entry.duration > 0)) return;
    const type = entry.type === "tv" ? "tv" : "movie";
    const data = {
      id: entry.id,
      type,
      title: String(entry.title || "").slice(0, 200),
      backdrop_path: entry.backdrop_path || null,
      poster_path: entry.poster_path || null,
      genre: entry.genre || null,
      season: type === "tv" ? entry.season ?? null : null,
      episode: type === "tv" ? entry.episode ?? null : null,
      episodeName: type === "tv" ? entry.episodeName || null : null,
      videoKey: entry.videoKey || null,
      position: Math.max(0, Math.round(entry.position)),
      duration: Math.round(entry.duration),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, "users", uid, "watchHistory", watchKey(type, entry.id)), data);
    } catch (error) {
      console.error("시청 기록 저장 실패:", error);
    }
  },
}));

// 컴포넌트에서: useWatchConnect(user?.uid) — 로그인 · 로그아웃에 맞춰 연결
export const useWatchConnect = (uid) => {
  const onConnect = useWatchStore((s) => s.onConnect);
  useEffect(() => {
    onConnect(uid || null);
  }, [uid, onConnect]);
};
