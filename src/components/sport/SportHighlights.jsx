import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSportStore } from "../../store/useSportStore";
import { decodeHtml } from "./sportUtils";

// 하이라이트 (카테고리 4칸: 경기 하이라이트 / 오늘의 골 / 선수 인터뷰 / 이번 주 베스트)
// - 영상: YouTube 카테고리별 검색 (6시간 캐시, 첫 칸은 최근 종료 경기가 있으면 그 경기 하이라이트)
// - 위 LIVE 카드(TheSportsDB)와 같은 영상은 제외
const SportHighlights = ({ title = "하이라이트" }) => {
  const categories = useSportStore((state) => state.highlightCategories);
  const finishedMatches = useSportStore((state) => state.finishedMatches);
  const fetchHighlightList = useSportStore((state) => state.onFetchHighlightList);
  const fetchCategories = useSportStore((state) => state.onFetchHighlightCategories);

  // LIVE 카드 목록을 먼저 받아야 중복 영상을 뺄 수 있어서 순서대로 호출
  const latestMatch = finishedMatches?.[0];
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchHighlightList();
      if (!cancelled) fetchCategories(latestMatch);
    })();
    return () => { cancelled = true; };
  }, [fetchHighlightList, fetchCategories, latestMatch]);

  const items = (categories || []).filter((c) => c.video?.id?.videoId);

  return (
    <section className="sport-highlights">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <Link className="sport-more" to="/sport/highlights">
            전체 보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" />
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="sport-empty">하이라이트 영상이 없습니다.</p>
        ) : (
          <ul className="sport-highlight-list">
            {items.map(({ key, label, video }) => {
              const sn = video.snippet || {};
              const thumb = sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url;

              return (
                <li key={key}>
                  <Link
                    className="sport-highlight-card"
                    to={`/sport/highlights?id=${video.id.videoId}`}
                  >
                    <div className="sport-highlight-thumb">
                      {thumb && <img src={thumb} alt="" />}
                      <span className="sport-highlight-play" aria-hidden="true">
                        <img className="play-icon" src="/icons/play-b.svg" alt="" aria-hidden="true" />
                      </span>
                    </div>
                    <h4 className="sport-highlight-title">{label}</h4>
                    <span className="sport-highlight-meta">{decodeHtml(sn.title)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default SportHighlights;
