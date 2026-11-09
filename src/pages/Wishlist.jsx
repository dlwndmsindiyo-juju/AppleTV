// src/pages/Wishlist.jsx
// 위시리스트 (/wishlist?group=all&sort=latest) — 시안: 위시리스트 PC · Tablet · Mobile
// - 정렬(최신 추가순 · 오래된 추가순 · 제목순) · 그룹 메뉴(아이콘 + 이름 + 개수)
// - [수정] 그룹 메뉴는 왼쪽 세로 정렬 · 기본은 "전체" + "나중에 볼 작품" · [새 그룹 만들기]로 추가 (휴대폰은 위쪽 가로 스크롤)
// - [수정] 그룹 삭제: 메뉴 위 [선택 삭제] → 지울 수 있는 그룹 옆에 선택 버튼 → 골라서 [삭제] → 확인 팝업
//   · 전체 · 나중에 볼 작품은 선택 불가 · 담긴 작품은 "전체"에 그대로 · 여러 개를 한 번에 지울 수 있음
// - [수정] 작품: 전체 보기처럼 장르별 섹션 + 세로 포스터 (누르면 상세) · ••• (그룹 변경 · 공유 · 삭제)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { FIXED_GROUP, formatCount, useHeartStore } from "../store/useHeartStore";
import { Modal, WishIcon } from "../components/wishlist/WishlistLayer";
import DetailBackLink from "../components/common/DetailBackLink"; // [추가] 상세 공용 "← 홈으로" (같은 자리)
import { detailPath } from "./MovieDetail";
import { openShare } from "../utils/share"; // [추가] 공유 팝업
import { openSubscribeGate } from "../utils/subscribeGate"; // [정리] 로그인 안내 팝업 열기 공용
import { TMDB_IMG as IMG } from "../utils/tmdb"; // [정리] TMDB 이미지 주소 공용


const SORTS = [
  { key: "latest", label: "최신 추가순" },
  { key: "oldest", label: "오래된 추가순" },
  { key: "title", label: "제목순" },
];

const sorters = {
  latest: (a, b) => b.addedAt - a.addedAt,
  oldest: (a, b) => a.addedAt - b.addedAt,
  title: (a, b) => (a.title || "").localeCompare(b.title || "", "ko"),
};

