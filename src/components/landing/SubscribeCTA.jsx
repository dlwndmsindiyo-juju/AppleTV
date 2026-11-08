import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore, isSubscribed } from "../../store/useAuthStore";


// [추가] TV 홍보 배너 오른쪽 포스터 (시안 순서 · public/images/promo)
const TV_POSTERS = [
  { src: "/images/promo/poster-wanda.png", title: "반다를 찾아서" },
  { src: "/images/promo/poster-slow-horses.png", title: "슬로 호시스" },
  { src: "/images/promo/poster-accountant.png", title: "어카운턴트" },
  { src: "/images/promo/poster-matchbox.png", title: "매치박스 더 무비" },
];

/**
 * 구독 유도 CTA 배너 컴포넌트
 * @param {Object} props
 * @param {'tv' | 'sport'} [props.type='tv'] - 배너 유형 ('tv' 또는 'sport')
 */
const SubscribeCTA = ({ type = "tv" }) => {
  const { user, authReady } = useAuthStore();
  const location = useLocation(); // [추가] 구독 팝업 뒤에 지금 화면(스포츠 등)을 그대로 두기 위해 from 으로 넘김
  const isSport = type === "sport";

  // 이미 구독 중이면 배너 숨김 (훅 호출 이후에 return)
  if (authReady && isSubscribed(user)) return null;

  // 로그인 상태면 플랜 선택, 아니면 로그인 (가입 후 3단계에서 /subscribe 로 이어짐)
  const to = user ? "/subscribe" : "/login";

  // 배경 사진: TV 홈은 기존 배너 사진 · [수정] 스포츠 홈은 선수 사진 (public/images/sport/sport-promo-banner.jpg)
  const bgImageSrc = isSport ? "/images/sport/sport-promo-banner.svg" : "/images/subscribe-cta.webp";

  // [추가] TV 홈(로그인 전) 홍보 배너 — 시안
  // - 배경: 기존 배너 사진 + 검정 80% 그림자 / 왼쪽: 로고 · 문구 · 무료 체험 버튼 · 안내 / 오른쪽: 포스터 4장 (마지막 장은 배너 끝에서 잘림)
  // - 포스터는 이미지만 (클릭 이동 없음)
  // [수정] 스포츠 홈 홍보 배너: 글자 · 버튼은 TV 와 똑같고 배경만 선수 사진 (포스터 · 검정 그림자 없음)
  //   · 예전 스포츠 배너("재구독하고…")는 어디서도 쓰지 않아 이 모양으로 바꿈
  return (
    <section className={`subscribe-cta subscribe-cta--tv${isSport ? " subscribe-cta--sport" : ""}`}>
      <div className="inner">
        <div className="subscribe-banner">
          <picture className="subscribe-bg-picture">
            {isSport && (
              <source
                media="(max-width: 767px)"
                srcSet="/images/sport/sport-promo-mobile.svg"
              />
            )}

            <img
              className="subscribe-bg"
              src={bgImageSrc}
              alt=""
              aria-hidden="true"
            />
          </picture>

          <div className="subscribe-content">
            <img className="subscribe-logo" src="/icons/shorts/logo_w.svg" alt="Apple TV" />
            <h3 className="subscribe-title">
              {isSport ? (
                <>
                  이번주 놓칠 수 없는 경기,
                  <br />
                  지금 Apple TV로 경험해보세요.
                </>
              ) : (
                <>
                  <p className="subscribe-title-desktop">
                    <span>독점 오리지널 콘텐츠를 한 곳에서,</span>
                    <span>지금 Apple TV로 경험해보세요.</span>
                  </p>
                  <p className="subscribe-title-mobile">
                    Apple TV 오리지널 콘텐츠,
                    지금 만나보세요.
                  </p>
                </>
              )}
            </h3>
            <Link className="subscribe-btn" to={to} state={{ from: location.pathname }}>
              7일 무료 체험하기
            </Link>
            <p className="subscribe-note">7일 무료 체험 후 월 ₩6,500입니다.</p>
          </div>

          {!isSport && (
            <ul className="subscribe-posters" aria-hidden="true">
              {TV_POSTERS.map((poster) => (
                <li key={poster.src} className="subscribe-poster">
                  <img src={poster.src} alt="" loading="lazy" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default SubscribeCTA;