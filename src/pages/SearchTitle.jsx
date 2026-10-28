// src/pages/SearchTitle.jsx
// 작품 페이지 (/search/title/:type/:id) — 시안: 검색하기 PDF "레드 스패로 / 더 브릿지 / 패신저스"
// 대한민국 이용 방법에 따라 버튼이 바뀜
//   구독으로 시청  → ▶ 지금 보기(기존 상세 페이지에서 바로 재생) + 보관함에 추가
//   대여·구매      → Apple TV 앱에서 보기(tv.apple.com 검색) + 보관함에 추가
//   이용 불가      → 이용 가능 알림 받기 + 시청 가능한 유사 작품(아래 목록으로 이동)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMovieStore } from "../store/useMovieStore";
import { toggleWish, useHeartStore, wishKey } from "../store/useHeartStore";
import { AVAILABILITY, IMG, itemKey, useSearchStore } from "../store/useSearchStore";
import { detailPath } from "./MovieDetail";
import {
  BackLink,
  CardGrid,
  MaskIcon,
  TrailerPopup,
  shareCurrentPage,
  useMetaText,
} from "../components/search/SearchParts";
import "../search.scss";

const RELATED_COUNT = 8;

const SearchTitle = () => {
  const { type: typeParam, id } = useParams();
  const type = typeParam === "tv" ? "tv" : "movie";
  const contentId = Number(id);
  const key = itemKey(type, contentId);
  const location = useLocation();
  const navigate = useNavigate();
  const backTo = location.state?.backTo || { path: "/search", label: "검색으로 돌아가기" };

  const { titles, availability, onLoadTitle, onLoadAvailability, onLoadGenres } = useSearchStore();
  const { alarms, onToggleAlarm } = useMovieStore();
  const wished = useHeartStore((s) => Boolean(s.items[wishKey(type, contentId)]));
  const [trailerOpen, setTrailerOpen] = useState(false);
  const relatedRef = useRef(null);

  useEffect(() => {
    onLoadGenres();
    onLoadTitle(type, contentId);
    setTrailerOpen(false);
    window.scrollTo(0, 0);
  }, [type, contentId, onLoadTitle, onLoadGenres]);

  const entry = titles[key];
  const detail = entry?.detail;
  const avail = availability[key];
  const meta = useMetaText(detail, type);

  // 관련 작품 (추천 + 비슷한 작품, 겹치면 하나로)
  const relatedAll = useMemo(() => {
    if (!detail) return [];
    const list = [...(detail.recommendations?.results || []), ...(detail.similar?.results || [])]
      .filter((w) => w.backdrop_path || w.poster_path)
      .map((w) => ({ ...w, media_type: w.media_type === "tv" || w.media_type === "movie" ? w.media_type : type }));
    const seen = new Set();
    return list.filter((w) => {
      const k = itemKey(w.media_type, w.id);
      if (seen.has(k) || k === key) return false;
      seen.add(k);
      return true;
    });
  }, [detail, type, key]);

  const candidates = useMemo(() => relatedAll.slice(0, 16), [relatedAll]);

  useEffect(() => {
    if (candidates.length) onLoadAvailability(candidates);
  }, [candidates, onLoadAvailability]);

  // 대한민국에서 볼 수 있는 작품만 (확인이 끝났는데 하나도 없으면 전체를 보여줌)
  const isOk = (w) => ["subscription", "rent"].includes(availability[itemKey(w.media_type, w.id)]);
  const checking = candidates.some((w) => {
    const a = availability[itemKey(w.media_type, w.id)];
    return !a || a === "loading";
  });
  const availableRelated = candidates.filter(isOk).slice(0, RELATED_COUNT);
  const showFallback = !checking && availableRelated.length === 0;
  const related = showFallback ? candidates.slice(0, 4) : availableRelated;

  if (!entry || entry.status === "loading") {
    return (
      <main className="search-page search-title-page">
        <div className="search-inner">
          <p className="search-note">작품 정보를 불러오는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (entry.status === "error" || !detail) {
    return (
      <main className="search-page search-title-page">
        <div className="search-inner">
          <BackLink to={backTo.path} label={backTo.label} state={backTo.state} />
          <section className="search-state" role="alert">
            <h3 className="search-state-title">작품 정보를 불러오지 못했습니다.</h3>
            <button type="button" className="search-btn search-btn--white" onClick={() => onLoadTitle(type, contentId)}>
              다시 시도
            </button>
          </section>
        </div>
      </main>
    );
  }

  const title = detail.title || detail.name;
  const originalTitle = detail.original_title || detail.original_name;
  const image = detail.backdrop_path || detail.poster_path;
  const status = avail && avail !== "loading" ? avail : "none";
  const info = AVAILABILITY[status];

  const youtube = (detail.videos?.results || []).filter((v) => v.site === "YouTube");
  const trailer = youtube.find((v) => v.type === "Trailer") || youtube[0];

  const toggleWishItem = () =>
    toggleWish({
      id: contentId,
      type,
      title,
      poster_path: detail.poster_path,
      backdrop_path: detail.backdrop_path,
      overview: detail.overview,
    });
  const alarmKey = `${type}_${contentId}`;
  const alarmOn = alarms.includes(alarmKey);

  const wishButton = (
    <button
      type="button"
      className={`search-btn search-btn--gray search-btn--icon${wished ? " is-on" : ""}`}
      onClick={toggleWishItem}
      aria-pressed={wished}
    >
      <MaskIcon name={wished ? "check" : "plus"} />
      {wished ? "보관함에 추가됨" : "보관함에 추가"}
    </button>
  );

  let actions = null;
  if (status === "subscription") {
    actions = (
      <>
        <button
          type="button"
          className="search-btn search-btn--white search-btn--icon"
          onClick={() => navigate(`${detailPath(type, contentId)}?play=1`)}
        >
          <img className="search-play-icon" src="/icons/play-b.svg" alt="" aria-hidden="true" />
          지금 보기
        </button>
        {wishButton}
      </>
    );
  } else if (status === "rent") {
    actions = (
      <>
        <a
          className="search-btn search-btn--white"
          href={`https://tv.apple.com/kr/search?term=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Apple TV 앱에서 보기
        </a>
        {wishButton}
      </>
    );
  } else {
    actions = (
      <>
        <button
          type="button"
          className={`search-btn search-btn--white search-btn--icon${alarmOn ? " is-on" : ""}`}
          onClick={() => onToggleAlarm(alarmKey)}
          aria-pressed={alarmOn}
        >
          {alarmOn && <MaskIcon name="check" />}
          {alarmOn ? "알림 설정됨" : "이용 가능 알림 받기"}
        </button>
        <button
          type="button"
          className="search-btn search-btn--gray"
          onClick={() => relatedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          시청 가능한 유사 작품
        </button>
      </>
    );
  }

  const relatedTitle = status === "none" ? "지금 시청할 수 있는 유사 작품" : "관련 콘텐츠";
  // 관련 작품에서 다시 이 페이지로 돌아올 때
  const relatedBackTo = { path: location.pathname, label: `${title} 페이지로 돌아가기`, state: { backTo } };

  return (
    <main className="search-page search-title-page">
      <div className="search-inner">
        <BackLink to={backTo.path} label={backTo.label} state={backTo.state} />

        <section className="search-title-head">
          <div className={`search-keyart${image ? "" : " is-empty"}`}>
            {image ? <img src={`${IMG}/w1280${image}`} alt={title} /> : <span>이미지 준비 중</span>}
          </div>

          <div className="search-title-info">
            <h2 className="search-detail-title">{title}</h2>
            {originalTitle && originalTitle !== title && <p className="search-detail-sub">{originalTitle}</p>}
            <p className="search-detail-meta">{meta}</p>
            {detail.overview && <p className="search-detail-desc">{detail.overview}</p>}

            <div className="search-avail-box">
              <strong>{avail === "loading" || !avail ? "이용 정보를 확인하는 중입니다." : info.status}</strong>
              {avail && avail !== "loading" && <span>{info.detail}</span>}
            </div>

            <div className="search-actions">{actions}</div>

            <div className="search-text-actions">
              <button type="button" className="search-text-btn" onClick={() => setTrailerOpen(true)}>
                예고편
              </button>
              <button type="button" className="search-text-btn" onClick={() => shareCurrentPage(title)}>
                <img className="search-share-icon" src="/icons/share-btn.svg" alt="" aria-hidden="true" />
                공유
              </button>
            </div>
          </div>
        </section>

        <section className="search-section search-related-works" ref={relatedRef}>
          <div className="search-section-head">
            <h3 className="search-section-title">{relatedTitle}</h3>
            <span className="search-note">{showFallback ? "대한민국 기준" : "대한민국에서 이용 가능"}</span>
          </div>
          {related.length > 0 ? (
            <CardGrid items={related} backTo={relatedBackTo} />
          ) : (
            <p className="search-empty">
              {checking ? "이용 가능한 작품을 찾는 중입니다." : "관련 작품이 없습니다."}
            </p>
          )}
        </section>
      </div>

      {trailerOpen && <TrailerPopup videoKey={trailer?.key} onClose={() => setTrailerOpen(false)} />}
    </main>
  );
};

export default SearchTitle;
