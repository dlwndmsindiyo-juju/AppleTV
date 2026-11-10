import React, { useEffect, useMemo, useRef, useState } from "react";
import { TV_SPORT_BG } from "../../data/tvSportData";
import { mlsMatches, matchTitle } from "../../data/matchesData";
import { getTeamById } from "../../data/sportTeams";
import { REPLAY_LEAGUES, leagueThumb } from "../../data/replayLeagues";
import { getMockLiveMatch, MOCK_LIVE_IDS } from "../sport/liveMatchAdapter";
import { useSportStore } from "../../store/useSportStore";
import { useSearchStore } from "../../store/useSearchStore";
import { useAuthStore } from "../../store/useAuthStore";
import { TMDB_IMG } from "../../utils/tmdb";
import { decodeHtml, ytThumb } from "../sport/sportUtils";
import { TvHeader } from "./TvRows";
import { ottItem, videoItem, matchItem, leagueItem } from "./tvDetailItems"; // [추가] 상세 페이지 항목
import { findNext } from "./tvFocus"; // [추가] 검색 화면 방향키 이동

// TV 검색 (1920 × 1080) — 위 메뉴에서 "검색" 을 고르면 나옴 · 스타일: TV.scss (.tv-search)
// - 시안은 스포츠 화면이지만 전체 검색: 작품(영화 · 시리즈) + 경기 + 하이라이트
// - 왼쪽: "검색" 제목(SF Pro Bold 76) · 자판 종류(abc · ABC · #+-) · 리모컨 자판 6줄 · 공백 / 지우기 1글자 / 지우기
//   · 글자를 입력하면 제목 자리에 입력한 글자
// - 오른쪽 위: 마이크 "길게 눌러 검색" (브라우저 음성 인식 · 한국어)
// - [수정] 결과: 전체 · OTT · SPORT · 3열 카드 + 아래 제목
//   · 전체: 모든 콘텐츠 (OTT + SPORT)
//   · OTT : 영화 · 드라마 · 시리즈 (검색어가 없으면 오늘의 인기 작품)
//   · SPORT: 라이브 → 경기 → 하이라이트 → 경기 다시보기
// - [수정] 카드를 누르면 영상 상세 페이지 → "시청하기" 로 재생 (로그인 전에는 구독 안내 팝업)
//   · 작품: 예고편 · 라이브: 라이브 영상 · 경기: 그 경기 하이라이트 · 하이라이트: 그 영상 · 경기 다시보기: 리그 영상

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const DIGITS = "1234567890".split("");
const SYMBOLS = ".-_!@#$%^&*~+=()[]{}?/:;,'\"<>".split("").slice(0, 36);
const MODES = ["abc", "ABC", "#+-"];
const FILTERS = [
  { id: "all", label: "전체" },
  { id: "ott", label: "OTT" },
  { id: "sport", label: "SPORT" },
];

const keysFor = (mode) => {
  if (mode === "#+-") return SYMBOLS;
  const letters = mode === "ABC" ? LETTERS.map((c) => c.toUpperCase()) : LETTERS;
  return [...letters, ...DIGITS]; // 6 × 6 = 36칸 (시안: a ~ z 다음 1 ~ 0)
};

const norm = (v = "") => v.toLowerCase().replace(/\s/g, "");

