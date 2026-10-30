import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchStore } from '../../store/useSearchStore';
import './CastFilmography.scss';

const IMG = 'https://image.tmdb.org/t/p';

function Portrait({ person }) {
  return <span className="cast-photo">{person.profile_path
    ? <img src={`${IMG}/w185${person.profile_path}`} alt="" loading="lazy" />
    : <span aria-hidden="true">{person.name?.[0] || '?'}</span>}</span>;
}

// 인물 ID로 출연 정보를 조회합니다. 배역 이름이 같아도 다른 배우의 작품을 섞지 않습니다.
export default function CastFilmography({ cast }) {
  const [selected, setSelected] = useState(null);
  const entry = useSearchStore(state => selected ? state.people[selected.id] : null);
  const onLoadPerson = useSearchStore(state => state.onLoadPerson);
  const backRef = useRef(null);
  const buttons = useRef(new Map());

  useEffect(() => {
    if (!selected) return;
    onLoadPerson(selected.id);
    backRef.current?.focus({ preventScroll: true });
  }, [selected, onLoadPerson]);

  const works = useMemo(() => {
    const unique = new Map();
    for (const item of entry?.credits?.cast || []) {
      if (!['movie', 'tv'].includes(item.media_type) || item.adult || !item.id) continue;
      const key = `${item.media_type}_${item.id}`;
      if (!unique.has(key)) unique.set(key, item);
    }
    return [...unique.values()].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }, [entry]);

  const goBack = () => {
    const id = selected.id;
    setSelected(null);
    requestAnimationFrame(() => buttons.current.get(id)?.focus({ preventScroll: true }));
  };

  const profiles = cast.length ? (
    <ul className="cast-grid">
      {cast.map(person => <li key={person.credit_id || person.id} className="cast-item">
        <button type="button" className="cast-select" ref={node => { if (node) buttons.current.set(person.id, node); else buttons.current.delete(person.id); }} onClick={() => setSelected(person)} aria-label={`${person.name} 출연 작품 보기`}>
          <Portrait person={person} />
          <span className="cast-name">{person.character || person.name}</span>
          <span className="cast-role">{person.name}</span>
        </button>
      </li>)}
    </ul>
  ) : <p className="empty-content">등장인물 정보가 없습니다.</p>;

  if (!selected) return <div className="cast-browser"><section className="cast-profile-list" aria-label="작품 등장인물 목록" tabIndex={0}>{profiles}</section></div>;

  return <div className="cast-browser has-selection">
    <section className="cast-filmography" aria-label={`${selected.name} 출연 작품`}>
    <header className="cast-filmography-person">
      <Portrait person={{ ...selected, ...entry?.info, profile_path: entry?.info?.profile_path || selected.profile_path }} />
      <h3>{selected.character || selected.name}</h3>
      <p>{entry?.info?.name || selected.name}</p>
    </header>
    <div className="cast-actions"><button ref={backRef} type="button" className="cast-back" onClick={goBack}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m14 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg><span>등장인물 목록</span></button></div>
    <div className="cast-content-scroll" tabIndex={0} role="region" aria-label={`${selected.name} 출연작 목록 · 스크롤`}>
    {(!entry || entry.status === 'loading') && <p role="status">출연 작품을 불러오는 중입니다.</p>}
    {entry?.status === 'error' && <div role="alert"><p>출연 작품을 불러오지 못했습니다.</p><button type="button" className="cast-back" onClick={() => onLoadPerson(selected.id)}>다시 시도</button></div>}
    {entry?.status === 'done' && (works.length ? <ul className="cast-work-grid">
      {works.map(item => {
        const title = item.title || item.name || '제목 미정';
        const year = (item.release_date || item.first_air_date || '').slice(0, 4);
        return <li key={`${item.media_type}_${item.id}`}><Link to={`/${item.media_type}/${item.id}`} className="cast-work-card">
          <span className="cast-work-poster">{item.poster_path
            ? <img src={`${IMG}/w342${item.poster_path}`} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />
            : <span>이미지 준비 중</span>}</span>
          <span className="cast-work-title" title={title}>{title}</span>
          <span className="cast-work-meta">{item.media_type === 'movie' ? '영화' : '시리즈'}{year ? ` · ${year}` : ''}</span>
        </Link></li>;
      })}
    </ul> : <p role="status">등록된 출연 작품이 없습니다.</p>)}
    </div>
  </section>
  </div>;
}
