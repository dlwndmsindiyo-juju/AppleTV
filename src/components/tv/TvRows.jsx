import React, { useState } from "react";
import { TV_NAV } from "../../data/tvSportData";
import { useAuthStore } from "../../store/useAuthStore";

// TV 화면 공통 (홈 · 스포츠) — 스타일: TV.scss (.tv-sport · 이름은 스포츠 시안에서 시작해 그대로 사용)
// - TvHeader     : 로고 + 홈 · 스포츠 · 보관함 · 검색 (선택한 메뉴 강조 · 홈 ↔ 스포츠 이동)
// - TvBrowseScreen: 헤더 + 섹션 줄 (웹과 같은 데이터를 TV 카드로)
//   · [수정] TV 가이드: 줄 크기는 그대로(480 × 270) · 고른 카드만 4% 커지고 흰 테두리 (줄 전체가 커지던 방식은 뺌)
//   · 카드에 포커스가 오면 화면 안에 보이도록 위아래 · 옆으로 이동
// - 방향키 이동은 미리보기(TvPreview.jsx)의 리모컨 처리 그대로 사용

// 이미지가 없거나 못 불러오면 숨기고 어두운 빈 칸만 보이게
const hideBroken = (e) => {
  e.currentTarget.style.visibility = "hidden";
};

// [추가] 구단 뱃지: 못 불러오면 대체 이미지(fallback)로 한 번 바꿔 보고, 그래도 안 되면 숨김
const swapOrHide = (fallback) => (e) => {
  const el = e.currentTarget;
  if (fallback && el.dataset.fallback !== "1") {
    el.dataset.fallback = "1";
    el.src = fallback;
    return;
  }
  hideBroken(e);
};

// 화면이 있는 메뉴 (나머지는 시안이 나오면 연결)
const MENU_SCREEN = { 홈: "home", 스포츠: "sport", 보관함: "library", 검색: "search" }; // [추가] 검색 · 보관함

export const TvHeader = ({ active, onMenu }) => (
  <header className="tv-header">
    <img className="tv-header-logo" src="/icons/shorts/logo_w.svg" alt="Apple TV" />

    <nav className="tv-header-nav" aria-label="TV 메뉴">
      {TV_NAV.map((label) => (
        <button
          type="button"
          key={label}
          className={`tv-header-tab${label === active ? " is-active" : ""}`}
          aria-current={label === active ? "page" : undefined}
          onClick={() => MENU_SCREEN[label] && onMenu?.(MENU_SCREEN[label])}
        >
          {label}
        </button>
      ))}
    </nav>
  </header>
);

// rows: [{ id, title, items: [{ id, title, image, logo?, logoFallback? }] }]
// onItem: [추가] 카드를 눌렀을 때 (rowId, item)
export const TvBrowseScreen = ({ menu, onMenu, rows, bg, onItem, empty = "콘텐츠를 불러오는 중입니다…" }) => {
  const [activeRow, setActiveRow] = useState(null);
  // [수정] 카드를 누르면 상세 페이지 (로그인 전 안내 팝업은 상세의 "시청하기" 에서)
  const current = activeRow || rows[0]?.id;

  const handleFocus = (rowId) => (e) => {
    setActiveRow(rowId);
    e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <main className="tv-screen tv-sport" style={bg ? { "--tv-sport-bg": `url(${bg})` } : undefined}>
      <TvHeader active={menu} onMenu={onMenu} />

      <div className="tv-sport-body">
        {rows.map((row, rowIndex) => (
          <section key={row.id} className={`tv-sport-row tv-sport-row--${row.id}${row.id === current ? " is-active" : ""}`}>
            <h2 className="tv-sport-title">{row.title}</h2>

            <div className="tv-sport-track">
              {row.items.map((item, i) => (
                <button
                  type="button"
                  key={item.id}
                  className="tv-sport-card"
                  data-tv-key={`${row.id}:${item.id}`} // [추가] 상세에서 돌아올 때 이 카드로 (섹션 + 작품 ID)
                  data-tv-autofocus={rowIndex === 0 && i === 0 ? true : undefined}
                  onFocus={handleFocus(row.id)}
                  onClick={() => onItem?.(row.id, item)}
                >
                  <span className="tv-sport-thumb">
                    {item.image && <img src={item.image} alt="" loading="lazy" onError={hideBroken} />}
                    {item.logo && <img className="tv-sport-logo" src={item.logo} alt="" onError={swapOrHide(item.logoFallback)} />}
                  </span>
                  <span className="tv-sport-card-title">{item.title}</span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {rows.length === 0 && <p className="tv-sport-empty">{empty}</p>}
      </div>
    </main>
  );
};
