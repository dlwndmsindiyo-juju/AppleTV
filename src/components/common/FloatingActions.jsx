import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// 화면 오른쪽 아래에 항상 떠 있는 버튼 묶음 (세로로 나란히)
// - 위: TV 디자인 보기 → 같은 탭에서 /tv 미리보기로 이동 (public/icons/tv/tv-more-btn.svg · 24 × 24 원본)
// - 아래: TOP → 페이지 맨 위로 부드럽게 이동 (원형 배경 Light/200 + public/icons/top-btn.svg 원본 17 × 9)
// - /tv 미리보기 화면에서는 App.jsx 에서 그리지 않음
// - [추가] 푸터를 가리지 않게: 스크롤해서 푸터가 화면에 올라오면 버튼 묶음도 푸터 위(16 띄움)까지만 내려옴
const FOOTER_GAP = 16;

const FloatingActions = () => {
  const boxRef = useRef(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    let shift = 0;
    let raf = 0;
    const update = () => {
      raf = 0;
      const footer = document.querySelector("footer.footer");
      let next = 0;
      if (footer) {
        const footerTop = footer.getBoundingClientRect().top;
        const baseBottom = box.getBoundingClientRect().bottom + shift; // 올리기 전 원래 위치
        next = Math.max(0, Math.ceil(baseBottom - (footerTop - FOOTER_GAP)));
      }
      if (next !== shift) {
        shift = next;
        box.style.transform = shift ? `translateY(-${shift}px)` : "";
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // 페이지가 바뀌거나 내용이 늦게 그려져 푸터 위치가 달라질 때도 다시 계산
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
    };
  }, []);

  const handleTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="floating-actions" ref={boxRef}>
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
