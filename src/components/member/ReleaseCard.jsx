import React from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { img, detailPath } from "./memberUtils";
import { useContentInfo, contentMeta, shortGenres } from "./useContentInfo";

// 신규출시(NewRelease) · 공개예정작(ComingSoon) 공용 카드 — 시안
// - 카드 배경 Dark/400 · 왼쪽 포스터 · 오른쪽 제목 / 장르 줄 / 소개 2줄
// - 버튼: [N월 공개예정] (118 × 40 · 보라) + [알림 벨] (40 × 40 · 누르면 켜지고 다시 누르면 꺼짐)
// - 포스터 · 제목 · [N월 공개예정] 을 누르면 상세 페이지

const BellIcon = ({ on }) => (
  <svg className="member-nr-bell-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.4A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6z"
      fill={on ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M9.5 19.5a2.6 2.6 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// "2026-11-14" → "11월 공개예정"
const monthLabel = (date) => {
  const month = Number((date || "").split("-")[1]);
  return month ? `${month}월 공개예정` : "공개예정";
};

const ReleaseCard = ({ item, type }) => {
  const alarms = useMovieStore((s) => s.alarms);
  const onToggleAlarm = useMovieStore((s) => s.onToggleAlarm);
  const info = useContentInfo(type, item.id);

  const title = item.title || item.name;
  const path = detailPath(type, item.id);
  const key = `${type}_${item.id}`;
  const on = alarms.includes(key);

  return (
    <div className="member-nr-card">
      <Link to={path} className="member-nr-poster" aria-label={`${title} 상세 보기`}>
        <img src={img(item.poster_path, "w342")} alt="" loading="lazy" />
      </Link>

      <div className="member-nr-info">
        <Link to={path} className="member-nr-title">{title}</Link>
        <span className="member-nr-genre">{contentMeta(type, info, shortGenres(type, item.genre_ids))}</span>
        <p className="member-nr-overview">{item.overview || info.tagline || "작품 소개가 곧 공개됩니다."}</p>

        <div className="member-nr-actions">
          <Link to={path} className="member-nr-month">
            {monthLabel(item.release_date || item.first_air_date)}
          </Link>
          <button
            type="button"
            className={`member-nr-bell${on ? " is-on" : ""}`}
            aria-pressed={on}
            aria-label={on ? `${title} 알림 끄기` : `${title} 알림 받기`}
            onClick={() => onToggleAlarm(key)}
          >
            <BellIcon on={on} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReleaseCard;
