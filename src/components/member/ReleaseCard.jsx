import React from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { useWish } from "../../store/useHeartStore"; // 위시리스트 (찜)
import { img, detailPath } from "./memberUtils";
import { useContentInfo, contentMeta, shortGenres } from "./useContentInfo";

// 신규출시(NewRelease) · 공개예정작(ComingSoon) 공용 카드 — 시안
// - 카드 배경 Dark/400 · 왼쪽 포스터 · 오른쪽 제목 / 장르 줄 / 소개 2줄
// - 버튼: [N월 공개예정] (118 × 40 · 보라) + [알림 벨] (40 × 40 · 누르면 켜지고 다시 누르면 꺼짐)
// - 포스터 · 제목 · [N월 공개예정] 을 누르면 상세 페이지
// - [추가] 휴대폰 시안: 글자 없이 포스터 위 버튼만 (.member-nr-quick · PC · 태블릿에서는 숨김)
//   · variant="new" (신규출시): [재생] + [찜]
//   · variant="soon" (공개예정작 · 기본): [N월 공개예정 🔔] 하나 (누르면 알림 켜고 끄기)

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

const ReleaseCard = ({ item, type, variant = "soon" }) => {
  const alarms = useMovieStore((s) => s.alarms);
  const onToggleAlarm = useMovieStore((s) => s.onToggleAlarm);
  const info = useContentInfo(type, item.id);

  const title = item.title || item.name;
  const path = detailPath(type, item.id);
  const key = `${type}_${item.id}`;
  const on = alarms.includes(key);
  const { wished, toggle } = useWish(type, item.id);
  const month = monthLabel(item.release_date || item.first_air_date);

  return (
    <div className="member-nr-card">
      <Link to={path} className="member-nr-poster" aria-label={`${title} 상세 보기`}>
        <img src={img(item.poster_path, "w342")} alt="" loading="lazy" />
      </Link>

      <div className="member-nr-info">
        <Link to={path} className="member-nr-title">{title}</Link>
        <span className="member-nr-genre">{contentMeta(type, info, shortGenres(type, item.genre_ids))}</span>
        <p className="member-nr-overview">{item.overview || info?.tagline || "작품 소개가 곧 공개됩니다."}</p>{/* [수정] info?.: 정보를 받기 전(null)에 줄거리 없는 작품에서 화면이 멈추던 문제 */}

        {/* [수정] PC · 태블릿 버튼 — 데스크톱 시안: 신규출시는 [▶ 재생] [♡ 찜] · 공개예정작은 [N월 공개예정] [🔔]
            (버튼 크기 · 모양은 같은 클래스 그대로) */}
        <div className="member-nr-actions">
          {variant === "new" ? (
            <>
              <Link to={`${path}?play=1`} className="member-nr-month member-nr-play" aria-label={`${title} 재생`}>
                <img src="/icons/play-w.svg" alt="" aria-hidden="true" />
                재생
              </Link>
              <button
                type="button"
                className={`member-nr-bell member-nr-heart${wished ? " is-on" : ""}`}
                aria-pressed={wished}
                aria-label={wished ? `${title} 찜 해제` : `${title} 찜하기`}
                onClick={() => toggle({ title, poster_path: item.poster_path, backdrop_path: item.backdrop_path, overview: item.overview })}
              >
                <span className="member-nr-heart-icon" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <Link to={path} className="member-nr-month">
                {month}
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
            </>
          )}
        </div>
      </div>

      {/* [추가] 휴대폰: 포스터 위 버튼 (글자 영역은 숨김) */}
      <div className="member-nr-quick">
        {variant === "new" ? (
          <>
            <Link to={`${path}?play=1`} className="member-nr-quick-play" aria-label={`${title} 재생`}>
              <img src="/icons/play-w.svg" alt="" aria-hidden="true" />
            </Link>
            <button
              type="button"
              className={`member-nr-quick-heart${wished ? " is-on" : ""}`}
              aria-pressed={wished}
              aria-label={wished ? `${title} 찜 해제` : `${title} 찜하기`}
              onClick={() => toggle({ title, poster_path: item.poster_path, backdrop_path: item.backdrop_path, overview: item.overview })}
            >
              <span className="member-nr-quick-heart-icon" aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`member-nr-quick-month${on ? " is-on" : ""}`}
            aria-pressed={on}
            aria-label={on ? `${title} ${month} · 알림 끄기` : `${title} ${month} · 알림 받기`}
            onClick={() => onToggleAlarm(key)}
          >
            {month}
            <BellIcon on={on} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ReleaseCard;
