import React from "react";
import { Link } from "react-router-dom";

// 화면 오른쪽 아래에 항상 떠 있는 버튼 묶음 (세로로 나란히)
// - 위: TV 디자인 보기 → 같은 탭에서 /tv 미리보기로 이동 (public/icons/tv/tv-more-btn.svg · 24 × 24 원본)
// - 아래: TOP → 페이지 맨 위로 부드럽게 이동 (원형 배경 Light/200 + public/icons/top-btn.svg 원본 17 × 9)
// - /tv 미리보기 화면에서는 App.jsx 에서 그리지 않음
const FloatingActions = () => {
  const handleTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="floating-actions">
      <Link to="/tv" className="floating-btn floating-btn--tv" aria-label="TV 디자인 보기" title="TV 디자인 보기">
        <img src="/icons/tv/tv-more-btn.svg" alt="" aria-hidden="true" />
      </Link>

      <button type="button" className="floating-btn floating-btn--top" aria-label="맨 위로" title="맨 위로" onClick={handleTop}>
        <img src="/icons/top-btn.svg" alt="" aria-hidden="true" />
      </button>
    </div>
  );
};

export default FloatingActions;