// 정렬 드롭다운
const SortMenu = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const current = SORTS.find((s) => s.key === value) || SORTS[0];

  return (
    <div className="wish-sort" ref={ref}>
      <button
        type="button"
        className="wish-sort-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {current.label}
        <WishIcon name="chevron-down" className="wish-sort-arrow" />
      </button>
      {open && (
        <ul className="wish-menu" role="listbox" aria-label="정렬">
          {SORTS.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                role="option"
                aria-selected={s.key === value}
                className={`wish-menu-item${s.key === value ? " is-active" : ""}`}
                onClick={() => {
                  onChange(s.key);
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// 카드의 ••• 메뉴 (그룹 변경 · 공유 · 삭제)
const CardMenu = ({ item }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { onOpenPicker, onRemove } = useHeartStore();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // [수정] 공유 팝업 (components/common/ShareSheet.jsx)
  const share = () => {
    setOpen(false);
    openShare({ title: item.title, url: `${window.location.origin}${detailPath(item.type, item.id)}` });
  };

  return (
    <div className="wish-card-menu" ref={ref}>
      <button
        type="button"
        className="wish-more-btn"
        aria-label={`${item.title} 더보기`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <WishIcon name="more" />
      </button>
      {open && (
        <ul className="wish-menu wish-menu--right" role="menu">
          <li>
            <button
              type="button"
              role="menuitem"
              className="wish-menu-item"
              onClick={() => {
                setOpen(false);
                onOpenPicker(item.key);
              }}
            >
              그룹 변경
              <WishIcon name="bookmark" />
            </button>
          </li>
          <li>
            <button type="button" role="menuitem" className="wish-menu-item" onClick={share}>
              공유
              <WishIcon name="share" />
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              className="wish-menu-item is-danger"
              onClick={() => {
                setOpen(false);
                onRemove(item.key);
              }}
            >
              삭제
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};

// [수정] 세로 포스터 카드 — 전체 보기(MemberBrowse)와 같은 모양 · 누르면 상세 · ••• 는 포스터 오른쪽 위
const WishPoster = ({ item }) => (
  <li className="wish-poster">
    <Link className="wish-poster-link" to={detailPath(item.type, item.id)} aria-label={`${item.title} 상세 보기`}>
      <span className="wish-poster-img">
        {item.poster_path ? (
          <img src={`${IMG}/w342${item.poster_path}`} alt="" loading="lazy" />
        ) : (
          <span className="wish-poster-noimg">이미지 준비 중</span>
        )}
      </span>
      <span className="wish-poster-title">{item.title}</span>
    </Link>
    <CardMenu item={item} />
  </li>
);

const OTHER_GENRE = "기타";

// [추가] 장르별로 묶기 — 작품의 첫 번째 장르 (정렬 순서대로 처음 나온 장르부터 · "기타"는 맨 뒤)
const groupByGenre = (list) => {
  const rows = new Map();
  list.forEach((item) => {
    const name = item.genres?.[0] || OTHER_GENRE;
    if (!rows.has(name)) rows.set(name, []);
    rows.get(name).push(item);
  });
  const all = [...rows.entries()].map(([genre, items]) => ({ genre, items }));
  return [...all.filter((r) => r.genre !== OTHER_GENRE), ...all.filter((r) => r.genre === OTHER_GENRE)];
};

// [추가] 그룹 삭제 확인 팝업 — [선택 삭제]로 고른 그룹들 · 담긴 작품은 "전체"에 그대로
const DeleteGroupConfirm = ({ groups, onCancel, onConfirm }) => (
  <Modal labelId="wish-delete-title" onClose={onCancel} className="wish-confirm">
    <div className="wish-modal-head">
      <h2 id="wish-delete-title">
        {groups.length === 1 ? `${groups[0].name} 그룹을 삭제할까요?` : `선택한 그룹 ${groups.length}개를 삭제할까요?`}
      </h2>
    </div>
    <p className="wish-confirm-text">그룹에 담긴 작품은 삭제되지 않고 전체에 그대로 남아요.</p>
    <div className="wish-modal-actions">
      <button type="button" className="wish-btn wish-btn--gray" onClick={onCancel}>
        취소
      </button>
      <button type="button" className="wish-btn wish-btn--primary" onClick={onConfirm}>
        삭제
      </button>
    </div>
  </Modal>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const Wishlist = () => {
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const { items, groups, ready, onOpenNewGroup, onDeleteGroups } = useHeartStore();
  // [추가] 선택 삭제: 선택 모드 · 고른 그룹 id · 확인 팝업
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState([]);
  const [confirming, setConfirming] = useState(false);

  const groupId = params.get("group") || "all";
  const sort = SORTS.some((s) => s.key === params.get("sort")) ? params.get("sort") : "latest";

  // 로그인 전: 로그인 안내 팝업 (위시리스트는 계정에 저장)
  useEffect(() => {
    if (authReady && !user) {
      openSubscribeGate("account");
    }
  }, [authReady, user]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const all = useMemo(() => Object.values(items), [items]);
  const tabs = useMemo(
    () => [
      { id: "all", name: "전체", icon: "all", count: all.length },
      ...groups.map((g) => ({ ...g, count: all.filter((it) => it.groups.includes(g.id)).length })),
    ],
    [groups, all]
  );

  // 없는 그룹이면 전체로
  const activeTab = tabs.find((t) => t.id === groupId) || tabs[0];
  const list = useMemo(() => {
    const filtered = activeTab.id === "all" ? all : all.filter((it) => it.groups.includes(activeTab.id));
    return [...filtered].sort(sorters[sort]);
  }, [all, activeTab, sort]);
  const genreRows = useMemo(() => groupByGenre(list), [list]);

  const canDelete = (t) => t.id !== "all" && t.id !== FIXED_GROUP.id;
  const deletable = tabs.filter(canDelete);
  const pickedGroups = deletable.filter((t) => picked.includes(t.id));
  const endSelect = () => {
    setSelecting(false);
    setPicked([]);
    setConfirming(false);
  };
  const togglePick = (id) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const confirmDelete = async () => {
    const ids = pickedGroups.map((t) => t.id);
    endSelect();
    if (!ids.length) return;
    if (ids.includes(activeTab.id)) update({ group: "all" });
    await onDeleteGroups(ids);
  };
  // 지울 그룹이 없어지면 선택 모드 끝
  useEffect(() => {
    if (selecting && deletable.length === 0) endSelect();
  }, [selecting, deletable.length]);

  const update = (next) => {
    const merged = { group: activeTab.id, sort, ...next };
    const clean = Object.fromEntries(
      Object.entries(merged).filter(([k, v]) => !(k === "group" && v === "all") && !(k === "sort" && v === "latest"))
    );
    setParams(clean, { replace: true });
  };

  return (
    <main className="wish-page">
      {/* [추가] 홈으로 — 상세 페이지와 같은 자리 (헤더 아래 · 이너 왼쪽) */}
      <DetailBackLink to="/" label="홈으로" overlay />
      <div className="wish-inner">
        <h2 className="wish-title">나의 목록</h2>

        <div className="wish-layout">
          {/* [수정] 그룹 메뉴 — 왼쪽 세로 정렬 · 기본 "전체" + "나중에 볼 작품" · [새 그룹] 으로 추가 · [선택 삭제]로 삭제 */}
          <nav className={`wish-side${selecting ? " is-selecting" : ""}`} aria-label="위시리스트 그룹">
            {/* [추가] 선택 삭제 — 누르면 지울 수 있는 그룹 옆에 선택 버튼 · [취소] [삭제] */}
            {user && deletable.length > 0 && (
              <div className="wish-side-head">
                {selecting ? (
                  <>
                    <button type="button" className="wish-side-action" onClick={endSelect}>
                      취소
                    </button>
                    <button
                      type="button"
                      className="wish-side-action is-danger"
                      disabled={pickedGroups.length === 0}
                      onClick={() => setConfirming(true)}
                    >
                      삭제{pickedGroups.length > 0 ? ` ${pickedGroups.length}` : ""}
                    </button>
                  </>
                ) : (
                  <button type="button" className="wish-side-action" onClick={() => setSelecting(true)}>
                    선택 삭제
                  </button>
                )}
              </div>
            )}
            <ul className="wish-tabs" role={selecting ? "group" : "tablist"}>
              {tabs.map((t) => {
                const pickable = selecting && canDelete(t);
                const on = picked.includes(t.id);
                return (
                  <li key={t.id}>
                    {pickable ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        className={`wish-tab is-pickable${on ? " is-picked" : ""}`}
                        onClick={() => togglePick(t.id)}
                      >
                        <span className="wish-tab-radio" aria-hidden="true" />
                        <WishIcon name={t.icon} className="wish-tab-icon" />
                        <strong>{t.name}</strong>
                        <span className="wish-tab-count">{formatCount(t.count)}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={t.id === activeTab.id}
                        disabled={selecting}
                        className={`wish-tab${t.id === activeTab.id ? " is-active" : ""}`}
                        onClick={() => update({ group: t.id })}
                      >
                        <WishIcon name={t.icon} className="wish-tab-icon" />
                        <strong>{t.name}</strong>
                        <span className="wish-tab-count">{formatCount(t.count)}</span>
                      </button>
                    )}
                  </li>
                );
              })}
              {user && !selecting && (
                <li>
                  <button type="button" className="wish-tab wish-tab--add" onClick={onOpenNewGroup}>
                    <span className="wish-tab-icon" aria-hidden="true">
                      <PlusIcon />
                    </span>
                    <strong>새 그룹 만들기</strong>
                  </button>
                </li>
              )}
            </ul>
          </nav>

          <div className="wish-content">
            <SortMenu value={sort} onChange={(v) => update({ sort: v })} />

            {/* 작품 — [수정] 장르별 섹션 · 세로 포스터 */}
            {!user ? (
              <p className="wish-empty">로그인 후 위시리스트를 이용할 수 있어요.</p>
            ) : !ready ? (
              <p className="wish-empty">위시리스트를 불러오는 중입니다.</p>
            ) : list.length === 0 ? (
              <p className="wish-empty">
                {activeTab.id === "all"
                  ? "아직 저장한 작품이 없어요. 작품의 하트를 눌러 담아보세요."
                  : `${activeTab.name} 그룹에 담긴 작품이 없어요.`}
              </p>
            ) : (
              <div className="wish-genres">
                {genreRows.map(({ genre, items: rowItems }) => (
                  <section className="wish-genre" key={genre} aria-label={genre}>
                    <h3 className="wish-genre-title">{genre}</h3>
                    <ul className="wish-posters">
                      {rowItems.map((item) => (
                        <WishPoster key={item.key} item={item} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {confirming && pickedGroups.length > 0 && (
        <DeleteGroupConfirm groups={pickedGroups} onCancel={() => setConfirming(false)} onConfirm={confirmDelete} />
      )}
    </main>
  );
};

export default Wishlist;
