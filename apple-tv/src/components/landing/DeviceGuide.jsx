import { Link } from 'react-router-dom';

const DeviceGuide = ({ data }) => (
  <section className="device-guide">
    <div className="l-container device-guide__inner">
      <div>
        <h2 className="device-guide__title">
          {data.title[0]}
          <br />
          {data.title[1]}
        </h2>
        <p className="device-guide__desc">{data.desc}</p>
      </div>
      <div>
        <ul className="device-guide__points">
          {data.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <div className="device-guide__links">
          {data.links.map((l) => (
            <Link key={l.label} to={l.to}>{l.label} ›</Link>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default DeviceGuide;
