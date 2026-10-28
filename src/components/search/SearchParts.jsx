// src/components/search/SearchParts.jsx
// 검색하기 플로우 공용 조각 (검색 결과 · 인물 · 작품 페이지에서 함께 사용)
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { AVAILABILITY, IMG, itemKey, useSearchStore } from "../../store/useSearchStore";

// ---------- 아이콘 ----------
// 글자색을 따라가는 아이콘 (public/icons/*.svg 를 mask 로 사용)
export const MaskIcon = ({ name, className = "" }) => (
  <span className={`search-mask-icon search-mask-icon--${name} ${className}`} aria-hidden="true" />
);

// 지우기(×)
const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ---------- 검색창 ----------
export const SearchBox = ({ value, onChange, onSubmit, onClear, inputRef, autoFocus }) => (
  <form
    className="search-box-lg"
    role="search"
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit?.(value);
    }}
  >
    <img className="search-box-lg-icon" src="/icons/search.svg" alt="" aria-hidden="true" />
    <input
      ref={inputRef}
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="작품 · 인물 · 장르를 검색하세요"
      aria-label="검색어"
      autoFocus={autoFocus}
      enterKeyHint="search"
    />
    {value && (
      <button type="button" className="search-box-lg-clear" onClick={onClear} aria-label="검색어 지우기">
        <ClearIcon />
      </button>
    )}
  </form>
);

// ---------- 돌아가기 링크 ----------
export const BackLink = ({ to, label, state }) => (
  <Link className="search-back" to={to} state={state}>
    <MaskIcon name="back" />
    {label}
  </Link>
);

// ---------- 작품 카드 정보 ----------
export const typeLabel = (type) => (type === "tv" ? "시리즈" : "영화");

export const yearOf = (item) => (item?.release_date || item?.first_air_date || "").slice(0, 4);

// "영화 · 드라마 · 2022"
export const useMetaText = (item, type) => {
  const genres = useSearchStore((s) => s.genres);
  if (!item) return "";
  const genreName =
    item.genres?.[0]?.name || genres[type]?.[item.genre_ids?.[0]] || "";
  return [typeLabel(type), genreName, yearOf(item)].filter(Boolean).join(" · ");
};

// 이용 방법 문구 (아직 확인 중이면 빈 칸)
export const useAvailability = (type, id) =>
  useSearchStore((s) => s.availability[itemKey(type, id)]);

export const availabilityText = (value) =>
  value && value !== "loading" ? AVAILABILITY[value].card : "이용 정보 확인 중";

// ---------- 작품 카드 (16:9) ----------
export const ContentCard = ({ item, backTo }) => {
  const type = item.media_type === "tv" ? "tv" : "movie";
  const title = item.title || item.name;
  const meta = useMetaText(item, type);
  const avail = useAvailability(type, item.id);
  const image = item.backdrop_path || item.poster_path;

  return (
    <li className="search-card">
      <Link to={`/search/title/${type}/${item.id}`} state={{ backTo }} className="search-card-link">
        <span className={`search-card-thumb${image ? "" : " is-empty"}`}>
          {image ? (
            <img src={`${IMG}/w500${image}`} alt="" loading="lazy" />
          ) : (
            <span>이미지 준비 중</span>
          )}
        </span>
        <strong className="search-card-title">{title}</strong>
        <span className="search-card-meta">{meta}</span>
        <span className={`search-card-avail is-${avail || "loading"}`}>{availabilityText(avail)}</span>
      </Link>
    </li>
  );
};

// 카드 목록 (PC 4칸)
export const CardGrid = ({ items, backTo, cols = 4 }) => (
  <ul className={`search-grid search-grid--${cols}`}>
    {items.map((item) => (
      <ContentCard key={itemKey(item.media_type, item.id)} item={item} backTo={backTo} />
    ))}
  </ul>
);

