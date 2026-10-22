import { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useSportStore } from "../../store/useSportStore";
import { decodeHtml } from "./sportUtils";

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
            {items.map(({ id, snippet, durationText }) => (
              <SwiperSlide key={id.videoId} className="sport-live-slide">
                <a className="sport-live-card" href={`https://www.youtube.com/watch?v=${id.videoId}`} target="_blank" rel="noreferrer" aria-label={`${decodeHtml(snippet.title)} 라이브 시청`}>
                  <img src={snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url} alt={decodeHtml(snippet.title)} />
                  <span className="sport-live-badge">◉ LIVE</span>
                  <span className="sport-live-watch">▶ 실시간 시청</span>
                  {durationText && <span className="sport-live-time" aria-hidden="true">{durationText}</span>}
                </a>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}
