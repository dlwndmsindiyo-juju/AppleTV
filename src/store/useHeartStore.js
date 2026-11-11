// src/store/useHeartStore.js (위시리스트 스토어)
// 위시리스트 (시안: 위시리스트 · 어떤 그룹에 추가할까요? · 새 그룹 만들기 · 추가 토스트)
// 저장 위치: Firestore 계정
//   users/{uid}/wishlist/{movie_123}  작품 { id, type, title, poster_path, backdrop_path, genres, overview, addedAt, groups[] }
//   users/{uid}/wishGroups/{groupId} 그룹 { name, icon, order, createdAt }
// - 처음 로그인하면 이 브라우저에 남아 있던 예전 찜 목록(localStorage)을 옮겨 옴
// - [수정] 기본 그룹은 "전체" + "나중에 볼 작품" 둘만 (나중에 볼 작품이 없으면 만들어 둠 · 삭제 불가)
//   · 예전 기본 그룹(호러 · 키즈 · 코미디 · 로맨스 · 시리즈)은 처음 연결될 때 지움 → 담긴 작품은 "전체"에 그대로
//   · 그 밖의 그룹은 사용자가 [새 그룹 만들기]로 추가하고, 위시리스트 왼쪽 메뉴에서 삭제
// - 하트 → 담기 → "어떤 그룹에 추가할까요?" 팝업 → 그룹 체크 → [추가하기] → "OO에 추가되었어요" 토스트
//   · [수정] 체크는 팝업 안에서만 고르고(pickerDraft) [추가하기]를 눌러야 저장
// - [수정] 프로필 · 계정이 바뀌는 중에도 저장이 엉뚱한 곳으로 가지 않게 (리뷰 P1)
//   · 저장 작업은 시작할 때의 계정(uid) · 프로필(pid) · 연결 번호(connGen)를 고정해서 씀 (await 뒤에 다시 읽지 않음)
//   · 저장이 끝난 뒤 화면 갱신 · 실패 되돌리기는 "지금 연결이 시작 때와 같고 · 그 작품의 마지막 작업일 때"만
//   · 같은 작품의 담기 → 빼기 → 그룹 변경은 순서대로 실행 (응답 순서가 뒤바뀌어 빠진 작품이 되살아나지 않게)
// - [수정] 예전 찜 목록 이관: 저장에 성공한 것만 이 브라우저에서 지우고, 실패한 것은 남겨 다음 접속 때 다시 시도 (리뷰 P1)
//   · 정책: 이 브라우저의 예전 찜 목록은 이 브라우저에서 처음 로그인한 계정의 첫 프로필로 옮김 → 옮긴 뒤 토스트로 알림
import { create } from "zustand";
import {
  collection,
  arrayRemove,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { openSubscribeGate } from "../utils/subscribeGate"; // [정리] 로그인 안내 팝업 열기 공용

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;

// 예전 기본 그룹 6개 (아이콘: public/icons/wishlist/{icon}.svg)
// - [수정] "나중에 볼 작품"(FIXED_GROUP)만 기본으로 남기고 나머지(RETIRED_GROUPS)는 지움
export const DEFAULT_GROUPS = [
  { id: "later", name: "나중에 볼 작품", icon: "bookmark" },
  { id: "horror", name: "호러", icon: "unhappy" },
  { id: "kids", name: "키즈", icon: "kid" },
  { id: "comedy", name: "코미디", icon: "happy" },
  { id: "romance", name: "로맨스", icon: "romance" },
  { id: "series", name: "시리즈", icon: "series" },
];

export const FIXED_GROUP = DEFAULT_GROUPS[0]; // 나중에 볼 작품 — 삭제 불가
const RETIRED_GROUPS = DEFAULT_GROUPS.slice(1).map((g) => g.id); // 호러 · 키즈 · 코미디 · 로맨스 · 시리즈

// [추가] 그룹 지우기 — 그룹 문서 + 작품에 붙어 있던 그룹 표시까지 (작품은 "전체"에 그대로)
const purgeGroups = async (uid, pre, ids, itemDocs) => {
  if (!ids.length) return;
  const batch = writeBatch(db);
  ids.forEach((gid) => batch.delete(doc(groupsCol(uid), pre + gid)));
  itemDocs.forEach(({ id, groups = [] }) => {
    const hit = groups.filter((g) => ids.includes(g));
    if (hit.length) batch.update(doc(itemsCol(uid), pre + id), { groups: arrayRemove(...hit) });
  });
  await batch.commit();
};

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

// [추가] 프로필별 위시리스트 — 문서 id 앞에 "{프로필 id}__" (첫 프로필 "main" 은 예전처럼 접두어 없음)
// - 같은 컬렉션(users/{uid}/wishlist · wishGroups)을 그대로 써서 Firestore 보안 규칙을 바꾸지 않아도 됨
const prefixOf = (pid) => (!pid || pid === "main" ? "" : `${pid}__`);
const ownDoc = (id, pid) => (prefixOf(pid) ? id.startsWith(prefixOf(pid)) : !id.includes("__"));
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

// ---------- [추가] 연결 번호 · 작품별 작업 순서 (리뷰 P1) ----------
// - onConnect 때마다 connGen 이 올라감 → 예전 연결에서 시작한 작업은 화면을 건드리지 않음
let connGen = 0;
const keyQueues = new Map(); // "연결번호:작품key" → 마지막 작업 Promise
const keyVersions = new Map(); // "연결번호:작품key#exist|#groups" → 마지막 작업 번호 (담기·빼기 / 그룹 변경 따로)
const qKey = (sc, key) => `${sc.gen}:${key}`;
// 작업 시작 시점의 계정 · 프로필 · 연결 번호 고정
const scopeOf = (get) => {
  const { uid, pid } = get();
  return { uid, pid, pre: prefixOf(pid), gen: connGen };
};
const isLive = (sc) => sc.gen === connGen;
// kind: "exist"(담기 · 빼기) / "groups"(그룹 변경) — 그룹 변경이 담기 실패 되돌리기를 막지 않게 따로 셈
const versionOf = (sc, key, kind) => keyVersions.get(`${qKey(sc, key)}#${kind}`) || 0;
const bumpVersion = (sc, key, kind = "exist") => {
  const v = versionOf(sc, key, kind) + 1;
  keyVersions.set(`${qKey(sc, key)}#${kind}`, v);
  return v;
};
// 지금 연결이 그대로이고 이 작품의 마지막 작업일 때만 true
const isLatest = (sc, key, v, kind = "exist") => isLive(sc) && versionOf(sc, key, kind) === v;
// 같은 작품의 저장 작업은 앞 작업이 끝난 뒤 실행 (앞 작업 실패와 상관없이)
const queueKey = (sc, key, task) => {
  const prev = keyQueues.get(qKey(sc, key)) || Promise.resolve();
  const next = prev.catch(() => {}).then(task);
  keyQueues.set(qKey(sc, key), next.catch(() => {}));
  return next;
};

// [추가] 예전 찜 목록 일부만 남기기 (이관에 실패한 것)
const writeLegacy = (list) => {
  try {
    if (list.length) localStorage.setItem("wishlist", JSON.stringify(list));
    else localStorage.removeItem("wishlist");
  } catch {
    /* 무시 */
  }
};

export const useHeartStore = create((set, get) => ({
  uid: null,
  pid: "main", // [추가] 지금 연결된 프로필
  ready: false,
  items: {}, // { "movie_1": item }
  groups: [], // [{ id, name, icon, order }]

  // UI: 그룹 선택 팝업 · 새 그룹 만들기 · 토스트
  pickerKey: null, // 그룹을 고를 작품 key
  pickerDraft: [], // [추가] 팝업에서 체크한 그룹 id ([추가하기] 전까지 저장 안 함)
  pickerNew: false, // [추가] 하트로 방금 담은 작품인지 (그룹 변경과 토스트 문구 구분)
  newGroupOpen: false,
  toast: null, // { text, groupId }

  // ---------- 로그인 계정 · 프로필 연결 (App 에서 user · 프로필이 바뀔 때 호출) ----------
  onConnect: (uid, pid = "main") => {
    const profile = pid || "main";
    if (get().uid === uid && get().pid === profile) return;
    unsubs.forEach((u) => u());
    unsubs = [];
    // [추가] 새 연결 — 예전 연결에서 진행 중인 작업은 끝나도 화면을 바꾸지 않음
    connGen += 1;
    keyQueues.clear();
    keyVersions.clear();
    set({ uid, pid: profile, ready: false, items: {}, groups: [], pickerKey: null, pickerDraft: [], newGroupOpen: false, toast: null });
    if (!uid) return;
    const pre = prefixOf(profile);

    let groupsChecked = false;
    unsubs.push(
      onSnapshot(groupsCol(uid), (snap) => {
        const groups = snap.docs
          .filter((d) => ownDoc(d.id, profile))
          .map((d) => {
            const g = { id: d.id.slice(pre.length), ...d.data() };
            // 기본 그룹은 시안 아이콘으로 (예전에 만들어진 그룹 포함)
            const def = DEFAULT_GROUPS.find((x) => x.id === g.id);
            return def && ICON_ALIAS[g.icon] ? { ...g, icon: def.icon } : g;
          })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        // [수정] 처음 한 번: 예전 기본 그룹 지우기 · "나중에 볼 작품"이 없으면 만들기
        if (!groupsChecked) {
          groupsChecked = true;
          const retired = groups.filter((g) => RETIRED_GROUPS.includes(g.id)).map((g) => g.id);
          const needFixed = !groups.some((g) => g.id === FIXED_GROUP.id);
          if (retired.length || needFixed) {
            (async () => {
              try {
                if (needFixed) {
                  await setDoc(doc(groupsCol(uid), pre + FIXED_GROUP.id), {
                    name: FIXED_GROUP.name,
                    icon: FIXED_GROUP.icon,
                    order: 0,
                    createdAt: serverTimestamp(),
                  });
                }
                if (retired.length) {
                  const snapItems = await getDocs(itemsCol(uid));
                  const itemDocs = snapItems.docs
                    .filter((d) => ownDoc(d.id, profile))
                    .map((d) => ({ id: d.id.slice(pre.length), groups: d.data().groups || [] }));
                  await purgeGroups(uid, pre, retired, itemDocs);
                }
              } catch (e) {
                console.error("기본 그룹 정리 실패:", e);
              }
            })();
          }
        }
        set({ groups: groups.filter((g) => !RETIRED_GROUPS.includes(g.id)) });
      })
    );

    let firstItems = true;
    unsubs.push(
      onSnapshot(itemsCol(uid), (snap) => {
        const items = {};
        snap.docs.filter((d) => ownDoc(d.id, profile)).forEach((d) => {
          const data = d.data({ serverTimestamps: "estimate" });
          const key = d.id.slice(pre.length);
          items[key] = {
            ...data,
            key,
            groups: data.groups || [],
            addedAt: data.addedAt?.toMillis?.() || Date.now(),
          };
        });
        set({ items, ready: true });

        // 처음 한 번: 이 브라우저에 남은 예전 찜 목록 옮기기 (첫 프로필만)
        // - [수정] 저장 결과를 모두 기다린 뒤, 성공한 것만 지우고 실패한 것은 남김 (다음 접속 때 다시 시도)
        if (firstItems) {
          firstItems = false;
          const legacy = !pre ? readLegacy() : [];
          if (legacy.length) {
            const sc = scopeOf(get);
            (async () => {
              const results = await Promise.all(
                legacy.map(async (w) => {
                  if (!w?.id) return { w, ok: true }; // 깨진 항목은 버림
                  const key = await get().onAdd(
                    { id: w.id, type: w.type, title: w.title || w.name, poster_path: w.poster_path },
                    { silent: true, scope: sc }
                  );
                  return { w, ok: Boolean(key) };
                })
              );
              const failed = results.filter((r) => !r.ok).map((r) => r.w);
              writeLegacy(failed);
              const moved = results.length - failed.length;
              if (isLive(sc) && moved > 0) {
                set({
                  toast: {
                    text: failed.length
                      ? `이 브라우저에 저장돼 있던 찜 ${moved}개를 옮겼어요. ${failed.length}개는 다음 접속 때 다시 옮길게요.`
                      : `이 브라우저에 저장돼 있던 찜 ${moved}개를 이 계정으로 옮겼어요.`,
                  },
                });
              }
            })();
          }
        }
      })
    );
  },

  isWished: (type, id) => Boolean(get().items[wishKey(type, id)]),

  // ---------- 담기 / 빼기 ----------
  // content: { id, type, title|name, poster_path, backdrop_path?, genre_ids?, overview? }
  // - [수정] scope: 시작할 때의 계정 · 프로필 · 연결 번호 (이관처럼 부르는 쪽에서 고정해 넘길 수 있음)
  onAdd: async (content, { silent = false, scope } = {}) => {
    const sc = scope || scopeOf(get);
    if (!sc.uid || !content?.id || !isLive(sc)) return null;
    const { items } = get();
    const type = content.type === "tv" ? "tv" : "movie";
    const key = wishKey(type, content.id);
    if (items[key]) return key;
    const ver = bumpVersion(sc, key);

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
    if (!silent) set({ pickerKey: key, pickerDraft: [], pickerNew: true });

    try {
      // [수정] 저장 경로는 시작 때 고정한 계정 · 프로필 (sc) · 같은 작품 작업은 순서대로
      await queueKey(sc, key, async () => {
        const detail = await fetchDetail(type, content.id);
        await setDoc(doc(itemsCol(sc.uid), sc.pre + key), {
          ...base,
          ...Object.fromEntries(Object.entries(detail).filter(([, v]) => v)),
          addedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      console.error("위시리스트 담기 실패:", error);
      // [수정] 지금 연결 · 마지막 작업일 때만 되돌림 (다른 프로필의 같은 작품을 지우지 않게)
      if (isLatest(sc, key, ver)) {
        set((s) => {
          const next = { ...s.items };
          delete next[key];
          return { items: next, pickerKey: s.pickerKey === key ? null : s.pickerKey };
        });
      }
      return null;
    }
    return key;
  },

  onRemove: async (key) => {
    const sc = scopeOf(get);
    const { items } = get();
    if (!sc.uid || !items[key]) return;
    const prev = items[key];
    const ver = bumpVersion(sc, key);
    set((s) => {
      const next = { ...s.items };
      delete next[key];
      return { items: next, toast: { text: "위시리스트에서 삭제했어요." } };
    });
    try {
      await queueKey(sc, key, () => deleteDoc(doc(itemsCol(sc.uid), sc.pre + key)));
    } catch (error) {
      console.error("위시리스트 삭제 실패:", error);
      if (isLatest(sc, key, ver)) set((s) => ({ items: { ...s.items, [key]: prev } }));
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
    const sc = scopeOf(get);
    const { items, groups } = get();
    const item = items[key];
    if (!sc.uid || !item) return;
    const ver = bumpVersion(sc, key, "groups");
    const existVer = versionOf(sc, key, "exist");
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
      await queueKey(sc, key, () => updateDoc(doc(itemsCol(sc.uid), sc.pre + key), { groups: nextGroups }));
    } catch (error) {
      console.error("그룹 변경 실패:", error);
      // 그룹만 되돌림 (그 사이 빠졌거나 · 담기가 실패했으면 그대로)
      if (isLatest(sc, key, ver, "groups") && versionOf(sc, key, "exist") === existVer && get().items[key]) {
        set((s) => ({ items: { ...s.items, [key]: { ...s.items[key], groups: item.groups } } }));
      }
    }
  },

  onCreateGroup: async (name, icon) => {
    const sc = scopeOf(get);
    const { groups, pickerKey } = get();
    const clean = name.trim().slice(0, GROUP_NAME_MAX);
    if (!sc.uid || !clean) return null;
    const auto = doc(groupsCol(sc.uid)); // 새 id 만들기
    const gid = auto.id;
    const ref = doc(groupsCol(sc.uid), sc.pre + gid);
    const order = groups.reduce((m, g) => Math.max(m, g.order ?? 0), 0) + 1;
    try {
      await setDoc(ref, { name: clean, icon, order, createdAt: serverTimestamp() });
      if (!isLive(sc)) return gid; // [추가] 그 사이 프로필이 바뀌면 화면은 그대로
      set((s) => ({
        newGroupOpen: false,
        groups: s.groups.some((g) => g.id === gid) ? s.groups : [...s.groups, { id: gid, name: clean, icon, order }],
        // [수정] 그룹 고르던 작품이 있으면 새 그룹을 체크해 둠 ([추가하기]로 저장)
        pickerDraft: pickerKey && !s.pickerDraft.includes(gid) ? [...s.pickerDraft, gid] : s.pickerDraft,
      }));
      if (!pickerKey) set({ toast: { text: `${clean} 그룹을 만들었어요.` } });
      return gid;
    } catch (error) {
      console.error("새 그룹 만들기 실패:", error);
      return null;
    }
  },

  // [추가] 그룹 삭제 (여러 개 한 번에 · 선택 삭제) — "나중에 볼 작품"은 삭제 불가 · 담긴 작품은 "전체"에 그대로
  onDeleteGroups: async (groupIds = []) => {
    const sc = scopeOf(get);
    const { groups, items } = get();
    const targets = groups.filter((g) => groupIds.includes(g.id) && g.id !== FIXED_GROUP.id);
    if (!sc.uid || targets.length === 0) return false;
    const ids = targets.map((g) => g.id);
    // [수정] 되돌릴 때 필요한 것만 기억 — 지운 그룹 · 그 그룹이 붙어 있던 작품과 그 작품의 작업 번호
    const touched = {}; // { 작품key: { removed: [지운 그룹 id], ver } }
    const nextItems = {};
    Object.entries(items).forEach(([k, it]) => {
      const removed = it.groups.filter((g) => ids.includes(g));
      if (removed.length) {
        touched[k] = { removed, ver: bumpVersion(sc, k, "groups") };
        nextItems[k] = { ...it, groups: it.groups.filter((g) => !ids.includes(g)) };
      } else nextItems[k] = it;
    });
    set({
      groups: groups.filter((g) => !ids.includes(g.id)),
      items: nextItems,
      toast: {
        text: targets.length === 1 ? `${targets[0].name} 그룹을 삭제했어요.` : `그룹 ${targets.length}개를 삭제했어요.`,
      },
    });
    try {
      await purgeGroups(sc.uid, sc.pre, ids, Object.values(items).map((it) => ({ id: it.key, groups: it.groups })));
      return true;
    } catch (error) {
      console.error("그룹 삭제 실패:", error);
      // [수정] 실패한 변경만 되돌림 (리뷰: 저장 실패 후 화면 복구)
      //   · 예전: 시작할 때의 그룹 · 작품 전체로 덮어써서, 그 사이 담기 · 빼기 · 그룹 변경이 사라졌음
      //   · 지금: 지금 연결(계정 · 프로필)이 그대로일 때만
      //     - 지운 그룹만 다시 넣고 (그 사이 생긴 그룹은 그대로)
      //     - 그 그룹이 붙어 있던 작품에만 다시 붙임 (그 사이 빠진 작품 · 그룹을 바꾼 작품은 건드리지 않음)
      if (isLive(sc)) {
        set((s) => {
          const groupsNow = [...s.groups, ...targets.filter((t) => !s.groups.some((g) => g.id === t.id))].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          const itemsNow = { ...s.items };
          Object.entries(touched).forEach(([k, { removed, ver }]) => {
            const it = itemsNow[k];
            if (!it || !isLatest(sc, k, ver, "groups")) return;
            itemsNow[k] = { ...it, groups: [...it.groups, ...removed.filter((g) => !it.groups.includes(g))] };
          });
          return { groups: groupsNow, items: itemsNow, toast: { text: "그룹을 삭제하지 못했어요. 다시 시도해 주세요." } };
        });
      }
      return false;
    }
  },

  // ---------- 팝업 · 토스트 ----------
  onOpenPicker: (key) => set({ pickerKey: key, pickerDraft: [...(get().items[key]?.groups || [])], pickerNew: false }),
  onClosePicker: () => set({ pickerKey: null, pickerDraft: [], pickerNew: false }),
  // [추가] 팝업 안 체크 (저장 전)
  onToggleDraft: (groupId) =>
    set((s) => ({
      pickerDraft: s.pickerDraft.includes(groupId)
        ? s.pickerDraft.filter((g) => g !== groupId)
        : [...s.pickerDraft, groupId],
    })),
  // [추가] [추가하기] — 체크한 그룹을 한 번에 저장하고 팝업 닫기
  onApplyPicker: async () => {
    const sc = scopeOf(get);
    const { items, groups, pickerKey, pickerDraft, pickerNew } = get();
    const item = items[pickerKey];
    set({ pickerKey: null, pickerDraft: [], pickerNew: false });
    if (!sc.uid || !item) return;
    const nextGroups = groups.map((g) => g.id).filter((id) => pickerDraft.includes(id));
    const added = nextGroups.filter((id) => !item.groups.includes(id));
    const same = nextGroups.length === item.groups.length && added.length === 0;
    const first = groups.find((g) => g.id === added[0]);
    set((s) => ({
      items: { ...s.items, [pickerKey]: { ...item, groups: nextGroups } },
      toast: first
        ? { text: `${first.name}${added.length > 1 ? ` 외 ${added.length - 1}개` : ""} 모음에 추가되었어요.`, groupId: first.id }
        : same
          ? pickerNew ? { text: "위시리스트에 추가되었어요." } : s.toast
          : { text: "그룹을 변경했어요." },
    }));
    if (same) return;
    const ver = bumpVersion(sc, pickerKey, "groups");
    const existVer = versionOf(sc, pickerKey, "exist");
    try {
      // [수정] 방금 담은 작품이면 담기 저장이 끝난 뒤 그룹 저장 (순서 보장)
      await queueKey(sc, pickerKey, () => updateDoc(doc(itemsCol(sc.uid), sc.pre + pickerKey), { groups: nextGroups }));
    } catch (error) {
      console.error("그룹 변경 실패:", error);
      if (isLatest(sc, pickerKey, ver, "groups") && versionOf(sc, pickerKey, "exist") === existVer && get().items[pickerKey]) {
        set((s) => ({ items: { ...s.items, [pickerKey]: { ...s.items[pickerKey], groups: item.groups } } }));
      }
    }
  },
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
      openSubscribeGate("account");
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
    openSubscribeGate("account");
    return;
  }
  s.onToggle(content);
};
