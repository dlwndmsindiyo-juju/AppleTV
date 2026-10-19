import React from "react";

/**
 * @param {Object} props
 * @param {'tv' | 'sport'} [props.type='tv'] - 배너 유형 ('tv' 또는 'sport')
 */
const SubscribeCTA = ({ type = "tv" }) => {
  const isSport = type === "sport";

  // type에 따른 이미지 경로 지정
  const bgImageSrc = isSport
    ? "/images/sport-subscribe-cta.webp"
    : "/images/subscribe-cta.webp";

  return (
    <section className={`subscribe-cta ${isSport ? "sport-cta" : ""}`}>
      <div className="inner">
        <div className="subscribe-banner">
          {/* 배경 이미지 */}
          <img
            className="subscribe-bg"
            src={bgImageSrc}
            alt=""
            aria-hidden="true"
          />

          {/* 좌측 영역: 로고 및 메인 헤드라인 */}
          <div className="subscribe-left">
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
          </div>

          {/* 우측 영역: 구독 카드 박스 */}
          <div className="subscribe-card">
            <h4 className="card-title">Apple TV+</h4>
            <p className="card-desc">7일 무료 체험 후 월 ₩6,500</p>
            <a
              className="subscribe-btn"
              href="https://tv.apple.com/kr"
              target="_blank"
              rel="noreferrer"
            >
              Apple TV 구독 갱신
            </a>
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