import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { useSportStore } from "../../store/useSportStore";
import { decodeHtml } from "./sportUtils";

// 하이라이트 (시안: 썸네일 위에 제목 · 설명 · "▶ 하이라이트 · 1분" 이 겹치는 카드 슬라이드)
// - 데이터: YouTube 카테고리 영상(경기 하이라이트 / 오늘의 골 / 선수 인터뷰 / 이번 주 베스트)
//           + TheSportsDB 최신 경기 하이라이트 → 겹치는 영상은 하나로 (하이라이트 상세 목록과 같은 순서)
// - 카드를 누르면 /sport/highlights?id=영상ID 에서 재생 (로그인 전에는 구독 팝업)
// 영상 길이 "1:02" · "1:02:03" → 시안 표기 "1분" (1분 미만도 1분)
const minutesText = (durationText = "") => {
  const parts = String(durationText).split(":").map(Number);
  if (parts.length < 2 || parts.some(Number.isNaN)) return "";
  const sec = parts.reduce((acc, n) => acc * 60 + n, 0);
  return `${Math.max(1, Math.round(sec / 60))}분`;
};

const SportHighlights = ({ title = "하이라이트" }) => {
  const categories = useSportStore((state) => state.highlightCategories);
  const highlightList = useSportStore((state) => state.highlightList);
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

  // 카테고리 영상 → TheSportsDB 하이라이트 순, 같은 영상은 한 번만
  const items = useMemo(() => {
    const seen = new Set();
    return [
      ...(categories || []).filter((c) => c.video?.id?.videoId).map((c) => ({ video: c.video, label: c.label })),
      ...(highlightList || []).map((video) => ({ video, label: "하이라이트" })),
    ]
      .filter(({ video }) => !seen.has(video.id.videoId) && seen.add(video.id.videoId))
      .map(({ video, label }) => {
        const sn = video.snippet || {};
        const id = video.id.videoId;
        return {
          id,
          title: decodeHtml(sn.title),
          desc: decodeHtml(sn.description) || sn.channelTitle || "",
          meta: [label, minutesText(video.durationText)].filter(Boolean).join(" · "),
          thumb:
            sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
      });
  }, [categories, highlightList]);

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
          <Swiper
            className="sport-hl-swiper"
            modules={[Navigation]}
            navigation
            grabCursor
            slidesPerView="auto"
            spaceBetween={24}
            breakpoints={{ 0: { spaceBetween: 12 }, 768: { spaceBetween: 24 } }}
          >
            {items.map((item) => (
              <SwiperSlide key={item.id} className="sport-hl-slide">
                <Link className="sport-hl-card" to={`/sport/highlights?id=${item.id}`} aria-label={`${item.title} 재생`}>
                  <img className="sport-hl-thumb" src={item.thumb} alt="" loading="lazy" />
                  <span className="sport-hl-body">
                    <strong className="sport-hl-title">{item.title}</strong>
                    {item.desc && <span className="sport-hl-desc">{item.desc}</span>}
                    <span className="sport-hl-meta">
                      <img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" />
                      {item.meta}
                    </span>
                  </span>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
};

export default SportHighlights;
