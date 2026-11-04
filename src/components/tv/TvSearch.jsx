import React, { useEffect, useMemo, useRef, useState } from "react";
import { TV_SPORT_BG } from "../../data/tvSportData";
import { mlsMatches, matchTitle } from "../../data/matchesData";
import { getTeamById } from "../../data/sportTeams";
import { useSportStore } from "../../store/useSportStore";
import { useSearchStore } from "../../store/useSearchStore";
import { useAuthStore } from "../../store/useAuthStore";
import { TMDB_IMG } from "../../utils/tmdb";
import { decodeHtml, ytThumb } from "../sport/sportUtils";
import { TvHeader } from "./TvRows";
import TvPlayer from "./TvPlayer";

// TV 검색 (1920 × 1080) — 위 메뉴에서 "검색" 을 고르면 나옴 · 스타일: TV.scss (.tv-search)
// - 시안은 스포츠 화면이지만 전체 검색: 작품(영화 · 시리즈) + 경기 + 하이라이트
// - 왼쪽: "검색" 제목(SF Pro Bold 76) · 자판 종류(abc · ABC · #+-) · 리모컨 자판 6줄 · 공백 / 지우기 1글자 / 지우기
//   · 글자를 입력하면 제목 자리에 입력한 글자
// - 오른쪽 위: 마이크 "길게 눌러 검색" (브라우저 음성 인식 · 한국어)
// - 결과: 전체 · 경기 · 하이라이트 (전체 = 작품 + 경기 + 하이라이트) · 3열 카드 + 아래 제목
// - 카드: 하이라이트 → 바로 재생 / 경기 → 그 경기 하이라이트를 찾아 재생 (로그인 전에는 구독 안내 팝업)

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const DIGITS = "1234567890".split("");
const SYMBOLS = ".-_!@#$%^&*~+=()[]{}?/:;,'\"<>".split("").slice(0, 36);
const MODES = ["abc", "ABC", "#+-"];
const FILTERS = [
  { id: "all", label: "전체" },
  { id: "match", label: "경기" },
  { id: "highlight", label: "하이라이트" },
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
export const TvSearch = ({ onMenu, initialQuery = "" }) => {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState("abc");
  const [filter, setFilter] = useState("all");
  const [listening, setListening] = useState(false);
  const [playing, setPlaying] = useState(null);
  const recRef = useRef(null);
  const loggedOut = useAuthStore((s) => s.authReady && !s.user);

  // 하이라이트 (스포츠 홈과 같은 데이터)
  const highlightList = useSportStore((s) => s.highlightList);
  const fetchHighlightList = useSportStore((s) => s.onFetchHighlightList);
  const fetchHighlights = useSportStore((s) => s.onFetchHighlights);
  useEffect(() => {
    fetchHighlightList();
  }, [fetchHighlightList]);

  // 작품 (웹 검색과 같은 TMDB 검색 · 입력이 멈추고 0.4초 뒤)
  const onSearch = useSearchStore((s) => s.onSearch);
  const results = useSearchStore((s) => s.results);
  const searchQuery = useSearchStore((s) => s.query);
  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  // 음성 인식 정리
  useEffect(() => () => recRef.current?.abort?.(), []);

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

    const matches = mlsMatches
      .filter((m) => {
        const home = getTeamById(m.homeId);
        const away = getTeamById(m.awayId);
        return hit(matchTitle(m), m.homeTeam, m.awayTeam, home?.enName, away?.enName);
      })
      .map((m) => ({ key: `match-${m.id}`, kind: "match", title: matchTitle(m), image: m.image, match: m }));

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
      .filter((v) => hit(v.title));

    // 작품: 검색어가 있을 때만 (TMDB 결과가 지금 검색어의 결과일 때)
    const works =
      q && norm(searchQuery) === q
        ? [...(results.movie || []), ...(results.tv || [])]
            .filter((r) => r.backdrop_path || r.poster_path)
            .slice(0, 18)
            .map((r) => ({
              key: `work-${r.media_type}-${r.id}`,
              kind: "work",
              title: r.title || r.name,
              image: `${TMDB_IMG}/w780${r.backdrop_path || r.poster_path}`,
            }))
        : [];

    if (filter === "match") return matches;
    if (filter === "highlight") return highlights;
    return [...works, ...matches, ...highlights];
  }, [query, filter, highlightList, results, searchQuery]);

  const highlightCards = useMemo(() => cards.filter((c) => c.kind === "highlight"), [cards]);

  // 카드 누르기
  const open = async (card) => {
    if (card.kind === "highlight") {
      setPlaying(card);
      return;
    }
    if (card.kind === "match") {
      const m = card.match;
      const home = getTeamById(m.homeId);
      const away = getTeamById(m.awayId);
      const key = `tv-search-${m.id}`;
      await fetchHighlights(key, `${home?.enName || m.homeTeam} vs ${away?.enName || m.awayTeam}`);
      const found = (useSportStore.getState().highlights[key] || []).find((v) => v?.id?.videoId);
      if (found) {
        setPlaying({ id: found.id.videoId, title: card.title, image: ytThumb(found), label: "경기 하이라이트", desc: decodeHtml(found.snippet?.description) });
      }
    }
  };

  const keys = keysFor(mode);

  return (
    <main className="tv-screen tv-sport tv-search" style={{ "--tv-sport-bg": `url(${TV_SPORT_BG})` }}>
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

          <div className="tv-search-grid">
            {cards.map((card) => (
              <button
                type="button"
                key={card.key}
                className="tv-search-card"
                data-gate={loggedOut && card.kind !== "work" ? "watch" : undefined}
                onFocus={(e) => e.currentTarget.scrollIntoView({ block: "nearest" })}
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

      <TvPlayer video={playing} related={highlightCards} onClose={() => setPlaying(null)} />
    </main>
  );
};

export default TvSearch;
