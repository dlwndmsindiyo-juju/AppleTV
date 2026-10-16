import { Link } from 'react-router-dom';

// 섹션 공통 헤더: 제목 3 + 설명글(body large) + 우측 보조 텍스트(body small 13)
const SectionHeader = ({ title, desc, aside, asideTo }) => (
  <div className="section-header">
    <div className="section-header__text">
      <h2 className="section-header__title">{title}</h2>
      {desc && <p className="section-header__desc">{desc}</p>}
    </div>
    {aside &&
      (asideTo ? (
        <Link to={asideTo} className="section-header__aside">
          {aside} ›
        </Link>
      ) : (
        <span className="section-header__aside">{aside}</span>
      ))}
  </div>
);

export default SectionHeader;
