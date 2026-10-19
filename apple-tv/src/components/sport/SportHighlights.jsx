import React from "react";
import { useSportStore } from "../../store/useSportStore";
import { decodeHtml } from "./sportUtils";

// 하이라이트 (영상 카드 4개)
const SportHighlights = ({ title = "하이라이트" }) => {
  const { highlightList } = useSportStore();

  const items = (highlightList || [])
    .filter((v) => v?.id?.videoId)
    .slice(0, 4);

  return (
    <section className="sport-highlights">
      <div className="inner">
        <div className="sport-section-head">
          <h3 className="sport-section-title">{title}</h3>
          <a className="sport-more" href="#">
            전체 보기 <span aria-hidden="true">→</span>
          </a>
        </div>

        {items.length === 0 ? (
          <p className="sport-empty">하이라이트 영상이 없습니다.</p>
        ) : (
          <ul className="sport-highlight-list">
            {items.map((v) => {
              const sn = v.snippet || {};
              const thumb =
                sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url;

              return (
                <li key={v.id.videoId}>
                  <a
                    className="sport-highlight-card"
                    href={`https://www.youtube.com/watch?v=${v.id.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="sport-highlight-thumb">
                      {thumb && <img src={thumb} alt="" />}
                      <span className="sport-highlight-play" aria-hidden="true">
                        ▶
                      </span>
                    </div>
                    <h4 className="sport-highlight-title">
                      {decodeHtml(sn.title)}
                    </h4>
                    <span className="sport-highlight-meta">
                      {decodeHtml(sn.channelTitle)}
                    </span>
                  </a>
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
