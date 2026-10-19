import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { useSportStore } from "../../store/useSportStore";
import { decodeHtml } from "./sportUtils";

import "swiper/css";
import "swiper/css/navigation";

// 숏츠 (가로 스크롤 카드)
const SportShorts = ({ title = "숏츠" }) => {
  const { shortsVideos } = useSportStore();

  const items = (shortsVideos || []).filter((v) => v?.id?.videoId);
  if (items.length === 0) return null;

  return (
    <section className="sport-shorts">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <a className="sport-more" href="#">
            전체 보기 <span aria-hidden="true">→</span>
          </a>
        </div>

        <Swiper
          modules={[Navigation]}
          navigation
          slidesPerView="auto"
          spaceBetween={20}
        >
          {items.map((v) => {
            const sn = v.snippet || {};
            const thumb =
              sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url;

            return (
              <SwiperSlide key={v.id.videoId} className="sport-short-slide">
                <a
                  className="sport-short-card"
                  href={`https://www.youtube.com/watch?v=${v.id.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="sport-short-thumb">
                    {thumb && <img src={thumb} alt="" />}
                    <span className="sport-short-play" aria-hidden="true">
                      ▶
                    </span>
                  </div>
                  <h4 className="sport-short-title">
                    {decodeHtml(sn.title)}
                  </h4>
                  <span className="sport-short-meta">
                    {decodeHtml(sn.channelTitle)}
                  </span>
                </a>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
};

export default SportShorts;
