import React from "react";
import { Link } from "react-router-dom";
import { SwiperSlide } from "swiper/react";
import Rail from "../common/Rail";
import { img, detailPath } from "./memberUtils";
import { useAuthStore } from "../../store/useAuthStore";
import { isResumable, useWatchConnect, useWatchStore } from "../../store/useWatchStore";

// 이어보기 — 실제 시청 기록 (Firestore users/{uid}/watchHistory · 계정 하나에 저장)
// - 상세 페이지 재생 팝업에서 본 위치가 저장되고, 가장 최근에 본 작품이 맨 앞
// - 끝까지 본 작품(95% 이상)은 빠짐
// - 기록이 없으면(처음 구독 등) "아직 시청 내역이 없습니다."
// - 카드를 누르면 상세 페이지에서 멈춘 곳부터 바로 재생 (?play=1)

// 남은 시간: "18분 남음" (1분 미만은 "1분 미만 남음")
const remainText = (h) => {
  const left = Math.max(0, h.duration - h.position);
  return left < 60 ? "1분 미만 남음" : `${Math.round(left / 60)}분 남음`;
};

const ContinueWatching = () => {
  const uid = useAuthStore((s) => s.user?.uid);
  useWatchConnect(uid);
  const status = useWatchStore((s) => s.status);
  const items = useWatchStore((s) => s.items).filter(isResumable);

  // 기록을 불러오는 동안은 비워 둠 (빈 안내가 잠깐 보였다 사라지지 않게)
  const loading = status === "idle" || status === "loading";

  return (
    <section className="member-section member-continue">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">이어보기</h2>
            <p className="member-desc">멈춘 곳에서 이어서 감상하기</p>
          </div>
        </div>

        {loading ? null : items.length === 0 ? (
          <p className="member-empty">아직 시청 내역이 없습니다.</p>
        ) : (
          <Rail className="rail-continue" label="이어보기">
            {items.map((h) => {
              const progress = Math.min(1, h.position / h.duration);
              const isTv = h.type === "tv";
              return (
                <SwiperSlide key={`${h.type}_${h.id}`}>
                  <Link to={`${detailPath(h.type, h.id)}?play=1`} className="member-card">
                    <div className="member-thumb landscape">
                      {(h.backdrop_path || h.poster_path) && (
                        <img
                          src={img(h.backdrop_path || h.poster_path, "w780")}
                          alt={h.title}
                          loading="lazy"
                        />
                      )}
                    </div>
                    {/* 시청 진행 바 (시안: 썸네일 바로 아래) */}
                    <div
                      className="member-progress"
                      role="progressbar"
                      aria-label="시청 진행률"
                      aria-valuenow={Math.round(progress * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${progress * 100}%` }} />
                    </div>
                    <h3 className="member-card-title">{h.title}</h3>
                    <span className="member-card-meta">
                      {[h.genre, isTv ? "시리즈" : "영화"].filter(Boolean).join(" · ")}
                    </span>
                    <span className="member-card-meta">
                      {[
                        isTv && h.season != null && `시즌 ${h.season}`,
                        isTv && h.episode != null && `${h.episode}화`,
                        remainText(h),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="member-card-link">이어보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" /></span>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Rail>
        )}
      </div>
    </section>
  );
};

export default ContinueWatching;
