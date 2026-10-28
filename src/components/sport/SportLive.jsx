import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useSportStore } from "../../store/useSportStore";
import { decodeHtml } from "./sportUtils";
import { MOCK_LIVE_IDS } from "./liveMatchAdapter";

export default function SportLive() {
  // 프로젝트용 가짜 라이브: 짧은 경기 하이라이트를 LIVE 카드 형태로 표시합니다.
  // - 영상: YouTube MLS 하이라이트 클립 (1~4분, liveClips)
  //         → 키가 없거나 결과가 없으면 TheSportsDB 최신 경기 하이라이트(highlightList)
  const clips = useSportStore((state) => state.liveClips);
  const sdbVideos = useSportStore((state) => state.highlightList);
  const fetchLiveClips = useSportStore((state) => state.onFetchLiveClips);
  const fetchHighlightList = useSportStore((state) => state.onFetchHighlightList);
  useEffect(() => { fetchLiveClips(); fetchHighlightList(); }, [fetchLiveClips, fetchHighlightList]);
  const videos = clips.length > 0 ? clips : sdbVideos;
  const items = videos.filter((video) => video.id?.videoId).slice(0, 4);

  // 카드 → 라이브 상세(/sport/match/:id) 연결
  // - 진행 중인 실제 경기(liveMatches)가 있으면 그 경기 순서대로, 없으면 목업 라이브 경기(sample · l1 ~ l7)
  // - 히어로 "경기 시청" · 하단 LIVE 배너와 같은 상세 페이지(SportLivePage)로 이동
  const liveMatches = useSportStore((state) => state.liveMatches);
  const matchIds = liveMatches?.length > 0 ? liveMatches.map((m) => String(m.id)) : MOCK_LIVE_IDS;
  const matchPathAt = (index) => `/sport/match/${matchIds[index % matchIds.length]}`;

  return (
    <section className="sport-live" id="sport-live" aria-labelledby="sport-live-title">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title" id="sport-live-title">라이브 <span aria-hidden="true">🔴</span></h3>
        </div>
        {items.length === 0 ? (
          <p className="sport-empty" role="status">표시할 영상이 없습니다</p>
        ) : (
          <Swiper modules={[Navigation]} navigation slidesPerView="auto" spaceBetween={20}>
            {items.map(({ id, snippet, durationText }, index) => (
              <SwiperSlide key={id.videoId} className="sport-live-slide">
                <Link className="sport-live-card" to={matchPathAt(index)} aria-label={`${decodeHtml(snippet.title)} 라이브 시청`}>
                  <img src={snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url} alt={decodeHtml(snippet.title)} />
                  <span className="sport-live-badge">
                    <img className="sport-live-icon" src="/icons/live/live-icon.svg" alt="" aria-hidden="true" />
                    LIVE
                  </span>
                  {/* 시안: 왼쪽 아래 재생 + 영상 길이 */}
                  <span className="sport-live-watch">
                    <img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" />
                    {durationText || "실시간 시청"}
                  </span>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}
