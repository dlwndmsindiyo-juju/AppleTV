import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWish } from "../../store/useHeartStore"; // 위시리스트 (찜)
import { useMovieStore } from "../../store/useMovieStore"; // [추가] 공개 알림 (공개예정작)
import { img, detailPath } from "./memberUtils";
import { useContentInfo, contentMeta, shortGenres } from "./useContentInfo";

// [추가] 로그인 후 메인 PC 가로형 카드 — 시안 (Apple TV 구독 hi-fi 데스크탑)
// - 지금, 새로운 작품을 만나보세요 (variant="new") · 곧 찾아올 새로운 이야기 (variant="soon") 공용
// - 카드 기본 346 × 214 · 모서리 10 · 오른쪽 위 tv 로고 · 스타일: member.scss (.member-sc-*)
// - variant="new": 마우스를 올리면 450 × 280 카드로 커지며 제목 · 장르 · 줄거리 · [▶ 재생] [♡ 찜]
//   · 제목 Heading/h2-B · Light/100 / 장르 Body/small · Light/500 / 줄거리 Body/default · Light/500
//   · 재생: 추천작 [▶ 재생] 과 같은 버튼 / 찜: 하트 20 × 20 · 원 배경 40 × 40
// - variant="soon": 왼쪽 아래 "N월 공개 🔔" 상자 (패딩 10 6 · 배경 Sports/Opacity-b · Body/small-B · 글자 · 아이콘 Light/0)
//   · [수정] 상자를 누르면 공개 알림 켜기 / 끄기 (기존 공개예정 카드의 알림 벨과 같은 기능 · 켜지면 채운 벨)
//   · [수정] 마우스를 올리면 신규출시와 같은 커지는 카드 (ShowcaseHover 공용) — 버튼만 다름
//     [N월 공개예정] 120 × 40 (패딩 14 6 · Body/default · Light/0 · 프라이머리 · 누르면 상세) + [🔔] 원 40 × 40 · 벨 24 × 24 (누르면 알림)
// - 카드(이미지)를 누르면 상세 페이지
// - [수정] 태블릿 · 휴대폰(1024px 이하): 글자 · 버튼 없이 제목이 들어간 세로 포스터(poster_path)만 · 누르면 상세
//   (마우스 호버 없음 · 스타일: member.scss · mobile.scss .member-sc-slot--static)

const HOVER_QUERY = "(min-width: 1025px)"; // [추가] PC: 마우스를 올리면 커지는 카드

// [수정] 화면 폭 조건이 맞는지 (화면 폭이 바뀌면 다시 계산)
const useMedia = (query) => {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
};

