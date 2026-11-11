// src/pages/LegalPage.jsx
// [추가] 푸터 정책 링크 페이지 — 개인정보 처리방침(/privacy) · 이용약관(/terms) · 환불안내(/refund)
// - FAQ(HelpPage) 와 같은 틀: 위쪽 회색 영역 ("Apple TV" · 큰 제목 · 설명 · 세 문서 링크) + 흰 본문
// - 본문: "Apple 공식 문서 요약" 상자 → 번호 붙은 조항 6개 → 아래 안내 문구
// - PC · 태블릿 · 휴대폰 모두 같은 배치 (크기 · 간격만 줄어듦) · 스타일: legal.scss · 데이터: data/legalData.js
import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // [수정] 돌아가기
import { LEGAL_FOOTNOTE, LEGAL_LINKS, LEGAL_PAGES } from "../data/legalData";
import "../legal.scss";

const LegalPage = ({ page = "privacy" }) => {
  const data = LEGAL_PAGES[page] || LEGAL_PAGES.privacy;
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo; // [추가] 푸터에서 넘긴 { path, scrollY }

  // [추가] 돌아가기 (FAQ 와 같은 방식)
  // - 푸터에서 왔으면: 보던 페이지로 이동 → 내용이 그려지면 보던 스크롤 위치로 (정책 문서끼리 오가도 처음 페이지)
  // - 로그인 · 구독 · 계정 설정 안 링크에서 왔으면: 브라우저 뒤로 가기 (바로 전 화면)
  // - 주소로 바로 들어왔으면: 홈
  const goBack = () => {
    if (!returnTo) {
      if (location.key !== "default") navigate(-1);
      else navigate("/");
      return;
    }
    const y = returnTo.scrollY || 0;
    navigate(returnTo.path || "/");
    if (!y) return;
    let tries = 0;
    const restore = () => {
      const enough = document.documentElement.scrollHeight >= y + window.innerHeight;
      if (enough || tries >= 20) {
        window.scrollTo(0, y);
        return;
      }
      tries += 1;
      setTimeout(restore, 100);
    };
    setTimeout(restore, 100);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <main className="legal-page">
      {/* 위쪽 회색 영역 */}
      <section className="legal-hero">
        <p className="legal-eyebrow">Apple TV</p>
        <h1 className="legal-title">{data.title}</h1>
        <p className="legal-desc">{data.desc}</p>
        {/* [수정] 세 정책 문서(개인정보 · 이용약관 · 환불)에서만 문서 링크 줄 */}
        {LEGAL_LINKS.some((l) => l.key === page) && (
        <nav className="legal-links" aria-label="정책 문서">
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.key}
              to={l.path}
              state={returnTo ? { returnTo } : undefined} // [추가] 문서끼리 오가도 돌아갈 곳 유지
              className={`legal-link${l.key === page ? " is-current" : ""}`}
              aria-current={l.key === page ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        )}
      </section>

      {/* 본문 */}
      <div className="legal-body">
        {/* [추가] 돌아가기 — FAQ(.help-back)와 같은 모양 · 본문 맨 위 왼쪽 */}
        <button type="button" className="help-back legal-back" onClick={goBack}>
          <span className="help-back-icon" aria-hidden="true" />
          돌아가기
        </button>

        <div className="legal-summary">
          <strong className="legal-summary-title">Apple 공식 문서 요약</strong>
          <p className="legal-summary-desc">{data.summary}</p>
        </div>

        <ol className="legal-sections">
          {data.sections.map((s, i) => (
            <li key={s.title} className="legal-section">
              <h2 className="legal-section-title">
                {i + 1}. {s.title}
              </h2>
              <p className="legal-section-body">{s.body}</p>
            </li>
          ))}
        </ol>

        <p className="legal-footnote">{LEGAL_FOOTNOTE}</p>
      </div>
    </main>
  );
};

export default LegalPage;
