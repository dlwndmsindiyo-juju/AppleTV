import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useSportStore } from "../../store/useSportStore";
import { decodeHtml } from "./sportUtils";

export default function SportLive() {
  // 시안 요청에 따라 하이라이트 영상을 LIVE 카드 형태로 표시합니다.
  const videos = useSportStore((state) => state.highlightList);
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
