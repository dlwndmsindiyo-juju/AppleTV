// src/pages/Wishlist.jsx
// 위시리스트 (/wishlist?group=all&sort=latest) — 시안: 위시리스트 PC · Tablet · Mobile
// - 정렬(최신 추가순 · 오래된 추가순 · 제목순) · 그룹 탭(아이콘 + 이름 + 개수)
// - 카드: 포스터(▶ 누르면 상세 페이지에서 바로 재생) · 제목 · 장르 · 줄거리 · ••• (그룹 변경 · 공유 · 삭제)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { formatCount, useHeartStore } from "../store/useHeartStore";
import { WishIcon } from "../components/wishlist/WishlistLayer";
import { detailPath } from "./MovieDetail";

const IMG = "https://image.tmdb.org/t/p";

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

  const share = async () => {
    setOpen(false);
    const url = `${window.location.origin}${detailPath(item.type, item.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url });
      else {
        await navigator.clipboard.writeText(url);
        alert("링크가 복사되었습니다.");
      }
    } catch {
      // 공유 취소 무시
    }
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

const WishCard = ({ item }) => {
  const navigate = useNavigate();
  const genres = (item.genres || []).join(" / ") || (item.type === "tv" ? "시리즈" : "영화");

  return (
    <li className="wish-card">
      <button
        type="button"
        className="wish-card-poster"
        onClick={() => navigate(`${detailPath(item.type, item.id)}?play=1`)}
        aria-label={`${item.title} 재생`}
      >
        {item.poster_path ? (
          <img src={`${IMG}/w342${item.poster_path}`} alt="" loading="lazy" />
        ) : (
          <span className="wish-card-noimg">이미지 준비 중</span>
        )}
        <span className="wish-card-play" aria-hidden="true">
          <img src="/icons/play-w.svg" alt="" />
        </span>
      </button>

      <div className="wish-card-info">
        <Link className="wish-card-title" to={detailPath(item.type, item.id)}>
          {item.title}
        </Link>
        <p className="wish-card-genre">{genres}</p>
        {item.overview && <p className="wish-card-overview">{item.overview}</p>}
      </div>

      <CardMenu item={item} />
    </li>
  );
};

const Wishlist = () => {
  const [params, setParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const { items, groups, ready } = useHeartStore();

  const groupId = params.get("group") || "all";
  const sort = SORTS.some((s) => s.key === params.get("sort")) ? params.get("sort") : "latest";

  // 로그인 전: 구독 팝업
  useEffect(() => {
    if (authReady && !user) window.dispatchEvent(new CustomEvent("subscribe-gate:open"));
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

  const update = (next) => {
    const merged = { group: activeTab.id, sort, ...next };
    const clean = Object.fromEntries(
      Object.entries(merged).filter(([k, v]) => !(k === "group" && v === "all") && !(k === "sort" && v === "latest"))
    );
    setParams(clean, { replace: true });
  };

  return (
    <main className="wish-page">
      <div className="wish-inner">
        <h2 className="wish-title">위시리스트</h2>
        <p className="wish-desc">보고싶은 작품을 저장하고 나만의 목록을 만들어보세요.</p>

        <SortMenu value={sort} onChange={(v) => update({ sort: v })} />

        {/* 그룹 탭 */}
        <ul className="wish-tabs" role="tablist" aria-label="위시리스트 그룹">
          {tabs.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="tab"
                aria-selected={t.id === activeTab.id}
                className={`wish-tab${t.id === activeTab.id ? " is-active" : ""}`}
                onClick={() => update({ group: t.id })}
              >
                <WishIcon name={t.icon} className="wish-tab-icon" />
                <strong>{t.name}</strong>
                <span>{formatCount(t.count)}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* 작품 */}
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
          <ul className="wish-grid">
            {list.map((item) => (
              <WishCard key={item.key} item={item} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
};

export default Wishlist;
