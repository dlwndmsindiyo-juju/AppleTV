// src/store/useWatchStore.js
// 시청 기록 (이어보기) — [수정] 프로필마다 따로 저장 (문서 id 앞에 프로필 접두어)
// - Firestore: users/{uid}/watchHistory/{movie_123 | tv_456}
//   { id, type, title, backdrop_path, poster_path, genre,
//     season, episode, episodeName,   ← 시리즈만 (영화는 null)
//     videoKey,                       ← 마지막으로 재생한 영상 (같은 영상이면 이어서 재생)
//     position, duration,             ← 본 위치 · 전체 길이 (초)
//     updatedAt,                      ← 마지막으로 본 시각 (최근 순 정렬)
//     profileId }                     ← [추가] 어느 프로필의 기록인지 (서버에서 프로필별로 골라 받기)
// - 재생 위치는 상세 페이지 재생 팝업(WatchPlayer)이 몇 초마다 저장
// - [수정] 다른 프로필 기록이 많으면 이어보기가 빠지던 문제 (리뷰 P2)
//   · 예전: 계정 전체 최신 150개를 받은 뒤 프로필로 걸러서, 다른 프로필 기록 150개 뒤에 있는 기록은 안 보였음
//   · 지금: where(profileId == 지금 프로필) → orderBy(updatedAt desc) → limit(30) 으로 서버에서 프로필 것만 받음
//     (복합 인덱스 필요: watchHistory · profileId ASC + updatedAt DESC)
//   · profileId 가 없는 예전 기록: 접속할 때 문서 id 로 프로필을 알아내 profileId 를 채움(이관)
//     → 이관 전 · 실패 시에도 예전 방식 결과를 합쳐 보여줌 (이어보기가 비지 않게)
//   · 인덱스가 아직 없으면(쿼리 오류) 예전 방식으로만 동작
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
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuthStore } from "./useAuthStore";

export const WATCH_DONE_RATIO = 0.95; // 이만큼 보면 다 본 작품 → 이어보기에서 빠짐
const HISTORY_LIMIT = 30;
const FETCH_LIMIT = 150; // 예전 기록(profileId 없음)용 — 계정 전체 최신 기록을 받아 프로필 것만 남김

// [추가] 프로필별 시청 기록 — 문서 id 앞에 "{프로필 id}__" (첫 프로필 "main" 은 예전처럼 접두어 없음)
const prefixOf = (pid) => (!pid || pid === "main" ? "" : `${pid}__`);
const ownDoc = (id, pid) => (prefixOf(pid) ? id.startsWith(prefixOf(pid)) : !id.includes("__"));
// [추가] 문서 id 로 프로필 알아내기 (예전 기록 이관용) — "B__movie_1" → "B" · "movie_1" → "main"
const profileOfDoc = (id) => (id.includes("__") ? id.split("__")[0] : "main");

export const watchKey = (type, id) => `${type === "tv" ? "tv" : "movie"}_${id}`;

// 이어볼 수 있는 기록인지 (조금이라도 봤고, 끝까지 보지 않음)
export const isResumable = (h) =>
  Boolean(h && h.duration > 0 && h.position > 0 && h.position / h.duration < WATCH_DONE_RATIO);

// 같은 영상을 다시 열 때 시작 위치 (다 본 영상은 처음부터)
export const resumeAt = (h, videoKey) =>
  h && h.videoKey === videoKey && isResumable(h) ? Math.floor(h.position) : 0;

const historyRef = (uid) => collection(db, "users", uid, "watchHistory");

// 재생 기록 지우기 (계정 설정) — [수정] 그 프로필의 시청 기록 문서만 삭제
export const clearWatchHistory = async (uid, pid = "main") => {
  if (!uid) return;
  const snap = await getDocs(historyRef(uid));
  const docs = (snap.docs || []).filter((d) => ownDoc(d.id, pid));
  // 한 번에 최대 500개까지 묶어서 삭제
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
};

let unsubscribe = null;
const backfilled = new Set(); // [추가] 이번 실행에서 이관을 끝낸 계정
// [추가] 배포된 보안 규칙이 profileId 를 아직 허용하지 않으면(예전 규칙) 이번 실행 동안은 profileId 없이 저장
// - 규칙(firestore.rules)을 배포하기 전에도 이어보기 저장이 거부되지 않게
let profileIdRejected = false;

// [추가] profileId 가 없는 예전 기록에 profileId 채우기 (계정당 한 번 · 실패해도 화면은 예전 방식으로 보임)
// - 보안 규칙이 profileId 만 추가하는 수정을 허용해야 함 (updatedAt 은 그대로 → 최근 순서가 바뀌지 않음)
const backfillProfileIds = async (uid) => {
  if (backfilled.has(uid)) return;
  backfilled.add(uid);
  try {
    const snap = await getDocs(historyRef(uid));
    const todo = (snap.docs || []).filter((d) => !d.data().profileId);
    for (let i = 0; i < todo.length; i += 450) {
      const batch = writeBatch(db);
      todo.slice(i, i + 450).forEach((d) => batch.update(d.ref, { profileId: profileOfDoc(d.id) }));
      await batch.commit();
    }
  } catch (error) {
    backfilled.delete(uid); // 다음 접속 때 다시 시도
    console.warn("시청 기록 profileId 이관 실패 (보안 규칙 확인):", error?.code || error?.message);
  }
};

