// src/pages/Search.jsx
// 검색 (/search?q=검색어) — 시안: search_first / search_recent / search_result / search_not_found
// - 검색어는 헤더 검색창에서 입력 (모바일은 헤더에 검색창이 없어 이 페이지 위에 검색창 표시)
// - 검색 전: 최근 검색 항목(있으면) + 둘러보기 포스터
// - 검색 결과: 인기 검색 결과 3 + TV 프로그램 + 영화
// - 결과 없음: 검색어 지우기
// - 로그인 전에도 검색 · 둘러보기 가능 (작품을 재생할 때만 상세 페이지에서 구독 팝업)
// - 최근 검색 항목은 로그인한 계정만 저장
// - [추가] 검색 결과: [대한민국에서 시청할 수 없는 작품 숨기기] 체크박스 (TMDB watch/providers KR · useSearchStore availability)
//   · 이용 방법을 확인하는 중인 작품은 그대로 보이고, 확인 결과 "시청 불가"면 숨김 · 인물은 그대로
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useSearchStore, itemKey } from "../store/useSearchStore";
import {
  PosterGrid,
  PosterSkeleton,
  ResultCard,
  SearchBox,
  useResultEntry,
} from "../components/search/SearchParts";
import "../search.scss";
import { openSubscribeGate } from "../utils/subscribeGate";

const DEBOUNCE_MS = 400;
const TOP_COUNT = 3; // 인기 검색 결과
const ROW_COUNT = 16; // TV 프로그램 · 영화 (8칸 x 2줄)

// 로그인 전 안내 팝업 열기 — [정리] utils/subscribeGate.js 로 옮김 (예전 import 경로도 그대로 쓸 수 있게 다시 내보냄)
export { openSubscribeGate };