// ---------- 검색 결과 · 둘러보기: 세로 포스터 (시안: 8칸) ----------
export const PosterGrid = ({ items, backTo, onPick }) => (
  <ul className="search-posters">
    {items.map((item) => {
      const type = item.media_type === "tv" ? "tv" : "movie";
      const title = item.title || item.name;
      return (
        <li key={itemKey(type, item.id)} className="search-poster-item">
          <Link
            to={`/search/title/${type}/${item.id}`}
            state={{ backTo }}
            className="search-poster"
            aria-label={title}
            onClick={() => onPick?.(item)}
          >
            {item.poster_path ? (
              <img src={`${IMG}/w342${item.poster_path}`} alt="" loading="lazy" />
            ) : (
              <span className="search-poster-empty">{title}</span>
            )}
          </Link>
        </li>
      );
    })}
  </ul>
);

// 불러오는 중 자리표시 포스터
export const PosterSkeleton = ({ count = 8 }) => (
  <ul className="search-posters search-skeleton" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <li key={i} className="search-poster-item">
        <span className="search-poster" />
      </li>
    ))}
  </ul>
);

// ---------- 인물 ----------
const DEPARTMENT = {
  Acting: "배우",
  Directing: "감독",
  Writing: "작가",
  Production: "제작자",
  Sound: "음악",
  Camera: "촬영",
  Editing: "편집",
};
export const departmentLabel = (dept) => DEPARTMENT[dept] || dept || "";

// 한글 이름: also_known_as 중 한글이 있으면 그 이름, 없으면 TMDB 이름
export const koreanName = (person) =>
  (person?.also_known_as || []).find((n) => /[가-힣]/.test(n)) || person?.name || "";

// ---------- 인기 검색 결과 · 최근 검색 항목 카드 ----------
// 시안: [썸네일] ‘크로우디드’ - The Crowded Room / TV 프로그램 - 스릴러
const RESULT_TYPE = { movie: "영화", tv: "TV 프로그램", person: "인물" };

// 검색 결과(작품 · 인물) → 카드 / 최근 검색 항목에 쓰는 값
export const useResultEntry = () => {
  const genres = useSearchStore((s) => s.genres);
  return (item) => {
    const type = item.media_type === "person" ? "person" : item.media_type === "tv" ? "tv" : "movie";
    if (type === "person") {
      const name = koreanName(item);
      const en = item.name && item.name !== name ? item.name : "";
      return {
        type,
        id: item.id,
        title: en ? `‘${name}’ - ${en}` : `‘${name}’`,
        sub: [RESULT_TYPE.person, departmentLabel(item.known_for_department)].filter(Boolean).join(" - "),
        image: item.profile_path || null,
      };
    }
    const title = item.title || item.name;
    const original = item.original_title || item.original_name;
    const genre = genres[type]?.[item.genre_ids?.[0]] || item.genres?.[0]?.name || "";
    return {
      type,
      id: item.id,
      title: original && original !== title ? `‘${title}’ - ${original}` : `‘${title}’`,
      sub: [RESULT_TYPE[type], genre].filter(Boolean).join(" - "),
      image: item.poster_path || null,
    };
  };
};

export const entryPath = (entry) =>
  entry.type === "person" ? `/search/person/${entry.id}` : `/search/title/${entry.type}/${entry.id}`;

export const ResultCard = ({ entry, backTo, onPick }) => (
  <li>
    <Link className="search-result-card" to={entryPath(entry)} state={{ backTo }} onClick={() => onPick?.(entry)}>
      <span className="search-result-thumb">
        {entry.image && <img src={`${IMG}/w185${entry.image}`} alt="" loading="lazy" />}
      </span>
      <span className="search-result-text">
        <strong>{entry.title}</strong>
        <span>{entry.sub}</span>
      </span>
    </Link>
  </li>
);

// ---------- 공유 (기존 상세 페이지와 같은 방식) ----------
export const shareCurrentPage = async (title) => {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("링크가 복사되었습니다.");
    }
  } catch {
    // 공유 취소 등은 무시
  }
};

// ---------- 예고편 팝업 ----------
export const TrailerPopup = ({ videoKey, onClose }) => {
  // Esc 로 닫기 · 뒤 화면 스크롤 막기
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
  <div className="search-popup" role="dialog" aria-modal="true" aria-label="예고편">
    <button type="button" className="search-popup-close" onClick={onClose}>
      닫기
    </button>
    {videoKey ? (
      <iframe
        src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`}
        title="예고편"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    ) : (
      <p>재생할 수 있는 예고편이 없습니다.</p>
    )}
  </div>
  );
};
