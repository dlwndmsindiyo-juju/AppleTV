import React from "react";
import { TvActionButtons } from "./TvActions";

// [추가] TV 상세 타이틀 (모든 영상 상세 공용 · 스포츠 · OTT 같이 사용 · 관심구단 화면은 따로) — 스타일: TV.scss (.tv-detail-hero)
// - 시안: 15 · 시즌 패스 · 소개
//   · 타이틀 Heading/h1-B · Light/0
//   · 서브타이틀 SF Pro Regular 38
//   · 설명 SF Pro Medium 29 / 36
//   · 버튼: 영상 끝 화면과 같은 버튼 (TvActionButtons · 142 × 80)
// - bg: 배경 이미지 (스포츠는 경기장 · OTT 는 작품 가로 이미지)
// - actions: TvActionButtons 와 같은 모양 · info: "정보" 버튼을 눌렀을 때 보이는 내용 (없으면 숨김)
// - focusOn: 값이 바뀌면 "시청하기" 에 포커스 (다른 상세로 바뀔 때)
// - [추가] 아래 줄에서 방향키 ↑ 로 히어로 버튼에 돌아오면 화면을 맨 위로 올려 히어로 전체가 보이게
//   (예전: 포커스만 버튼으로 오고 화면은 아래에 머물러 히어로가 안 보였음)
// - [수정] 카드의 scrollIntoView 가 TV 화면 바깥 칸(.tv-preview-area 등 · overflow hidden 이어도 밀림)까지
//   밀어 둔 경우가 있어서, TV 화면부터 미리보기 틀까지 모두 맨 위로 되돌림
//   (예전: TV 화면만 올려서 ↑ 를 눌러도 버튼 줄에서 멈추고 히어로 위쪽이 안 보였음)
export const scrollScreenTop = (e) => {
  const screen = e.currentTarget.closest(".tv-screen");
  if (!screen) return;
  for (let el = screen.parentElement; el && !el.classList.contains("tv-preview"); el = el.parentElement) {
    if (el.scrollTop) el.scrollTop = 0;
    if (el.scrollLeft) el.scrollLeft = 0;
  }
  if (screen.scrollTop > 0) screen.scrollTo({ top: 0, behavior: "smooth" });
};

export const TvDetailHero = ({ title, subtitle, desc, bg, actions, info, focusOn, notice }) => (
  <section className="tv-detail-hero" aria-label={title} onFocus={scrollScreenTop}>
    <div className="tv-detail-hero-bg" style={bg ? { backgroundImage: `url(${bg})` } : undefined} aria-hidden="true" />
    <div className="tv-detail-hero-overlay" aria-hidden="true" />

    <div className="tv-detail-hero-body">
      <h1 className="tv-detail-title">{title}</h1>
      {subtitle && <p className="tv-detail-subtitle">{subtitle}</p>}
      {desc && <p className="tv-detail-desc">{desc}</p>}

      <TvActionButtons actions={actions} focusOn={focusOn} className="tv-detail-actions" />

      {notice && <p className="tv-detail-notice" role="status">{notice}</p>}
    </div>

    {info && (
      <div className="tv-detail-info" role="note">
        {info}
      </div>
    )}
  </section>
);

export default TvDetailHero;
