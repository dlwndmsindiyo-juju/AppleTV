import { Link } from 'react-router-dom';
import SectionHeader from '../common/SectionHeader';
import Poster from './Poster';

const Top10Section = ({ items }) => (
  <section id="top10" className="landing-section">
    <div className="l-container">
      <SectionHeader
        title="오늘의 인기 TOP 10"
        desc="지금 가장 많이 보는 작품"
        aside="매일 업데이트"
      />
      <ol className="top10-list">
        {items.slice(0, 10).map((item, i) => (
          <li key={item.id}>
            <Link to="/login" className="top10-card">
              <Poster src={item.poster} alt="" />
              <span className="top10-card__rank" aria-hidden="true">{i + 1}</span>
              <span className="sr-only">{i + 1}위 {item.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default Top10Section;