// 알림 벨 (꺼짐: 테두리 · 켜짐: 채움) — 색은 글자색(currentColor)
const BellIcon = ({ on }) => (
  <svg className="member-sc-bell" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
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

// [추가] 마우스를 올리면 보이는 내용 (신규출시 · 공개예정작 공용) — 제목 · 장르 · 줄거리 + 버튼(children)
// - 키보드로 버튼에 포커스가 와도 보임 (member.scss .member-sc-slot:focus-within)
const ShowcaseHover = ({ title, meta, overview, children }) => (
  <div className="member-sc-hover">
    <strong className="member-sc-title">{title}</strong>
    <span className="member-sc-genre">{meta}</span>
    {overview && <p className="member-sc-overview">{overview}</p>}
    <div className="member-sc-actions">{children}</div>
  </div>
);

// "2026-11-14" → "11월 공개" (시안: 01월 공개)
const monthLabel = (date) => {
  const month = Number((date || "").split("-")[1]);
  return month ? `${String(month).padStart(2, "0")}월 공개` : "공개 예정";
};

const ShowcaseCard = ({ item, type, variant = "new" }) => {
  const info = useContentInfo(type, item.id);
  const { wished, toggle } = useWish(type, item.id);
  const alarmKey = `${type}_${item.id}`;
  const alarmOn = useMovieStore((s) => s.alarms.includes(alarmKey));
  const onToggleAlarm = useMovieStore((s) => s.onToggleAlarm);

  const title = item.title || item.name;
  const path = detailPath(type, item.id);
  const thumb = img(item.backdrop_path, "w780") || img(item.poster_path, "w500");
  const isNew = variant === "new";
  const month = monthLabel(item.release_date || item.first_air_date); // "11월 공개"
  const releaseLabel = month.endsWith("월 공개") ? `${month}예정` : month; // "11월 공개예정" (날짜 없으면 "공개 예정")
  const meta = contentMeta(type, info, shortGenres(type, item.genre_ids));
  const overview = item.overview || info?.tagline || "작품 소개가 곧 공개됩니다.";
  const hoverMode = useMedia(HOVER_QUERY); // [추가] PC 만 호버 카드
  const poster = img(item.poster_path, "w500") || thumb; // [추가] 태블릿 · 휴대폰: 제목이 들어간 세로 포스터

  // [수정] 태블릿 · 휴대폰: 포스터만 (글자 · 버튼 없음)
  if (!hoverMode) {
    return (
      <div className={`member-sc-slot member-sc-slot--${variant} member-sc-slot--static`}>
        <div className="member-sc-card">
          <Link to={path} className="member-sc-link" aria-label={`${title} 상세 보기`}>
            {poster && <img className="member-sc-thumb" src={poster} alt="" loading="lazy" />}
          </Link>
        </div>
      </div>
    );
  }

  // 제목 · 장르 · 줄거리 + 버튼 — 신규출시: [▶ 재생] [♡ 찜] / 공개예정작: [N월 공개예정] [🔔]
  // - PC: 카드 안에서 마우스를 올리면 보임 (.member-sc-hover)
  const details = (
    <ShowcaseHover title={title} meta={meta} overview={overview}>
      {isNew ? (
        <>
          <Link to={`${path}?play=1`} className="member-sc-play" aria-label={`${title} 재생`}>
            <img src="/icons/play-w.svg" alt="" aria-hidden="true" />
            재생
          </Link>
          <button
            type="button"
            className={`member-sc-heart${wished ? " is-on" : ""}`}
            aria-pressed={wished}
            aria-label={wished ? `${title} 찜 해제` : `${title} 찜하기`}
            onClick={() => toggle({ title, poster_path: item.poster_path, backdrop_path: item.backdrop_path, overview: item.overview })}
          >
            <span className="member-sc-heart-icon" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <Link to={path} className="member-sc-release" aria-label={`${title} ${releaseLabel} · 상세 보기`}>
            {releaseLabel}
          </Link>
          <button
            type="button"
            className={`member-sc-alarm${alarmOn ? " is-on" : ""}`}
            aria-pressed={alarmOn}
            aria-label={alarmOn ? `${title} 알림 끄기` : `${title} 알림 받기`}
            onClick={() => onToggleAlarm(alarmKey)}
          >
            <BellIcon on={alarmOn} />
          </button>
        </>
      )}
    </ShowcaseHover>
  );

  return (
    <div className={`member-sc-slot member-sc-slot--${variant}`}>
      <div className="member-sc-card">
        <Link to={path} className="member-sc-link" aria-label={`${title} 상세 보기`}>
          {thumb && <img className="member-sc-thumb" src={thumb} alt="" loading="lazy" />}
          <img className="member-sc-logo" src="/icons/shorts/logo_w.svg" alt="" aria-hidden="true" />
        </Link>

        {/* [수정] 공개예정작: "N월 공개 🔔" — 누르면 공개 알림 켜기 / 끄기 */}
        {!isNew && (
          <button
            type="button"
            className={`member-sc-month${alarmOn ? " is-on" : ""}`}
            aria-pressed={alarmOn}
            aria-label={`${title} ${month} · ${alarmOn ? "알림 끄기" : "알림 받기"}`}
            onClick={() => onToggleAlarm(alarmKey)}
          >
            {month}
            <BellIcon on={alarmOn} />
          </button>
        )}

        {details}
      </div>
    </div>
  );
};

export default ShowcaseCard;
