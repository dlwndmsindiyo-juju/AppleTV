import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import Poster from './Poster';

const OriginalsSection = ({ items }) => (
  <section className="landing-section">
    <div className="l-container">
      <SectionHeader
        title="Apple TV 오리지널스"
        desc="Apple TV에서만 볼 수 있는 작품"
        aside="로그인하고 전체 보기"
        asideTo="/login"
      />
      <ul className="originals-grid">
        {items.map((item) => (
          <li key={item.id}>
            <Link to="/login" className="original-card">
              <Poster src={item.poster} alt="" />
              <h3 className="original-card__title">{item.title}</h3>
              <p className="original-card__line">{item.line1}</p>
              <p className="original-card__line">{item.line2}</p>
              <p className="original-card__meta">{item.meta}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default OriginalsSection;
