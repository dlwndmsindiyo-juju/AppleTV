import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useSportStore } from "../../store/useSportStore";
import { decodeHtml } from "./sportUtils";

export default function SportLive() {
  const videos = useSportStore((state) => state.liveVideos);
  const items = videos.filter((video) =>
    video.id?.videoId && video.snippet?.liveBroadcastContent === "live"
  );

  return (
    <section className="sport-live" id="sport-live" aria-labelledby="sport-live-title">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title" id="sport-live-title">라이브 <span aria-hidden="true">🔴</span></h3>
        </div>
        {items.length === 0 ? (
          <p className="sport-empty" role="status">진행 중인 라이브가 없습니다</p>
        ) : (
          <Swiper modules={[Navigation]} navigation slidesPerView="auto" spaceBetween={20}>
            {items.map(({ id, snippet }) => (
              <SwiperSlide key={id.videoId} className="sport-live-slide">
                <a className="sport-live-card" href={`https://www.youtube.com/watch?v=${id.videoId}`} target="_blank" rel="noreferrer" aria-label={`${decodeHtml(snippet.title)} 라이브 시청`}>
                  <img src={snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url} alt={decodeHtml(snippet.title)} />
                  <span className="sport-live-badge">◉ LIVE</span>
                  <span className="sport-live-watch">▶ 실시간 시청</span>
                </a>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>
    </section>
  );
}
