// src/pages/HelpPage.jsx
// [수정] 푸터 주 메뉴 페이지 — 이용 가이드(/guide) · FAQ(/faq) · 지원(/support)
// - 시안(개인정보 처리방침 등 PC) 디자인 · 푸터 서브 메뉴(LegalPage)와 같은 모양 · 스타일: help.scss
//   1. "‹ 뒤로 가기" 띠 (푸터를 누르기 전 보던 페이지 · 스크롤 위치로)
//   2. 가운데 제목 · 설명 · 세 페이지 링크
//   3. 안내 한 줄 + 펼침 목록 (질문 · 답변 · 처음엔 모두 닫힘 · 여러 개 함께 열 수 있음)
// - 예전 카드 3개(01 · 02 · 03)는 시안에 없어서 뺌 (data/helpData.js 의 cards 는 그대로 둠)
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HELP_LINKS, HELP_PAGES } from "../data/helpData";

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
      <ul key={i} className="help-bullets">
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
    <main className="help-page">
      {/* 1. 뒤로 가기 띠 */}
      <div className="help-backbar">
        <div className="help-inner">
          <button type="button" className="help-back" onClick={goBack}>
            <span className="help-back-arrow" aria-hidden="true">‹</span>
            뒤로 가기
          </button>
        </div>
      </div>

      <div className="help-inner">
        {/* 2. 제목 · 설명 · 문서 링크 */}
        {/* [수정] header 태그 대신 div — 사이트 헤더 규칙(App.scss header { position: fixed … })이 붙어 위로 겹치던 문제 */}
        <div className="help-hero">
          <h1 className="help-title">{title}</h1>
          {meta && <p className="help-meta">{meta}</p>}
          {desc && <p className="help-desc">{desc}</p>}
          {links && (
            <nav className="help-links" aria-label="문서 메뉴">
              {links.map((l) => (
                <Link
                  key={l.key}
                  to={l.path}
                  state={returnTo ? { returnTo } : undefined} // 문서끼리 오가도 돌아갈 곳 유지
                  className={`help-link${l.key === current ? " is-current" : ""}`}
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
          <div className="help-intro">
            <Blocks value={intro} className="help-intro-text" />
          </div>
        )}
        {hint && <p className="help-hint">{hint}</p>}
        <ul className="help-list">
          {items.map((item, i) => {
            const open = openSet.has(i);
            const id = `help-${pageKey}-${i}`;
            return (
              <li key={`${pageKey}-${item.title}`} className={`help-item${open ? " is-open" : ""}`}>
                <h2 className="help-question">
                  <button type="button" id={`${id}-q`} aria-expanded={open} aria-controls={`${id}-a`} onClick={() => toggle(i)}>
                    <span>{item.title}</span>
                    <span className="help-chevron" aria-hidden="true" />
                  </button>
                </h2>
                <div className="help-answer" id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} hidden={!open}>
                  <Blocks value={item.body} className="help-answer-text" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
};


const HelpPage = ({ page = "faq" }) => {
  const data = HELP_PAGES[page] || HELP_PAGES.faq;
  return (
    <DocView
      pageKey={page}
      title={data.title}
      desc={data.desc}
      links={HELP_LINKS}
      current={page}
      hint={data.listDesc}
      items={data.list.map((item) => ({ title: item.q, body: item.a }))} // a: 글 한 개 또는 문단 배열
    />
  );
};

export default HelpPage;
