import React from "react";
import { Link } from "react-router-dom";

// 스포츠 섹션 머리 (제목 · 오른쪽 "전체 보기 ›")
// - [정리] 예정된 경기 · 하이라이트 · 라이브 · 경기 다시보기 · 추천 시리즈 · 리그 순위 · 숏폼에 똑같이 있던 마크업을 하나로
// - to: 앱 안 이동 (Link) / href: 바깥 사이트 새 탭 (a) / 둘 다 없으면 링크 없이 제목만
// - titleId: 섹션의 aria-labelledby 와 연결할 제목 id
// [수정] 메인 홈 "전체 보기" 와 같은 화살표 아이콘 (public/icons/nav/more-right-icon.svg · MemberSectionHead 와 동일)
const MoreArrow = () => (
  <img className="ui-icon ui-icon-arrow" src="/icons/nav/more-right-icon.svg" alt="" aria-hidden="true" />
);

const SportSectionHead = ({ title, titleId, to, href }) => (
  <div className="sport-section-head">
    <h3 className="sport-section-title" id={titleId}>
      {title}
    </h3>
    {to && (
      <Link className="sport-more" to={to}>
        전체 보기 <MoreArrow />
      </Link>
    )}
    {!to && href && (
      <a className="sport-more" href={href} target="_blank" rel="noreferrer">
        전체 보기 <MoreArrow />
      </a>
    )}
  </div>
);

export default SportSectionHead;
