// src/pages/HelpPage.jsx
// [추가] 푸터 메뉴 페이지 — 이용 가이드(/guide) · FAQ(/faq) · 지원(/support) 같은 틀 (시안: Web PDF 3장)
// 1) 위쪽 회색 영역: "Apple TV" · 큰 제목 · 설명 · 세 페이지 링크 (이용 가이드 › FAQ › 지원 ›)
// 2) 카드 3개 (01 · 02 · 03): 누르면 아래 목록의 해당 질문을 펼치고 그 자리로 부드럽게 이동
// 3) 펼침 목록: 질문을 누르면 답변이 열리고 닫힘 (∨ / ∧) · 첫 질문은 열린 채로 시작 · 여러 개 함께 열 수 있음
// - 데이터: data/helpData.js · 스타일: help.scss
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HELP_LINKS, HELP_PAGES } from "../data/helpData";

const HelpPage = ({ page = "faq" }) => {
  const data = HELP_PAGES[page] || HELP_PAGES.faq;
  const [openSet, setOpenSet] = useState(() => new Set([0]));
  const itemRefs = useRef([]);

  // 다른 도움말 페이지로 이동하면 첫 질문만 열고 맨 위로
  useEffect(() => {
    setOpenSet(new Set([0]));
    window.scrollTo(0, 0);
  }, [page]);

  const toggle = (i) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // 카드 → 해당 질문 펼치고 그 자리로 (헤더에 가리지 않게 scroll-margin · help.scss)
  const openFromCard = (i) => {
    setOpenSet((prev) => new Set(prev).add(i));
    requestAnimationFrame(() => {
      const el = itemRefs.current[i];
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.querySelector("button")?.focus({ preventScroll: true });
    });
  };

  return (
    <main className="help-page">
      {/* 1. 위쪽 회색 영역 */}
      <section className="help-hero">
        <p className="help-eyebrow">Apple TV</p>
        <h1 className="help-title">{data.title}</h1>
        <p className="help-desc">{data.desc}</p>
        <nav className="help-links" aria-label="도움말 메뉴">
          {HELP_LINKS.map((l) => (
            <Link key={l.key} to={l.path} className={`help-link${l.key === page ? " is-current" : ""}`} aria-current={l.key === page ? "page" : undefined}>
              {l.label}
              <span className="help-link-arrow" aria-hidden="true">›</span>
            </Link>
          ))}
        </nav>
      </section>

      <div className="help-body">
        {/* 2. 카드 3개 */}
        <section className="help-section" aria-labelledby="help-cards-title">
          <h2 className="help-section-title" id="help-cards-title">{data.cardsTitle}</h2>
          <p className="help-section-desc">{data.cardsDesc}</p>
          <ul className="help-cards">
            {data.cards.map((c, i) => (
              <li key={c.title}>
                <button type="button" className="help-card" onClick={() => openFromCard(c.open ?? 0)}>
                  <span className="help-card-num">{String(i + 1).padStart(2, "0")}</span>
                  <strong className="help-card-title">{c.title}</strong>
                  <span className="help-card-desc">{c.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. 펼침 목록 */}
        <section className="help-section help-section--list" aria-labelledby="help-list-title">
          <h2 className="help-section-title" id="help-list-title">{data.listTitle}</h2>
          <p className="help-section-desc">{data.listDesc}</p>
          <ul className="help-list">
            {data.list.map((item, i) => {
              const open = openSet.has(i);
              const id = `help-${page}-${i}`;
              return (
                <li key={item.q} className={`help-item${open ? " is-open" : ""}`} ref={(el) => (itemRefs.current[i] = el)}>
                  <h3 className="help-question">
                    <button type="button" id={`${id}-q`} aria-expanded={open} aria-controls={`${id}-a`} onClick={() => toggle(i)}>
                      <span>{item.q}</span>
                      <span className="help-chevron" aria-hidden="true" />
                    </button>
                  </h3>
                  <div className="help-answer" id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} hidden={!open}>
                    <p>{item.a}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
};

export default HelpPage;