// [추가] 두 결과 합치기 — 같은 작품은 하나 · 최근 순 · 30개
const mergeHistory = (lists) => {
  const map = new Map();
  lists.flat().forEach((h) => {
    const k = watchKey(h.type, h.id);
    const t = (x) => x?.updatedAt?.toMillis?.() ?? 0;
    if (!map.has(k) || t(h) > t(map.get(k))) map.set(k, h);
  });
  return [...map.values()]
    .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0))
    .slice(0, HISTORY_LIMIT);
};

export const useWatchStore = create((set, get) => ({
  uid: null,
  pid: "main", // [추가] 지금 연결된 프로필
  status: "idle", // idle | loading | ready | error
  items: [], // 최근에 본 순서

  // 로그인 계정 · 프로필의 시청 기록 실시간 연결 (uid 가 없으면 연결 해제)
  onConnect: (uid, pid = "main") => {
    const profile = pid || "main";
    if (get().uid === uid && get().pid === profile && (uid ? unsubscribe : true)) return;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (!uid) {
      set({ uid: null, pid: profile, status: "idle", items: [] });
      return;
    }
    set({ uid, pid: profile, status: "loading", items: [] });

    // [수정] 두 갈래로 받아 합침
    //   ① 새 방식: 이 프로필 기록만 서버에서 (profileId)
    //   ② 예전 방식: profileId 가 없는 예전 기록 (이관이 끝나면 비게 됨)
    // - [수정] 예전 방식 결과는 받은 그대로 두고, 합치는 시점(publish)에 거름
    //   · 예전: 예전 방식 결과가 먼저 오면 그때 profileId 있는 기록을 빼 버림 → 그 뒤 ① 이 실패하면 목록이 빔
    const parts = { scoped: null, legacy: null };
    let scopedFailed = false;
    const publish = () => {
      if (parts.legacy === null || (parts.scoped === null && !scopedFailed)) return; // 둘 다 받은 뒤
      // ① 이 동작하면 profileId 있는 기록은 ① 에서 받으므로 예전 결과에서는 profileId 없는 것만 · 실패했으면 전부
      const legacy = scopedFailed ? parts.legacy : parts.legacy.filter((h) => !h.profileId);
      set({ status: "ready", items: mergeHistory([scopedFailed ? [] : parts.scoped || [], legacy]) });
    };
    const unsubs = [];
    unsubs.push(
      onSnapshot(
        query(historyRef(uid), where("profileId", "==", profile), orderBy("updatedAt", "desc"), limit(HISTORY_LIMIT)),
        (snap) => {
          parts.scoped = snap.docs.map((d) => d.data({ serverTimestamps: "estimate" }));
          publish();
        },
        (error) => {
          // 복합 인덱스가 아직 없거나 규칙 문제 → 예전 방식만으로 보여줌
          console.warn("프로필별 시청 기록 쿼리 실패 → 예전 방식으로 표시:", error?.code || error?.message);
          scopedFailed = true;
          publish();
        }
      )
    );
    unsubs.push(
      onSnapshot(
        query(historyRef(uid), orderBy("updatedAt", "desc"), limit(FETCH_LIMIT)),
        (snap) => {
          parts.legacy = snap.docs
            .filter((d) => ownDoc(d.id, profile))
            .map((d) => d.data({ serverTimestamps: "estimate" })); // [수정] 여기서는 거르지 않음 (publish 에서)
          publish();
        },
        (error) => {
          console.error("시청 기록 불러오기 실패:", error);
          if (scopedFailed) set({ status: "error" });
          else {
            parts.legacy = [];
            publish();
          }
        }
      )
    );
    unsubscribe = () => unsubs.forEach((u) => u());
    backfillProfileIds(uid);
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
    const pid = get().pid || "main";
    const ref = doc(db, "users", uid, "watchHistory", prefixOf(pid) + watchKey(type, entry.id));
    try {
      // [추가] profileId: 프로필별 조회용 (예전 규칙이 거부한 적이 있으면 빼고 저장)
      await setDoc(ref, profileIdRejected ? data : { ...data, profileId: pid });
    } catch (error) {
      // [추가] 예전 규칙(profileId 미허용) → profileId 없이 한 번 더 저장 · 이후에도 빼고 저장
      if (error?.code === "permission-denied" && !profileIdRejected) {
        profileIdRejected = true;
        console.warn("보안 규칙이 profileId 를 허용하지 않아 예전 방식으로 저장합니다 (firestore.rules 배포 필요).");
        try {
          await setDoc(ref, data);
          return;
        } catch (retryError) {
          console.error("시청 기록 저장 실패:", retryError);
          return;
        }
      }
      console.error("시청 기록 저장 실패:", error);
    }
  },
}));

// 컴포넌트에서: useWatchConnect(user?.uid) — 로그인 · 로그아웃 · [추가] 프로필 변경에 맞춰 연결
export const useWatchConnect = (uid) => {
  const onConnect = useWatchStore((s) => s.onConnect);
  const pid = useAuthStore((s) => s.currentProfileId);
  useEffect(() => {
    onConnect(uid || null, pid || "main");
  }, [uid, pid, onConnect]);
};
