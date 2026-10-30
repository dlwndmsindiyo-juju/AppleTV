import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import catalog from '../components/ai/appleTvCatalog.json';
import { resolveContentDetail } from '../components/ai/resolveContentDetail';
import { useMovieStore } from '../store/useMovieStore';
import './AiContentDetail.scss';

// 등록된 작품은 기존 MovieDetail로 연결합니다. 미등록/조회 실패도 빈 화면 대신 해당 작품 정보를 표시합니다.
export default function AiContentDetail() {
  const { appleId } = useParams();
  const navigate = useNavigate();
  const item = catalog.find(row => row.id === appleId);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    window.scrollTo(0, 0);
    if (!item) { setLoading(false); return () => controller.abort(); }
    resolveContentDetail(item, { signal: controller.signal })
      .then(match => {
        if (!active || controller.signal.aborted || !match) return;
        useMovieStore.setState(state => ({ contentDetails: {
          ...state.contentDetails, [`${match.type}_${match.id}`]: match.detail,
        } }));
        navigate(`/${match.type}/${match.id}`, { replace: true });
      })
      .catch(() => { /* 확인할 수 없으면 현재 작품의 공식 정보로 상세를 제공합니다. */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [item, navigate, retry]);

  if (!item) return <section className="ai-content-detail"><h1>작품을 찾을 수 없어요.</h1><Link to="/">홈으로 돌아가기</Link></section>;
  return <section className="ai-content-detail" aria-busy={loading}>
    <div className="ai-content-detail__inner">
      <Link to="/" className="ai-content-detail__back">홈으로</Link>
      <img className="ai-content-detail__art" src={item.poster} alt={item.title} />
      <h1>{item.title}</h1>
      <p className="ai-content-detail__original">{item.originalTitle}</p>
      <p>{[item.type === 'series' ? '시리즈' : '영화', item.releaseYear, item.officialGenres.join(' · '), item.runtimeMinutes && `${item.runtimeMinutes}분`].filter(Boolean).join(' · ')}</p>
      <p className="ai-content-detail__overview">{item.synopsisExcerpt}</p>
      <p role="status">{loading ? '작품 상세 정보를 불러오고 있어요…' : '추가 상세 정보를 불러오지 못했어요. 아래에서 공식 작품 정보를 확인할 수 있어요.'}</p>
      <div className="ai-content-detail__actions">
        {!loading && <button type="button" onClick={() => setRetry(n => n + 1)}>상세 정보 다시 불러오기</button>}
        <a href={item.appleUrl} target="_blank" rel="noopener noreferrer">Apple TV에서 작품 보기</a>
      </div>
      {item.sampleEpisodes.length > 0 && <><h2>에피소드</h2><ul>{item.sampleEpisodes.map(episode => <li key={episode.id}><span>{episode.title}</span><span>{episode.minutes}분</span></li>)}</ul></>}
    </div>
  </section>;
}