const Search = () => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const q = params.get("q") || "";

  const user = useAuthStore((s) => s.user);

  const {
    status,
    results,
    trending,
    recent,
    onSearch,
    onLoadTrending,
    onLoadGenres,
    onLoadRecent,
    onAddRecent,
    onClearRecent,
    availability,
    onLoadAvailability,
  } = useSearchStore();
  const [hideUnavailable, setHideUnavailable] = useState(false); // [추가] 국내 시청 불가 작품 숨기기
  const toEntry = useResultEntry();

  // ---------- 모바일 검색창 (PC · 태블릿은 헤더 검색창 사용) ----------
  const [text, setText] = useState(q);
  const inputRef = useRef(null);

  useEffect(() => {
    setText(q);
  }, [q]);

  useEffect(() => {
    onLoadGenres();
    onLoadTrending();
  }, [onLoadGenres, onLoadTrending]);

  // 최근 검색 항목: 계정별로 불러오기
  useEffect(() => {
    onLoadRecent(user?.uid);
  }, [user?.uid, onLoadRecent]);

  const setQuery = (value, replace = true) => {
    const v = value.trim();
    setParams(v ? { q: v } : {}, { replace });
  };

  // 입력을 멈추면 검색어 반영
  useEffect(() => {
    if (text.trim() === q) return undefined;
    const t = setTimeout(() => setQuery(text), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // 검색 실행 (로그인 전에도)
  useEffect(() => {
    onSearch(q);
  }, [q, onSearch]);

  const submit = (value) => setQuery(value, false);

  // 검색어 지우기 → 검색 전 화면 (헤더 검색창도 주소를 따라 비워짐)
  const clear = () => {
    setText("");
    navigate("/search", { replace: true });
    inputRef.current?.focus();
  };

  // [추가] 검색 결과 작품의 대한민국 이용 방법 불러오기 (한 번 받은 값은 저장해 재사용)
  useEffect(() => {
    const items = [
      ...results.movie.map((it) => ({ ...it, media_type: "movie" })),
      ...results.tv.map((it) => ({ ...it, media_type: "tv" })),
    ];
    if (items.length) onLoadAvailability(items);
  }, [results, onLoadAvailability]);

  // 대한민국에서 시청할 수 없는 작품 (확인 끝난 것만 · 인물은 해당 없음)
  const isUnavailable = (type, item) => type !== "person" && availability[itemKey(type, item.id)] === "none";
  const keep = (type) => (item) => !hideUnavailable || !isUnavailable(type, item);

  // ---------- 목록 정리 ----------
  const topResults = useMemo(() => {
    const all = [
      ...results.movie.filter(keep("movie")),
      ...results.tv.filter(keep("tv")),
      ...results.person,
    ];
    return all.sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, TOP_COUNT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, hideUnavailable, availability]);
  const tvList = results.tv.filter(keep("tv")).slice(0, ROW_COUNT);
  const movieList = results.movie.filter(keep("movie")).slice(0, ROW_COUNT);
  const total = results.movie.length + results.tv.length + results.person.length;
  const hiddenCount = hideUnavailable
    ? results.movie.filter((it) => isUnavailable("movie", it)).length + results.tv.filter((it) => isUnavailable("tv", it)).length
    : 0;

  // 작품 · 인물 페이지의 "검색 결과로 돌아가기"
  const backTo = {
    path: `${location.pathname}${location.search}`,
    label: q ? "검색 결과로 돌아가기" : "검색으로 돌아가기",
  };

  // 검색 결과에서 누른 항목 → 최근 검색 항목
  const remember = (entryOrItem) => {
    if (!user) return;
    onAddRecent(entryOrItem.sub ? entryOrItem : toEntry(entryOrItem));
  };

  // ---------- 화면 ----------
  let body = null;

  if (!q) {
    // 검색 전: 최근 검색 항목이 있으면 위에, 없으면 "무엇을 보고 싶으세요?"
    const hasRecent = Boolean(user) && recent.length > 0;
    body = (
      <>
        {hasRecent ? (
          <section className="search-block">
            <div className="search-block-head">
              <h2 className="search-block-title">최근 검색 항목</h2>
              <button type="button" className="search-clear-link" onClick={onClearRecent}>
                모두 지우기
              </button>
            </div>
            <ul className="search-results">
              {recent.map((entry) => (
                <ResultCard key={`${entry.type}_${entry.id}`} entry={entry} backTo={backTo} onPick={remember} />
              ))}
            </ul>
          </section>
        ) : (
          <h1 className="search-page-title">무엇을 보고 싶으세요?</h1>
        )}
        <section className="search-block">
          <div className="search-block-head">
            <h2 className="search-block-title">둘러보기</h2>
          </div>
          {trending.length > 0 ? (
            <PosterGrid items={trending.slice(0, hasRecent ? 16 : 8)} backTo={backTo} />
          ) : (
            <PosterSkeleton />
          )}
        </section>
      </>
    );
  } else if (status === "loading" || status === "idle") {
    body = (
      <section className="search-block" aria-live="polite">
        <p className="search-note">검색 결과를 불러오는 중입니다.</p>
        <PosterSkeleton />
      </section>
    );
  } else if (status === "error") {
    body = (
      <section className="search-state" role="alert">
        <h2 className="search-state-title">검색 결과를 불러오지 못했습니다.</h2>
        <p className="search-state-desc">연결 상태를 확인한 후 다시 시도해 주세요.</p>
        <button type="button" className="search-btn search-btn--gray" onClick={() => onSearch(q)}>
          다시 시도
        </button>
      </section>
    );
  } else if (total === 0) {
    body = (
      <section className="search-state">
        <h2 className="search-state-title">검색 결과가 없습니다.</h2>
        <p className="search-state-desc">작품명 혹은 인물 이름을 다시 확인해 주세요.</p>
      </section>
    );
  } else {
    body = (
      <>
        {/* [추가] 국내 시청 불가 작품 숨기기 */}
        <div className="search-filter">
          <label className="search-filter-check">
            <input
              type="checkbox"
              checked={hideUnavailable}
              onChange={(e) => setHideUnavailable(e.target.checked)}
            />
            <span className="search-filter-box" aria-hidden="true" />
            <span className="search-filter-label">대한민국에서 시청할 수 없는 작품 숨기기</span>
          </label>
          {hideUnavailable && hiddenCount > 0 && (
            <span className="search-filter-count" aria-live="polite">{hiddenCount}개 숨김</span>
          )}
        </div>
        <section className="search-block">
          <div className="search-block-head">
            <h2 className="search-block-title">인기 검색 결과</h2>
          </div>
          <ul className="search-results">
            {topResults.map((item) => {
              const entry = toEntry(item);
              return <ResultCard key={`${entry.type}_${entry.id}`} entry={entry} backTo={backTo} onPick={remember} />;
            })}
          </ul>
        </section>

        {tvList.length > 0 && (
          <section className="search-block">
            <div className="search-block-head">
              <h2 className="search-block-title">TV 프로그램</h2>
            </div>
            <PosterGrid items={tvList} backTo={backTo} onPick={remember} />
          </section>
        )}

        {movieList.length > 0 && (
          <section className="search-block">
            <div className="search-block-head">
              <h2 className="search-block-title">영화</h2>
            </div>
            <PosterGrid items={movieList} backTo={backTo} onPick={remember} />
          </section>
        )}
      </>
    );
  }

  return (
    <main className="search-page search-home">
      <div className="search-inner">
        {/* 모바일 전용 검색창 (헤더에 검색창이 없음) */}
        <div className="search-mobile-box">
          <SearchBox
            value={text}
            onChange={setText}
            onSubmit={submit}
            onClear={clear}
            inputRef={inputRef}
          />
        </div>
        {body}
      </div>
    </main>
  );
};

export default Search;
