import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWish } from "../../store/useHeartStore"; // 위시리스트 (찜)
import { img, detailPath } from "./memberUtils";
import { useContentInfo, contentMeta, shortGenres } from "./useContentInfo";

// [추가] 로그인 후 메인 PC 가로형 카드 — 시안 (Apple TV 구독 hi-fi 데스크탑)
// - 지금, 새로운 작품을 만나보세요 (variant="new") · 곧 찾아올 새로운 이야기 (variant="soon") 공용
// - 카드 기본 346 × 214 · 모서리 10 · 오른쪽 위 tv 로고 · 스타일: member.scss (.member-sc-*)
// - variant="new": 마우스를 올리면 450 × 280 카드로 커지며 제목 · 장르 · 줄거리 · [▶ 재생] [♡ 찜]
//   · 제목 Heading/h2-B · Light/100 / 장르 Body/small · Light/500 / 줄거리 Body/default · Light/500
//   · 재생: 추천작 [▶ 재생] 과 같은 버튼 / 찜: 하트 20 × 20 · 원 배경 40 × 40
// - variant="soon": 왼쪽 아래 "N월 공개" 상자 (70 × 30 · 패딩 10 6 · Body/small · Light/0)
// - 카드(이미지)를 누르면 상세 페이지
// - 태블릿 · 휴대폰은 기존 카드(ReleaseCard) 그대로 → useIsDesktop 으로 나눔

const DESKTOP_QUERY = "(min-width: 1025px)";

// PC(1025px 이상) 화면인지 (화면 폭이 바뀌면 다시 계산)
export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
};

// "2026-11-14" → "11월 공개" (시안: 01월 공개)
const monthLabel = (date) => {
  const month = Number((date || "").split("-")[1]);
  return month ? `${String(month).padStart(2, "0")}월 공개` : "공개 예정";
};

const ShowcaseCard = ({ item, type, variant = "new" }) => {
  const info = useContentInfo(type, item.id);
  const { wished, toggle } = useWish(type, item.id);

  const title = item.title || item.name;
  const path = detailPath(type, item.id);
  const thumb = img(item.backdrop_path, "w780") || img(item.poster_path, "w500");
  const isNew = variant === "new";

  return (
    <div className={`member-sc-slot member-sc-slot--${variant}`}>
      <div className="member-sc-card">
        <Link to={path} className="member-sc-link" aria-label={`${title} 상세 보기`}>
          {thumb && <img className="member-sc-thumb" src={thumb} alt="" loading="lazy" />}
          <img className="member-sc-logo" src="/icons/shorts/logo_w.svg" alt="" aria-hidden="true" />
          {!isNew && <span className="member-sc-month">{monthLabel(item.release_date || item.first_air_date)}</span>}
        </Link>

        {/* 마우스를 올리면 보이는 내용 (신규출시) — 키보드로 버튼에 포커스가 와도 보임 */}
        {isNew && (
          <div className="member-sc-hover">
            <strong className="member-sc-title">{title}</strong>
            <span className="member-sc-genre">{contentMeta(type, info, shortGenres(type, item.genre_ids))}</span>
            <p className="member-sc-overview">{item.overview || info?.tagline || "작품 소개가 곧 공개됩니다."}</p>

            <div className="member-sc-actions">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowcaseCard;
