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
export const TvDetailHero = ({ title, subtitle, desc, bg, actions, info, focusOn, notice }) => (
  <section className="tv-detail-hero" aria-label={title}>
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
