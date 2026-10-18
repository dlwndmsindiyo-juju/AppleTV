import React from "react";

// 구독 유도 CTA 배너 (배경은 이미지 사용: public/images/subscribe-cta.webp)
const SubscribeCTA = () => {
  return (
    <section className="subscribe-cta">
      <div className="inner">
        <div className="subscribe-banner">
          <img
            className="subscribe-bg"
            src="/images/subscribe-cta.webp"
            alt=""
            aria-hidden="true"
          />

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
