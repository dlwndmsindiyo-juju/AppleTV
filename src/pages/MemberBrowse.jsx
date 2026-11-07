// src/pages/MemberBrowse.jsx
// [추가] 로그인 후 메인 "전체 보기" 페이지 — /browse/:key
// - 섹션 카드를 한 화면에 모두 (격자) · 카드는 홈 섹션과 같은 컴포넌트
//   · continue: 이어서 감상하기 (ContinueCard) · recommend: 지금, 놓치지 말아야 할 이야기 (RecommendCard)
//   · new: 지금, 새로운 작품을 만나보세요 (ShowcaseCard) · soon: 곧 찾아올 새로운 이야기 (ShowcaseCard)
// - 마음에 담아둔 이야기의 전체 보기는 기존 위시리스트 페이지(/wishlist)
// - 로그인 전에는 로그인 화면으로 · 모르는 key 는 홈으로
// - 스타일: member.scss (.member-browse) · mobile.scss
// - [수정] 추천 · 최신작 · 공개 예정: 세로 포스터 나열 (숏폼 카드 정도 크기) · 장르별 제목으로 나눔
//   · 장르는 작품의 첫 번째 장르 (TMDB genre_ids · memberUtils 의 TV_GENRES / MOVIE_GENRES) · 없으면 "기타"
//   · [수정] 이어보기도 같은 포스터 · 포스터 맨 아래 시청 진행 바 (숏폼 진행 바와 같은 모양) · 누르면 멈춘 곳부터 재생
import React, { useEffect, useMemo } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import "../member.scss";
import { useAuthStore } from "../store/useAuthStore";
import { useMovieStore } from "../store/useMovieStore";
import { isResumable, useWatchConnect, useWatchStore } from "../store/useWatchStore";
import { useRecommendItems } from "../components/member/RecommendSection";
import { useNewReleaseItems } from "../components/member/NewRelease";
import { useComingSoonItems } from "../components/member/ComingSoon";
import { img, detailPath, TV_GENRES, MOVIE_GENRES } from "../components/member/memberUtils";
import DetailBackLink from "../components/common/DetailBackLink"; // [추가] 상세 공용 "← 홈으로" (같은 자리)

const PAGES = {
  continue: { title: "이어보기", empty: "아직 시청 내역이 없습니다." },
  recommend: { title: "Apple 추천" },
  new: { title: "최신작" },
  soon: { title: "공개 예정" },
};

const ALL = Infinity;
const OTHER_GENRE = "기타";

// 첫 번째 장르 이름 (영화 / 시리즈 장르표가 다름)
const firstGenre = (type, ids = []) => {
  const map = type === "tv" ? TV_GENRES : MOVIE_GENRES;
  return ids.map((id) => map[id]).find(Boolean) || OTHER_GENRE;
};

// 장르별로 묶기 (처음 나온 순서 · "기타" 는 맨 뒤)
const groupByGenre = (list) => {
  const groups = new Map();
  list.forEach((entry) => {
    const name = entry.genre || firstGenre(entry.type, entry.item.genre_ids);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(entry);
  });
  const rows = [...groups.entries()].map(([genre, entries]) => ({ genre, entries }));
  return [...rows.filter((r) => r.genre !== OTHER_GENRE), ...rows.filter((r) => r.genre === OTHER_GENRE)];
};

// 세로 포스터 카드 (누르면 상세 · 이어보기는 멈춘 곳부터 재생)
// - progress (0 ~ 1): 있으면 포스터 맨 아래 시청 진행 바
const BrowsePoster = ({ item, type, progress }) => {
  const title = item.title || item.name;
  const poster = img(item.poster_path, "w342") || img(item.backdrop_path, "w500");
  const resume = progress != null;
  const to = resume ? `${detailPath(type, item.id)}?play=1` : detailPath(type, item.id);
  return (
    <Link to={to} className="member-browse-poster" aria-label={resume ? `${title} 이어보기` : `${title} 상세 보기`}>
      <span className="member-browse-poster-img">
        {poster && <img src={poster} alt="" loading="lazy" />}
        {resume && (
          <span
            className="member-browse-progress"
            role="progressbar"
            aria-label="시청 진행률"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${progress * 100}%` }} />
          </span>
        )}
      </span>
      <span className="member-browse-poster-title">{title}</span>
    </Link>
  );
};

const BrowseGrid = ({ kind }) => {
  const uid = useAuthStore((s) => s.user?.uid);
  useWatchConnect(uid);
  const watchStatus = useWatchStore((s) => s.status);
  const history = useWatchStore((s) => s.items).filter(isResumable);

  const { onFetchAppleOriginals, onFetchUpcoming } = useMovieStore();
  useEffect(() => {
    onFetchAppleOriginals();
    onFetchUpcoming();
  }, [onFetchAppleOriginals, onFetchUpcoming]);

  const recommend = useRecommendItems(ALL);
  const fresh = useNewReleaseItems(ALL);
  const soon = useComingSoonItems(ALL);

  // 포스터로 보여 줄 작품 (추천 · 최신작 · 공개 예정)
  const posters = useMemo(() => {
    if (kind === "recommend") return recommend.map((item) => ({ item, type: item.media_type === "tv" ? "tv" : "movie" }));
    if (kind === "new") return fresh.map((item) => ({ item, type: "tv" }));
    if (kind === "soon") return soon.map((item) => ({ item, type: "movie" }));
    // 이어보기: 시청 기록 (장르는 기록에 저장된 h.genre)
    return history.map((h) => ({
      item: h,
      type: h.type,
      genre: h.genre || "",
      progress: Math.min(1, h.position / h.duration),
    }));
  }, [kind, recommend, fresh, soon, history]);
  const genreRows = useMemo(() => groupByGenre(posters), [posters]);

  const loading = kind === "continue" && (watchStatus === "idle" || watchStatus === "loading");
  if (loading) return null;
  if (posters.length === 0) {
    return <p className="member-empty">{PAGES[kind].empty || "보여드릴 작품을 불러오는 중입니다…"}</p>;
  }

  // [수정] 장르별 포스터 목록 (모든 전체 보기 공통)
  return (
    <div className="member-browse-genres">
      {genreRows.map(({ genre, entries }) => (
        <section className="member-browse-genre" key={genre} aria-label={genre}>
          <h2 className="member-browse-genre-title">{genre}</h2>
          <ul className="member-browse-posters">
            {entries.map(({ item, type, progress }) => (
              <li key={`${type}_${item.id}`}>
                <BrowsePoster item={item} type={type} progress={progress} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

const MemberBrowse = () => {
  const { key } = useParams();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);

  const page = PAGES[key];
  if (!page) return <Navigate to="/" replace />;
  if (!authReady) return <main className="member-home member-browse" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <main className="page-fade member-home member-browse">
      {/* [수정] 홈으로 — 상세 페이지와 같은 자리 (헤더 아래 · 이너 왼쪽) · 예전 제목 오른쪽 "홈으로 →" 는 뺌 */}
      <DetailBackLink to="/" label="홈으로" overlay />
      <section className="member-section">
        <div className="inner">
          <div className="member-head">
            <div>
              <h1 className="member-title">{page.title}</h1>
            </div>
          </div>

          <BrowseGrid kind={key} />
        </div>
      </section>
    </main>
  );
};

export default MemberBrowse;
