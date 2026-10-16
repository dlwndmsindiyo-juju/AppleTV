const InfoStrip = ({ items }) => (
  <section className="info-strip">
    <ul className="l-container info-strip__list">
      {items.map((item) => (
        <li key={item.id}>
          <strong className="info-strip__title">{item.title}</strong>
          <span className="info-strip__desc">{item.desc}</span>
        </li>
      ))}
    </ul>
  </section>
);

export default InfoStrip;
