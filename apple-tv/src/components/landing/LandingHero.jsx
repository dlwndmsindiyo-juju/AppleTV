import { Link } from 'react-router-dom';

const LandingHero = ({ data }) => (
  <section
    className="landing-hero"
    style={data.image ? { backgroundImage: `url(${data.image})` } : undefined}
  >
    <div className="l-container landing-hero__content">
      <p className="landing-hero__label">{data.label}</p>
      <h1 className="landing-hero__title">{data.title}</h1>
      <p className="landing-hero__desc">{data.desc}</p>
      <div className="landing-hero__actions">
        <Link to={data.cta.to} className="l-btn l-btn--primary">{data.cta.label}</Link>
        <a href={data.sub.to} className="l-btn l-btn--ghost">{data.sub.label}</a>
      </div>
      <p className="landing-hero__note">{data.note}</p>
    </div>
  </section>
);

export default LandingHero;
