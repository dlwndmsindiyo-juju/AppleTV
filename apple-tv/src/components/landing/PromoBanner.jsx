import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

// 구독 전 사용자에게 계속 떠 있는 하단 프로모션 배너
// - 첫 스크롤이 발생하면 아래에서 올라오며 나타남
// - 로그인(구독)하면 사라짐
const PromoBanner = () => {
  const user = useAuthStore((state) => state.user);
  const [scrolled, setScrolled] = useState(false);

  // 첫 스크롤 감지 (한 번 나타나면 계속 유지)
  useEffect(() => {
    if (user) return;

    const onScroll = () => {
      if (window.scrollY > 0) {
        setScrolled(true);
        window.removeEventListener("scroll", onScroll);
      }
    };

    onScroll(); // 새로고침으로 이미 스크롤된 상태일 때 대비
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [user]);

  // 배너가 푸터 문구를 가리지 않도록 body 에 표시
  useEffect(() => {
    const visible = !user && scrolled;
    document.body.classList.toggle("has-promo-banner", visible);
    return () => document.body.classList.remove("has-promo-banner");
  }, [user, scrolled]);

  // 로그인(구독) 후에는 배너 없음
  if (user) return null;

  // .page-fade 의 transform 때문에 fixed 가 화면 기준이 되지 않으므로
  // document.body 에 직접 그려서 항상 화면 하단에 고정
  return createPortal(
    <aside
      className={`promo-banner${scrolled ? " show" : ""}`}
      aria-hidden={!scrolled}
    >
      <div className="inner promo-banner-inner">
        <div className="promo-banner-text">
          <strong className="promo-banner-title">
            Apple TV를 1주일 무료로 즐기세요.
          </strong>
          <p className="promo-banner-desc">
            수백 편의 단독 공개 시리즈와 영화를 즐겨보세요. 매주 새로운 작품이
            찾아옵니다.
          </p>
        </div>

        <div className="promo-banner-action">
          <Link to="/login" className="promo-banner-btn" tabIndex={scrolled ? 0 : -1}>
            무료 체험 수락
          </Link>
          <p className="promo-banner-note">
            7일 무료 체험 후 월 ₩6,500입니다.
            <br />
            약관이 적용됩니다.
          </p>
        </div>
      </div>
    </aside>,
    document.body
  );
};

export default PromoBanner;
