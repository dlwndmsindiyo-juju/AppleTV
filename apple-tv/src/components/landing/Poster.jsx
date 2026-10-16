// 이미지가 있으면 <img>, 없으면 플레이스홀더
const Poster = ({ src, alt = '', ratio = 'portrait' }) => (
  <div className={`poster poster--${ratio}`}>
    {src ? <img src={src} alt={alt} loading="lazy" /> : <div className="poster__empty" aria-hidden="true" />}
  </div>
);

export default Poster;
