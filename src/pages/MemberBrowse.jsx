// src/pages/MemberBrowse.jsx
// [추가] 로그인 후 메인 "전체 보기" 페이지 — /browse/:key
// - 섹션 카드를 한 화면에 모두 (격자) · 카드는 홈 섹션과 같은 컴포넌트
//   · continue: 이어서 감상하기 (ContinueCard) · recommend: 지금, 놓치지 말아야 할 이야기 (RecommendCard)
//   · new: 지금, 새로운 작품을 만나보세요 (ShowcaseCard) · soon: 곧 찾아올 새로운 이야기 (ShowcaseCard)
// - 마음에 담아둔 이야기의 전체 보기는 기존 위시리스트 페이지(/wishlist)
// - 로그인 전에는 로그인 화면으로 · 모르는 key 는 홈으로
// - 스타일: member.scss (.member-browse) · mobile.scss
import React, { useEffect } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import "../member.scss";
import { useAuthStore } from "../store/useAuthStore";
import { useMovieStore } from "../store/useMovieStore";
import { isResumable, useWatchConnect, useWatchStore } from "../store/useWatchStore";
import { ContinueCard } from "../components/member/ContinueWatching";
import { RecommendCard, useRecommendItems } from "../components/member/RecommendSection";
import { useNewReleaseItems } from "../components/member/NewRelease";
import { useComingSoonItems } from "../components/member/ComingSoon";
import ShowcaseCard from "../components/member/ShowcaseCard";
import DetailBackLink from "../components/common/DetailBackLink"; // [추가] 상세 공용 "← 홈으로" (같은 자리)

const PAGES = {
  continue: { title: "이어보기", empty: "아직 시청 내역이 없습니다." },
  recommend: { title: "Apple 추천" },
  new: { title: "최신작" },
  soon: { title: "공개 예정" },
};

const ALL = Infinity;

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

  let cards = [];
  if (kind === "continue") {
    cards = history.map((h) => <ContinueCard key={`${h.type}_${h.id}`} h={h} />);
  } else if (kind === "recommend") {
    cards = recommend.map((item) => <RecommendCard key={`${item.media_type}_${item.id}`} item={item} />);
  } else if (kind === "new") {
    cards = fresh.map((tv) => <ShowcaseCard key={`tv_${tv.id}`} item={tv} type="tv" variant="new" />);
  } else {
    cards = soon.map((m) => <ShowcaseCard key={`movie_${m.id}`} item={m} type="movie" variant="soon" />);
  }

  const loading = kind === "continue" && (watchStatus === "idle" || watchStatus === "loading");
  if (loading) return null;
  if (cards.length === 0) {
    return <p className="member-empty">{PAGES[kind].empty || "보여드릴 작품을 불러오는 중입니다…"}</p>;
  }

  return (
    <ul className={`member-browse-grid member-browse-grid--${kind}`}>
      {cards.map((card) => (
        <li key={card.key}>{card}</li>
      ))}
    </ul>
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
