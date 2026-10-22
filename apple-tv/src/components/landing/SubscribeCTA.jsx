import React from "react";
import { Link } from "react-router-dom";
import { useAuthStore, isSubscribed } from "../../store/useAuthStore";

/**
 * 구독 유도 CTA 배너 컴포넌트
 * @param {Object} props
 * @param {'tv' | 'sport'} [props.type='tv'] - 배너 유형 ('tv' 또는 'sport')
 */
const SubscribeCTA = ({ type = "tv" }) => {
  const { user, authReady } = useAuthStore();
  const isSport = type === "sport";

  // 이미 구독 중이면 배너 숨김 (훅 호출 이후에 return)
  if (authReady && isSubscribed(user)) return null;

  // 로그인 상태면 플랜 선택, 아니면 로그인 (가입 후 3단계에서 /subscribe 로 이어짐)
  const to = user ? "/subscribe" : "/login";

  // type에 따른 배경 이미지 경로 선택
  const bgImageSrc = isSport
    ? "/images/sport-subscribe-cta.webp"
    : "/images/subscribe-cta.webp";

  return (
    <section className="subscribe-cta">
      <div className="inner">
        <div className="subscribe-banner">
          {/* 배경 이미지 (prop에 따라 동적 변경) */}
          <img
            className="subscribe-bg"
            src={bgImageSrc}
            alt=""
            aria-hidden="true"
          />

          {/* 기존 좌측 정렬 콘텐츠 구조 유지 */}
          <div className="subscribe-content">
            <img
              className="subscribe-logo"
              src="/icons/header-icon.svg"
              alt="Apple TV"
            />
            <h3 className="subscribe-title">
              재구독하고 매주 새롭게
              <br />
              추가되는 콘텐츠를 만나보세요.
            </h3>
            {/* <Link> 는 <a> 로 렌더링되므로 기존 .subscribe-btn 스타일 그대로 적용 */}
            <Link className="subscribe-btn" to={to}>
              Apple TV 구독 갱신
            </Link>
            <p className="subscribe-note">
              취소할 때까지 ₩6,500/개월입니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubscribeCTA;