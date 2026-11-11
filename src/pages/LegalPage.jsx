// src/pages/LegalPage.jsx
// [추가] 푸터 정책 링크 페이지 — 개인정보 처리방침(/privacy) · 이용약관(/terms) · 환불안내(/refund)
// - FAQ(HelpPage) 와 같은 틀: 위쪽 회색 영역 ("Apple TV" · 큰 제목 · 설명 · 세 문서 링크) + 흰 본문
// - 본문: "Apple 공식 문서 요약" 상자 → 번호 붙은 조항 6개 → 아래 안내 문구
// - PC · 태블릿 · 휴대폰 모두 같은 배치 (크기 · 간격만 줄어듦) · 스타일: legal.scss · 데이터: data/legalData.js
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { LEGAL_FOOTNOTE, LEGAL_LINKS, LEGAL_PAGES } from "../data/legalData";
import "../legal.scss";

const LegalPage = ({ page = "privacy" }) => {
  const data = LEGAL_PAGES[page] || LEGAL_PAGES.privacy;

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
