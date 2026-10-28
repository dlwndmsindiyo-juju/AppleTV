// src/store/useHeartStore.js (위시리스트 스토어)
// 위시리스트 (시안: 위시리스트 · 어떤 그룹에 추가할까요? · 새 그룹 만들기 · 추가 토스트)
// 저장 위치: Firestore 계정
//   users/{uid}/wishlist/{movie_123}  작품 { id, type, title, poster_path, backdrop_path, genres, overview, addedAt, groups[] }
//   users/{uid}/wishGroups/{groupId} 그룹 { name, icon, order, createdAt }
// - 처음 로그인하면 기본 그룹 6개를 만들고, 이 브라우저에 남아 있던 예전 찜 목록(localStorage)을 옮겨 옴
// - 하트 → 담기 → "어떤 그룹에 추가할까요?" 팝업 → 그룹 체크 → "OO에 추가되었어요" 토스트
import { create } from "zustand";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

// 시안의 기본 그룹 6개 (아이콘: public/icons/wishlist/{icon}.svg)
export const DEFAULT_GROUPS = [
  { id: "later", name: "나중에 볼 작품", icon: "bookmark" },
  { id: "horror", name: "호러", icon: "unhappy" },
  { id: "kids", name: "키즈", icon: "kid" },
  { id: "comedy", name: "코미디", icon: "happy" },
  { id: "romance", name: "로맨스", icon: "romance" },
  { id: "series", name: "시리즈", icon: "series" },
];

// 예전 기본 아이콘 이름 → 시안 아이콘 (이미 만들어진 기본 그룹도 시안 아이콘으로 보이게)
export const ICON_ALIAS = {
  "face-horror": "unhappy",
  baby: "kid",
  "face-smile": "happy",
  heart: "romance",
  tv: "series",
};

// 새 그룹 만들기에서 고를 수 있는 아이콘 (받은 1차 아이콘 · 나머지는 받는 대로 추가)
export const GROUP_ICONS = [
  "bookmark",
  "unhappy",
  "kid",
  "happy",
  "romance",
  "series",
  "face-smile",
  "basketball",
  "diamond",
  "car",
  "devil",
  "face-nomal",
  "face-baby-smile",
  "face-surprise",
  "face-horror",
  "baby",
  "clover",
  "spade",
  "heart",
  "tv",
];

export const GROUP_NAME_MAX = 30;

export const wishKey = (type, id) => `${type === "tv" ? "tv" : "movie"}_${id}`;

// 1000 이상은 "1000+"
export const formatCount = (n) => (n > 999 ? "1000+" : String(n));

const userRef = (uid) => doc(db, "users", uid);
const itemsCol = (uid) => collection(userRef(uid), "wishlist");
const groupsCol = (uid) => collection(userRef(uid), "wishGroups");

// 예전 찜 목록 (useMovieStore 가 localStorage "wishlist" 에 저장하던 것)
const readLegacy = () => {
  try {
    return JSON.parse(localStorage.getItem("wishlist")) || [];
  } catch {
    return [];
  }
};
const clearLegacy = () => {
  try {
    localStorage.removeItem("wishlist");
  } catch {
    /* 무시 */
  }
};

