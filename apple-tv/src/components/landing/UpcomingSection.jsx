import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import Poster from './Poster';

const UpcomingSection = ({ items }) => (
  <section className="landing-section">
    <div className="l-container">
      <SectionHeader
        title="공개 예정작"
        desc="곧 만나볼 새로운 이야기"
        aside="매주 업데이트"
      />
      <ul className="upcoming-grid">
        {items.map((item) => (
          <li key={item.id} className="upcoming-card">
            <div className="upcoming-card__thumb">
              <Poster src={item.poster} alt="" ratio="landscape" />
            </div>
            <div className="upcoming-card__body">
              <span className="upcoming-card__caption">{item.caption}</span>
              <h3 className="upcoming-card__title">{item.title}</h3>
              <p className="upcoming-card__desc">{item.desc}</p>
              <Link to="/login" className="l-btn l-btn--ghost l-btn--sm">
                로그인하고 보기
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default UpcomingSection;
