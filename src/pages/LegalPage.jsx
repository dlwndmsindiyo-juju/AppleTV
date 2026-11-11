// src/pages/LegalPage.jsx
// [수정] 푸터 서브 메뉴 페이지 — 개인정보 처리방침(/privacy) · 이용약관(/terms) · 환불안내(/refund) + 안내 페이지(/identity 등)
// - 시안(개인정보 처리방침 · 이용약관 · 환불안내 PC) 디자인 · 스타일: legal.scss · 데이터: data/legalData.js
//   1. "‹ 뒤로 가기" 띠 (푸터를 누르기 전 보던 페이지 · 스크롤 위치로)
//   2. 가운데 제목 · 설명 · 세 문서 링크 (세 정책 문서에서만)
//   3. 안내 한 줄 + 펼침 목록 (처음엔 모두 닫힘 · 여러 개 함께 열 수 있음)
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LEGAL_LINKS, LEGAL_PAGES } from "../data/legalData";
import "../legal.scss";

const DEFAULT_INTRO = "항목을 선택하면 자세한 내용을 확인할 수 있어요.";

// returnTo: Footer.jsx 가 주소 state 로 넘긴 { path, scrollY } — 없으면 브라우저 뒤로(바로 전 화면) · 그것도 없으면 홈
const useGoBack = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = location.state?.returnTo;
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
  return { goBack, returnTo };
};

// links: [{ key, label, path }] (없으면 링크 줄 없음) · current: 지금 문서 key
// items: [{ title, body }] · pageKey: 문서가 바뀌면 펼침 상태 · 스크롤 처음으로
// [추가] 글 묶음: 글 한 개 또는 [문단, { list: [항목 …] }, …] → 문단 · 점 목록
const Blocks = ({ value, className }) => {
  const blocks = Array.isArray(value) ? value : [value];
  return blocks.map((b, i) =>
    typeof b === "string" ? (
      <p key={i} className={className}>{b}</p>
    ) : (
      <ul key={i} className="legal-bullets">
        {b.list.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    ),
  );
};

// [수정] meta: 제목 아래 작은 글(업데이트 날짜 등) · intro: 링크 아래 설명 문단(배열 가능) · hint: 목록 바로 위 안내 한 줄
const DocView = ({ pageKey, title, meta, desc, links = null, current, intro, hint, items = [] }) => {
  const { goBack, returnTo } = useGoBack();
  const [openSet, setOpenSet] = useState(() => new Set()); // [수정] 처음에는 모두 닫힘

  useEffect(() => {
    setOpenSet(new Set()); // [수정] 문서를 바꿔도 모두 닫힘
    window.scrollTo(0, 0);
  }, [pageKey]);

  const toggle = (i) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <main className="legal-page">
      {/* 1. 뒤로 가기 띠 */}
      <div className="legal-backbar">
        <div className="legal-inner">
          <button type="button" className="legal-back" onClick={goBack}>
            <span className="legal-back-arrow" aria-hidden="true">‹</span>
            뒤로 가기
          </button>
        </div>
      </div>

      <div className="legal-inner">
        {/* 2. 제목 · 설명 · 문서 링크 */}
        {/* [수정] header 태그 대신 div — 사이트 헤더 규칙(App.scss header { position: fixed … })이 붙어 위로 겹치던 문제 */}
        <div className="legal-hero">
          <h1 className="legal-title">{title}</h1>
          {meta && <p className="legal-meta">{meta}</p>}
          {desc && <p className="legal-desc">{desc}</p>}
          {links && (
            <nav className="legal-links" aria-label="문서 메뉴">
              {links.map((l) => (
                <Link
                  key={l.key}
                  to={l.path}
                  state={returnTo ? { returnTo } : undefined} // 문서끼리 오가도 돌아갈 곳 유지
                  className={`legal-link${l.key === current ? " is-current" : ""}`}
                  aria-current={l.key === current ? "page" : undefined}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* 3. 안내 + 펼침 목록 */}
        {/* [수정] 설명 문단(본문) → 목록 위 안내(작은 글) 순서로 위계 구분 */}
        {intro && (
          <div className="legal-intro">
            <Blocks value={intro} className="legal-intro-text" />
          </div>
        )}
        {hint && <p className="legal-hint">{hint}</p>}
        <ul className="legal-list">
          {items.map((item, i) => {
            const open = openSet.has(i);
            const id = `legal-${pageKey}-${i}`;
            return (
              <li key={`${pageKey}-${item.title}`} className={`legal-item${open ? " is-open" : ""}`}>
                <h2 className="legal-question">
                  <button type="button" id={`${id}-q`} aria-expanded={open} aria-controls={`${id}-a`} onClick={() => toggle(i)}>
                    <span>{item.title}</span>
                    <span className="legal-chevron" aria-hidden="true" />
                  </button>
                </h2>
                <div className="legal-answer" id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} hidden={!open}>
                  <Blocks value={item.body} className="legal-answer-text" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
};


const LegalPage = ({ page = "privacy" }) => {
  const data = LEGAL_PAGES[page] || LEGAL_PAGES.privacy;
  const isPolicy = LEGAL_LINKS.some((l) => l.key === page);
  return (
    <DocView
      pageKey={page}
      title={data.title}
      desc={data.desc}
      links={isPolicy ? LEGAL_LINKS : null}
      current={page}
      meta={data.meta}
      intro={data.intro} // [수정] 설명 문단 (개인정보 · 이용 약관 · 판매 및 환불)
      hint={DEFAULT_INTRO} // 목록 위 안내 한 줄
      items={data.sections}
    />
  );
};

export default LegalPage;