// 브라우저 음성 인식 (지원하지 않으면 null)
const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// initialQuery: 왼쪽 메뉴 검색창에서 입력하고 들어온 글자
// onDetail(item): [추가] 영상 상세 페이지 열기
export const TvSearch = ({ onMenu, onDetail, initialQuery = "" }) => {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState("abc");
  const [filter, setFilter] = useState("all");
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const screenRef = useRef(null); // [추가] 검색 화면 (방향키 이동 범위 확인)
  const gridRef = useRef(null); // [추가] 결과 목록 (카드로 이동하면 목록 안에서만 스크롤)

  // 하이라이트 (스포츠 홈과 같은 데이터)
  const highlightList = useSportStore((s) => s.highlightList);
  const fetchHighlightList = useSportStore((s) => s.onFetchHighlightList);
  const liveClips = useSportStore((s) => s.liveClips);
  const fetchLiveClips = useSportStore((s) => s.onFetchLiveClips);
  useEffect(() => {
    fetchHighlightList();
    fetchLiveClips();
  }, [fetchHighlightList, fetchLiveClips]);


  // 작품 (웹 검색과 같은 TMDB 검색 · 입력이 멈추고 0.4초 뒤)
  const onSearch = useSearchStore((s) => s.onSearch);
  const results = useSearchStore((s) => s.results);
  const searchQuery = useSearchStore((s) => s.query);
  const trending = useSearchStore((s) => s.trending);
  const loadTrending = useSearchStore((s) => s.onLoadTrending);
  useEffect(() => {
    loadTrending();
  }, [loadTrending]);
  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  // 음성 인식 정리
  useEffect(() => () => recRef.current?.abort?.(), []);

  // [추가] 결과 카드로 이동하면 결과 목록 안에서만 스크롤
  // - 예전: 카드 onFocus 의 scrollIntoView 가 TV 화면 바깥 상자까지 밀어서 화면이 어긋나고 방향키가 엉뚱한 곳으로 갔음
  const scrollCardIntoGrid = (card) => {
    const grid = gridRef.current;
    if (!grid || !grid.contains(card)) return;
    const g = grid.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const scale = g.height / grid.offsetHeight || 1; // TV 화면은 창 크기에 맞춰 줄여 보여 줌 (scale)
    if (c.top < g.top) grid.scrollTop -= (g.top - c.top) / scale + 12;
    else if (c.bottom > g.bottom) grid.scrollTop += (c.bottom - g.bottom) / scale + 12;
  };

  // [추가] 검색 화면 방향키 — 왼쪽 메뉴 검색칸에서 들어와도 · 결과 목록이 스크롤돼도 리모컨으로 이동되게
  // - 원인: ① 왼쪽 메뉴 검색칸(input)에 포커스가 남아 ← → 가 글자 이동으로만 쓰이고 ↑ ↓ 는 메뉴 맨 위로 튐
  //         ② 결과 카드 포커스 때 scrollIntoView 가 TV 화면 전체를 밀어 위치 계산이 어긋남
  // - 수정: 이 화면이 열려 있는 동안 방향키를 먼저 받아서 처리 (TvPreview 공용 처리보다 먼저 · 겹쳐서 두 번 움직이지 않게)
  useEffect(() => {
    const screen = screenRef.current;
    const firstKey = () => screen?.querySelector("[data-tv-autofocus]") || screen?.querySelector("button");

    // 들어올 때 검색칸 · 빈 곳에 포커스가 있으면 자판 첫 글자로
    const frame = requestAnimationFrame(() => {
      const a = document.activeElement;
      if (!a || a === document.body || a.closest?.(".tv-side-search")) firstKey()?.focus({ preventScroll: true });
    });

    const onKey = (e) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      if (!screen || document.querySelector(".subscribe-gate, .ai-popup, .video-popup")) return; // 팝업에서는 팝업이 처리
      const a = document.activeElement;

      // 왼쪽 메뉴 검색칸: (글자 끝에서) → 를 누르면 검색 화면 자판으로 · ↑ ↓ 는 메뉴 이동(공용 처리)
      if (a?.tagName === "INPUT" && a.closest(".tv-side-search")) {
        const atEnd = a.selectionStart === a.value.length && a.selectionEnd === a.value.length;
        if (e.key === "ArrowRight" && atEnd) {
          e.preventDefault();
          e.stopPropagation();
          firstKey()?.focus({ preventScroll: true });
        }
        return; // ← · 글자 중간의 → 는 글자 사이 이동 그대로
      }

      // 검색 화면 밖(왼쪽 메뉴 버튼 등)은 공용 처리 그대로
      if (a && a !== document.body && !screen.contains(a)) return;

      e.preventDefault();
      e.stopPropagation();
      if (!a || a === document.body || a.tagName !== "BUTTON") {
        firstKey()?.focus({ preventScroll: true });
        return;
      }
      // 왼쪽 메뉴까지 포함해서 가장 가까운 버튼 (자판 맨 왼쪽에서 ← 를 누르면 메뉴로)
      const root = screen.closest(".tv-preview") || screen;
      const next = findNext(root, a, e.key);
      if (!next) return;
      next.focus({ preventScroll: true });
      scrollCardIntoGrid(next);
    };

    window.addEventListener("keydown", onKey, true); // capture: TvPreview 공용 방향키(window bubble)보다 먼저
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = (ch) => setQuery((q) => q + ch);
  const removeOne = () => setQuery((q) => q.slice(0, -1));
  const clearAll = () => setQuery("");

  const startVoice = () => {
    if (!SpeechRecognition || listening) return;
    const rec = new SpeechRecognition();
    rec.lang = "ko-KR";
    rec.interimResults = false;
    rec.onresult = (e) => setQuery(e.results?.[0]?.[0]?.transcript?.trim() || "");
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  // 카드 목록
  const cards = useMemo(() => {
    const q = norm(query);
    const hit = (...texts) => !q || texts.some((t) => norm(t).includes(q));

    // ---------- SPORT ----------
    // 라이브 (PC 라이브 섹션과 같은 경기 · 영상은 라이브 클립)
    const clips = (liveClips || []).filter((v) => v?.id?.videoId);
    const lives = MOCK_LIVE_IDS.map(getMockLiveMatch)
      .filter(Boolean)
      .map((m, i) => {
        const home = m.teams[m.homeId];
        const away = m.teams[m.awayId];
        const clip = clips.length ? clips[i % clips.length] : null;
        return {
          key: `live-${m.id}`,
          kind: "live",
          title: `LIVE · ${home?.shortName} vs. ${away?.shortName}`,
          image: clip ? ytThumb(clip) : "",
          id: clip?.id?.videoId,
          label: "라이브",
          desc: clip ? decodeHtml(clip.snippet?.description) : "",
          search: [home?.name, away?.name, home?.enName, away?.enName, "라이브", "live"],
        };
      })
      .filter((c) => hit(c.title, ...c.search));

    // 경기 (MLS 경기 목록)
    const matches = mlsMatches
      .filter((m) => {
        const home = getTeamById(m.homeId);
        const away = getTeamById(m.awayId);
        return hit(matchTitle(m), m.homeTeam, m.awayTeam, home?.enName, away?.enName);
      })
      .map((m) => ({ key: `match-${m.id}`, kind: "match", title: matchTitle(m), image: m.image, match: m }));

    // 하이라이트
    const highlights = (highlightList || [])
      .filter((v) => v?.id?.videoId)
      .map((v) => ({
        key: `hl-${v.id.videoId}`,
        kind: "highlight",
        id: v.id.videoId,
        title: decodeHtml(v.snippet?.title),
        image: ytThumb(v),
        label: "하이라이트",
        meta: "하이라이트",
        desc: decodeHtml(v.snippet?.description),
      }))
      .filter((v) => hit(v.title, "하이라이트", "highlight"));

    // 경기 다시보기 (국가별 리그 영상 모음 · 웹 스포츠 "경기 다시보기" 와 같음)
    const replays = REPLAY_LEAGUES.filter((l) => hit(l.league, l.leagueEn, l.country, "다시보기"))
      .map((l) => ({
        key: `replay-${l.id}`,
        kind: "replay",
        title: `${l.league} 다시보기`,
        image: leagueThumb(l),
        id: l.thumbVideoId,
        prefix: l.league,
        label: "경기 다시보기",
        league: l,
      }));

    // ---------- OTT (영화 · 드라마 · 시리즈) ----------
    // 검색어가 있으면 TMDB 검색 결과 (지금 검색어의 결과일 때) · 없으면 오늘의 인기 작품
    const source = q ? (norm(searchQuery) === q ? [...(results.movie || []), ...(results.tv || [])] : []) : trending || [];
    const works = source
      .filter((r) => r.backdrop_path || r.poster_path)
      .slice(0, 18)
      .map((r) => ({
        key: `work-${r.media_type}-${r.id}`,
        kind: "work",
        work: r,
        title: r.title || r.name,
        image: `${TMDB_IMG}/w780${r.backdrop_path || r.poster_path}`,
      }));

    const sport = [...lives, ...matches, ...highlights, ...replays];
    if (filter === "ott") return works;
    if (filter === "sport") return sport;
    return [...works, ...sport];
  }, [query, filter, highlightList, liveClips, results, searchQuery, trending]);

  // [수정] 카드 누르기 → 영상 상세 페이지 (TvDetail) → "시청하기" 로 재생
  const open = (card) => {
    if (card.kind === "work") onDetail?.(ottItem(card.work));
    else if (card.kind === "match") onDetail?.(matchItem({ ...card.match, title: card.title }));
    else if (card.kind === "replay") onDetail?.({ ...leagueItem(card.league, card.image) });
    // 하이라이트 · 라이브: 영상이 없어도 상세는 열림 (재생할 때 안내)
    else onDetail?.({ kind: "sport", key: card.key, videoId: card.id || null, title: card.title, image: card.image, desc: card.desc, label: card.label || "하이라이트", prefix: card.prefix || "MLS" });
  };

  const keys = keysFor(mode);

  return (
    <main ref={screenRef} className="tv-screen tv-sport tv-search" style={{ "--tv-sport-bg": `url(${TV_SPORT_BG})` }}>
      <TvHeader active="검색" onMenu={onMenu} />

      <div className="tv-search-body">
        {/* ---------- 왼쪽: 제목 · 자판 ---------- */}
        <aside className="tv-search-left">
          <h1 className={`tv-search-title${query ? " has-value" : ""}`} aria-live="polite">
            <span className="tv-search-icon" aria-hidden="true" />
            {query || "검색"}
          </h1>

          <div className="tv-search-modes" role="group" aria-label="자판 종류">
            {MODES.map((m) => (
              <button
                type="button"
                key={m}
                className={`tv-search-mode${m === mode ? " is-active" : ""}`}
                aria-pressed={m === mode}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="tv-search-keys">
            {keys.map((k, i) => (
              <button type="button" key={`${k}-${i}`} className="tv-search-key" data-tv-autofocus={i === 0 || undefined} onClick={() => add(k)}>
                {k}
              </button>
            ))}
          </div>

          <div className="tv-search-edit">
            <button type="button" className="tv-search-edit-btn" onClick={() => add(" ")}>
              공백
            </button>
            <button type="button" className="tv-search-edit-btn tv-search-delete" aria-label="한 글자 지우기" onClick={removeOne}>
              <img src="/icons/tv/tv-delet-btn.svg" alt="" aria-hidden="true" />
            </button>
            <button type="button" className="tv-search-edit-btn" onClick={clearAll}>
              지우기
            </button>
          </div>
        </aside>

        {/* ---------- 오른쪽: 음성 검색 · 필터 · 결과 ---------- */}
        <section className="tv-search-right" aria-label="검색 결과">
          <button
            type="button"
            className={`tv-search-voice${listening ? " is-listening" : ""}`}
            onClick={startVoice}
            disabled={!SpeechRecognition}
            title={SpeechRecognition ? "음성으로 검색" : "이 브라우저는 음성 검색을 지원하지 않아요"}
          >
            <span className="tv-search-mic" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                <path d="M6 11a6 6 0 0 0 12 0M12 17v4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </span>
            {listening ? "듣는 중…" : "길게 눌러 검색"}
          </button>

          <div className="tv-search-filter-line">
            <div className="tv-search-filters" role="tablist" aria-label="검색 결과 종류">
              {FILTERS.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`tv-search-filter${filter === f.id ? " is-active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tv-search-grid" ref={gridRef}>
            {cards.map((card) => (
              <button
                type="button"
                key={card.key}
                className="tv-search-card"
                onFocus={(e) => scrollCardIntoGrid(e.currentTarget)} // [수정] 결과 목록 안에서만 스크롤 (TV 화면 전체가 밀리지 않게)
                onClick={() => open(card)}
              >
                <span className="tv-search-thumb">
                  {card.image && <img src={card.image} alt="" loading="lazy" />}
                </span>
                <span className="tv-search-card-title">{card.title}</span>
              </button>
            ))}

            {cards.length === 0 && <p className="tv-search-empty">검색 결과가 없습니다.</p>}
          </div>
        </section>
      </div>

    </main>
  );
};

export default TvSearch;
