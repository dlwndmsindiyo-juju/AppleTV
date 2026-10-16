import { Link } from 'react-router-dom';

const PromoBanner = ({ data }) => (
  <section className="promo-banner">
    <div className="l-container promo-banner__inner">
      <div>
        <h2 className="promo-banner__title">{data.title}</h2>
        <p className="promo-banner__desc">{data.desc1}</p>
        <p className="promo-banner__desc">{data.desc2}</p>
      </div>
      <div className="promo-card">
        <h3 className="promo-card__title">{data.card.title}</h3>
        <p className="promo-card__desc">{data.card.desc}</p>
        <Link to={data.card.cta.to} className="l-btn l-btn--accent l-btn--sm">
          {data.card.cta.label}
        </Link>
        <p className="promo-card__note">{data.card.note}</p>
      </div>
    </div>
  </section>
);

export default PromoBanner;