// 작품 상세(장르 · 줄거리)를 TMDB 에서 받아 카드에 쓸 정보로 정리
const fetchDetail = async (type, id) => {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=ko-KR`
    );
    if (!res.ok) return {};
    const d = await res.json();
    return {
      title: d.title || d.name || "",
      poster_path: d.poster_path || null,
      backdrop_path: d.backdrop_path || null,
      genres: (d.genres || []).map((g) => g.name).slice(0, 3),
      overview: d.overview || "",
    };
  } catch {
    return {};
  }
};

let unsubs = [];

export const useHeartStore = create((set, get) => ({
  uid: null,
  ready: false,
  items: {}, // { "movie_1": item }
  groups: [], // [{ id, name, icon, order }]

  // UI: 그룹 선택 팝업 · 새 그룹 만들기 · 토스트
  pickerKey: null, // 그룹을 고를 작품 key
  newGroupOpen: false,
  toast: null, // { text, groupId }

  // ---------- 로그인 계정 연결 (App 에서 user 가 바뀔 때 호출) ----------
  onConnect: (uid) => {
    if (get().uid === uid) return;
    unsubs.forEach((u) => u());
    unsubs = [];
    set({ uid, ready: false, items: {}, groups: [], pickerKey: null, newGroupOpen: false, toast: null });
    if (!uid) return;

    let firstGroups = true;
    unsubs.push(
      onSnapshot(groupsCol(uid), async (snap) => {
        const groups = snap.docs
          .map((d) => {
            const g = { id: d.id, ...d.data() };
            // 기본 그룹은 시안 아이콘으로 (예전에 만들어진 그룹 포함)
            const def = DEFAULT_GROUPS.find((x) => x.id === g.id);
            return def && ICON_ALIAS[g.icon] ? { ...g, icon: def.icon } : g;
          })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        // 처음 한 번: 그룹이 하나도 없으면 기본 그룹 6개 만들기
        if (firstGroups && groups.length === 0) {
          firstGroups = false;
          const batch = writeBatch(db);
          DEFAULT_GROUPS.forEach((g, i) =>
            batch.set(doc(groupsCol(uid), g.id), {
              name: g.name,
              icon: g.icon,
              order: i,
              createdAt: serverTimestamp(),
            })
          );
          await batch.commit().catch((e) => console.error("기본 그룹 생성 실패:", e));
          return;
        }
        firstGroups = false;
        set({ groups });
      })
    );

    let firstItems = true;
    unsubs.push(
      onSnapshot(itemsCol(uid), (snap) => {
        const items = {};
        snap.docs.forEach((d) => {
          const data = d.data({ serverTimestamps: "estimate" });
          items[d.id] = {
            ...data,
            key: d.id,
            groups: data.groups || [],
            addedAt: data.addedAt?.toMillis?.() || Date.now(),
          };
        });
        set({ items, ready: true });

        // 처음 한 번: 이 브라우저에 남은 예전 찜 목록 옮기기
        if (firstItems) {
          firstItems = false;
          const legacy = readLegacy();
          if (legacy.length) {
            legacy.forEach((w) =>
              get().onAdd({ id: w.id, type: w.type, title: w.title || w.name, poster_path: w.poster_path }, { silent: true })
            );
            clearLegacy();
          }
        }
      })
    );
  },

  isWished: (type, id) => Boolean(get().items[wishKey(type, id)]),

  // ---------- 담기 / 빼기 ----------
  // content: { id, type, title|name, poster_path, backdrop_path?, genre_ids?, overview? }
  onAdd: async (content, { silent = false } = {}) => {
    const { uid, items } = get();
    if (!uid || !content?.id) return null;
    const type = content.type === "tv" ? "tv" : "movie";
    const key = wishKey(type, content.id);
    if (items[key]) return key;

    const base = {
      id: content.id,
      type,
      title: content.title || content.name || "",
      poster_path: content.poster_path || null,
      backdrop_path: content.backdrop_path || null,
      genres: [],
      overview: content.overview || "",
      groups: [],
    };
    // 화면 먼저 반영
    set((s) => ({ items: { ...s.items, [key]: { ...base, key, addedAt: Date.now() } } }));
    if (!silent) set({ pickerKey: key });

    try {
      const detail = await fetchDetail(type, content.id);
      await setDoc(doc(itemsCol(uid), key), {
        ...base,
        ...Object.fromEntries(Object.entries(detail).filter(([, v]) => v)),
        addedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("위시리스트 담기 실패:", error);
      set((s) => {
        const next = { ...s.items };
        delete next[key];
        return { items: next, pickerKey: null };
      });
      return null;
    }
    return key;
  },

  onRemove: async (key) => {
    const { uid, items } = get();
    if (!uid || !items[key]) return;
    const prev = items[key];
    set((s) => {
      const next = { ...s.items };
      delete next[key];
      return { items: next, toast: { text: "위시리스트에서 삭제했어요." } };
    });
    try {
      await deleteDoc(doc(itemsCol(uid), key));
    } catch (error) {
      console.error("위시리스트 삭제 실패:", error);
      set((s) => ({ items: { ...s.items, [key]: prev } }));
    }
  },

  // 하트 버튼: 없으면 담기(+그룹 팝업), 있으면 빼기
  onToggle: (content) => {
    const type = content.type === "tv" ? "tv" : "movie";
    const key = wishKey(type, content.id);
    if (get().items[key]) get().onRemove(key);
    else get().onAdd(content);
  },

  // ---------- 그룹 ----------
  onToggleGroup: async (key, groupId) => {
    const { uid, items, groups } = get();
    const item = items[key];
    if (!uid || !item) return;
    const inGroup = item.groups.includes(groupId);
    const nextGroups = inGroup ? item.groups.filter((g) => g !== groupId) : [...item.groups, groupId];
    const group = groups.find((g) => g.id === groupId);

    set((s) => ({
      items: { ...s.items, [key]: { ...item, groups: nextGroups } },
      toast: inGroup
        ? { text: `${group?.name || "그룹"}에서 뺐어요.` }
        : { text: `${group?.name || "그룹"} 모음에 추가되었어요.`, groupId },
    }));
    try {
      await updateDoc(doc(itemsCol(uid), key), { groups: nextGroups });
    } catch (error) {
      console.error("그룹 변경 실패:", error);
      set((s) => ({ items: { ...s.items, [key]: item } }));
    }
  },

  onCreateGroup: async (name, icon) => {
    const { uid, groups, pickerKey } = get();
    const clean = name.trim().slice(0, GROUP_NAME_MAX);
    if (!uid || !clean) return null;
    const ref = doc(groupsCol(uid));
    const order = groups.reduce((m, g) => Math.max(m, g.order ?? 0), 0) + 1;
    try {
      await setDoc(ref, { name: clean, icon, order, createdAt: serverTimestamp() });
      set({ newGroupOpen: false });
      // 그룹 고르던 작품이 있으면 새 그룹에 바로 담기
      if (pickerKey) {
        set((s) => ({ groups: [...s.groups, { id: ref.id, name: clean, icon, order }] }));
        await get().onToggleGroup(pickerKey, ref.id);
      }
      return ref.id;
    } catch (error) {
      console.error("새 그룹 만들기 실패:", error);
      return null;
    }
  },

  // ---------- 팝업 · 토스트 ----------
  onOpenPicker: (key) => set({ pickerKey: key }),
  onClosePicker: () => set({ pickerKey: null }),
  onOpenNewGroup: () => set({ newGroupOpen: true }),
  onCloseNewGroup: () => set({ newGroupOpen: false }),
  onCloseToast: () => set({ toast: null }),
}));

// 컴포넌트용: 하트 상태 + 토글 (로그인 전에는 로그인 안내 팝업)
export const useWish = (type, id) => {
  const wished = useHeartStore((s) => Boolean(s.items[wishKey(type, id)]));
  const uid = useHeartStore((s) => s.uid);
  const onToggle = useHeartStore((s) => s.onToggle);
  const toggle = (content) => {
    if (!uid) {
      window.dispatchEvent(new CustomEvent("subscribe-gate:open", { detail: { reason: "account" } }));
      return;
    }
    onToggle({ id, type, ...content });
  };
  return { wished, toggle };
};

// 컴포넌트에서 바로 쓰는 토글 (로그인 전에는 로그인 안내 팝업)
export const toggleWish = (content) => {
  const s = useHeartStore.getState();
  if (!s.uid) {
    window.dispatchEvent(new CustomEvent("subscribe-gate:open", { detail: { reason: "account" } }));
    return;
  }
  s.onToggle(content);
};
