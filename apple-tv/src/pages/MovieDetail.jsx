import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useMovieStore } from '../store/useMovieStore';

// =====================================================================
// 영화 / TV 공통 상세 (Apple TV 토글의 모든 작품 상세)
// - 하나의 컴포넌트로 영화와 TV 시리즈를 모두 표시
// - 라우터: /movie/:id · /tv/:id · /detail/:id?type=tv (모두 이 컴포넌트)
// - 영화: 에피소드 탭 = 관련 영상(예고편 · 클립 ...)
// - TV  : 에피소드 탭 = 시즌 선택 + 실제 회차 목록 (회차 영상이 없으면 예고편 재생)
// =====================================================================

const IMG = 'https://image.tmdb.org/t/p';

// 상세 페이지 경로 (카드 링크에서 import 해서 사용: detailPath('tv', 123))
export const detailPath = (type, id) => `/${type === 'tv' ? 'tv' : 'movie'}/${id}`;

// TMDB 영상 type → 한글 라벨
const VIDEO_TYPE_LABEL = {
  Trailer: '예고편',
  Teaser: '티저',
  Clip: '클립',
  Featurette: '메이킹',
  'Behind the Scenes': '비하인드',
  Bloopers: 'NG 장면',
  'Opening Credits': '오프닝',
};

const formatDate = (date) => (date ? date.slice(0, 10).replaceAll('-', '.') : '');

// 주소에서 영화 / TV 구분: prop → /tv/:id → ?type=tv → 기본 영화
const useContentType = (typeProp) => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  if (typeProp === 'tv' || typeProp === 'movie') return typeProp;
  if (pathname.startsWith('/tv/')) return 'tv';
  return searchParams.get('type') === 'tv' ? 'tv' : 'movie';
};

export const MovieDetail = ({ type: typeProp }) => {
  // 주소줄에 매개 값을 받아서 사용하기
  const { id } = useParams();
  const contentId = Number(id);
  const type = useContentType(typeProp);
  const isTv = type === 'tv';

  const {
    popMovie,
    contentDetails,
    onFetchContentDetail,
    episodes,
    onFetchEpisode,
    onFetchEpisodeVideo,
    wishlist,
    onToggleWishlist,
  } = useMovieStore();

  // 팝업 / 탭 / 필터 / 평점 상태
  const [playKey, setPlayKey] = useState(null);            // 팝업에서 재생할 유튜브 key
  const [activeTab, setActiveTab] = useState('episodes');  // episodes | cast | similar
  const [videoType, setVideoType] = useState('all');       // (영화) 영상 유형 필터
  const [season, setSeason] = useState(null);              // (TV) 선택한 시즌 번호
  const [sortOrder, setSortOrder] = useState('oldest');    // oldest | newest
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSaved, setRatingSaved] = useState(false);

  // 작품이 바뀌면 데이터 불러오고 상태 초기화 (추천 콘텐츠 클릭 시)
  useEffect(() => {
    if (!contentId) return;
    onFetchContentDetail(type, contentId);

    setActiveTab('episodes');
    setVideoType('all');
    setSeason(null);
    setSortOrder('oldest');
    setMyRating(0);
    setRatingSaved(false);
    window.scrollTo(0, 0);
  }, [type, contentId, onFetchContentDetail]);

  // 상세 정보(장르·출연진 포함)를 우선 사용하고, 없으면 인기 영화 목록에서 찾기
  const detail = contentDetails[`${type}_${contentId}`];
  const item = detail || (!isTv ? popMovie.find((m) => m.id === contentId) : null);

  // 영화 / TV 필드 이름 차이 정리
  const title = item?.title || item?.name || '';
  const originalTitle = item?.original_title || item?.original_name;
  const releaseYear = (item?.release_date || item?.first_air_date)?.slice(0, 4);
  const runtime = detail?.runtime || detail?.episode_run_time?.[0];

  // (TV) 시즌 목록: 스페셜(0시즌)은 정규 시즌이 없을 때만 표시
  const seasons = useMemo(() => {
    const list = detail?.seasons || [];
    const regular = list.filter((s) => s.season_number > 0 && s.episode_count > 0);
    return regular.length ? regular : list;
  }, [detail]);
  const currentSeason = season ?? seasons[0]?.season_number ?? null;

  const genres = detail?.genres?.map((g) => g.name).join(' / ');
  const metaText = [
    genres,
    releaseYear,
    isTv && seasons.length > 0 && `시즌 ${seasons.length}개`,
    runtime && `${runtime}분`,
  ].filter(Boolean).join(' · ');

  const logo =
    detail?.images?.logos?.find((l) => l.iso_639_1 === 'ko') ||
    detail?.images?.logos?.[0];
  const cast = detail?.credits?.cast?.slice(0, 21) || [];
  const similar = detail?.similar?.results?.filter((m) => m.poster_path) || [];

  // 영상 정보 (한국어 → 영어 순으로 함께 받음)
  const youtubeVideos = useMemo(
    () => (detail?.videos?.results || []).filter((v) => v.site === 'YouTube'),
    [detail]
  );
  const trailer =
    youtubeVideos.find((v) => v.type === 'Trailer') || youtubeVideos[0];

  // (TV) 선택한 시즌의 회차 불러오기
  useEffect(() => {
    if (!isTv || currentSeason === null) return;
    onFetchEpisode(contentId, currentSeason).catch((error) =>
      console.error('시즌 정보 조회 실패:', error)
    );
  }, [isTv, contentId, currentSeason, onFetchEpisode]);

  // (영화) 영상 유형 목록 (select 옵션)
  const videoTypes = useMemo(
    () => [...new Set(youtubeVideos.map((v) => v.type))],
    [youtubeVideos]
  );

  // 에피소드 탭 목록: 영화 = 관련 영상, TV = 시즌 회차 (필터 + 정렬)
  const episodeList = useMemo(() => {
    if (isTv) {
      const list = episodes[`${contentId}_${currentSeason}`] || [];
      return sortOrder === 'oldest' ? list : [...list].reverse();
    }
    const list =
      videoType === 'all'
        ? youtubeVideos
        : youtubeVideos.filter((v) => v.type === videoType);
    return [...list].sort((a, b) => {
      const diff = new Date(a.published_at) - new Date(b.published_at);
      return sortOrder === 'oldest' ? diff : -diff;
    });
  }, [isTv, episodes, contentId, currentSeason, youtubeVideos, videoType, sortOrder]);

  // TMDB 평점(10점 만점) → 5점 만점
  const score = item?.vote_average ? (item.vote_average / 2).toFixed(1) : '-';

  // 찜하기
  const isWished = wishlist.some((w) => w.id === contentId && w.type === type);
  const handleWish = () => {
    if (!item) return;
    onToggleWishlist({
      id: contentId,
      type,
      title,
      poster_path: item.poster_path,
    });
  };

  // 공유하기
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('링크가 복사되었습니다.');
      }
    } catch {
      // 공유 취소 등은 무시
    }
  };

  // (TV) 회차 재생: 회차 영상 → 없으면 작품 예고편 → 없으면 안내
  const handlePlayEpisode = async (ep) => {
    await onFetchEpisodeVideo(contentId, ep.season_number, ep.episode_number);
    const key = `${contentId}_${ep.season_number}_${ep.episode_number}`;
    const list = useMovieStore.getState().episodeVideos[key] || [];
    const video = list.find((v) => v.site === 'YouTube');
    setPlayKey(video?.key || trailer?.key || 'none');
  };

  // 평점 남기기
  const handleSubmitRating = () => {
    if (!myRating) return;
    setRatingSaved(true);
  };

  const listLabel = isTv
    ? seasons.find((s) => s.season_number === currentSeason)?.name || (currentSeason !== null ? `시즌 ${currentSeason}` : '에피소드')
    : videoType === 'all' ? '전체 영상' : VIDEO_TYPE_LABEL[videoType] || videoType;

  return (
    <section className={`sub-page movie-detail-page movie-detail-page--${type}`}>
      <div className="inner">
        <div className="content-layout">

          {/* ===== 왼쪽: 플레이어 + 정보 + 평점 ===== */}
          <div className="left-section">
            <div className="player-box">
              {/* 상단 미디어 (트레일러 또는 배경 이미지) */}
              <div className="player-media">
                {trailer ? (
                  <iframe
                    key={trailer.key}
                    src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&loop=1&controls=0&playlist=${trailer.key}`}
                    title={`${title} 예고편`}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  ></iframe>
                ) : (
                  (item?.backdrop_path || item?.poster_path) && (
                    <img
                      src={`${IMG}/original${item.backdrop_path || item.poster_path}`}
                      alt={title}
                    />
                  )
                )}
              </div>

              {/* 하단 정보 바 */}
              <div className="player-info">
                <div className="info-text">
                  {logo ? (
                    <img
                      className="title-logo"
                      src={`${IMG}/w500${logo.file_path}`}
                      alt={title}
                    />
                  ) : (
                    <h2 className="title">{title}</h2>
                  )}
                  {originalTitle && (
                    <p className="original-title">{originalTitle}</p>
                  )}
                  <p className="genres">{metaText}</p>
                  <p className="overview">{item?.overview || '줄거리 정보가 없습니다.'}</p>
                </div>

                <div className="info-actions">
                  <div className="icon-btns">
                    <button
                      className={`icon-btn ${isWished ? 'on' : ''}`}
                      onClick={handleWish}
                      aria-label={isWished ? '찜 해제' : '찜하기'}
                    >
                      {isWished ? '♥' : '♡'}
                    </button>
                    <button className="icon-btn" onClick={handleShare} aria-label="공유하기">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                      </svg>
                    </button>
                  </div>
                  <button
                    className="btn-play"
                    onClick={() => setPlayKey(trailer?.key || 'none')}
                  >
                    재생하기
                  </button>
                </div>
              </div>
            </div>

            {/* 작품 평점 */}
            <div className="rating-section">
              <div className="rating-header">
                <h3>작품 평점</h3>
                <div className="score-display">
                  <span className="star-icon">☆</span>
                  <strong>{score}</strong>
                  <span className="max-score">/ 5</span>
                </div>
              </div>
              <p className="rating-desc">이 작품은 어떠셨나요?</p>

              <div className="star-picker" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = n <= (hoverRating || myRating);
                  return (
                    <button
                      key={n}
                      className={`star-item ${on ? 'on' : ''}`}
                      onMouseEnter={() => setHoverRating(n)}
                      onClick={() => {
                        setMyRating(n);
                        setRatingSaved(false);
                      }}
                    >
                      <span className="star">{on ? '★' : '☆'}</span>
                      <span className="label">{n}점</span>
                    </button>
                  );
                })}
              </div>

              <button
                className="btn-submit-rating"
                onClick={handleSubmitRating}
                disabled={!myRating}
              >
                {ratingSaved ? '평점 수정하기' : '평점 남기기'}
              </button>
              {ratingSaved && (
                <p className="rating-done">{myRating}점으로 평가했어요.</p>
              )}
            </div>
          </div>

          {/* ===== 오른쪽: 탭 + 목록 ===== */}
          <aside className="right-section">
            <div className="tabs">
              {[
                ['episodes', '에피소드'],
                ['cast', '등장인물'],
                ['similar', '추천콘텐츠'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 에피소드 (영화: 관련 영상 / TV: 시즌 회차) */}
            {activeTab === 'episodes' && (
              <>
                <div className="filter-bar">
                  {isTv ? (
                    <select
                      value={currentSeason ?? ''}
                      onChange={(e) => setSeason(Number(e.target.value))}
                      disabled={seasons.length === 0}
                    >
                      {seasons.length === 0 && <option value="">시즌 정보 없음</option>}
                      {seasons.map((s) => (
                        <option key={s.id} value={s.season_number}>
                          {s.name || `시즌 ${s.season_number}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select value={videoType} onChange={(e) => setVideoType(e.target.value)}>
                      <option value="all">전체 영상</option>
                      {videoTypes.map((t) => (
                        <option key={t} value={t}>
                          {VIDEO_TYPE_LABEL[t] || t}
                        </option>
                      ))}
                    </select>
                  )}
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="oldest">{isTv ? '1화부터' : '오래된 순'}</option>
                    <option value="newest">{isTv ? '최신화부터' : '최신 순'}</option>
                  </select>
                </div>

                <p className="season-label">
                  {listLabel} {episodeList.length}
                </p>

                <div className="list-container">
                  {episodeList.length === 0 ? (
                    <p className="empty-content">{isTv ? '회차 정보가 없습니다.' : '관련 영상이 없습니다.'}</p>
                  ) : isTv ? (
                    episodeList.map((ep) => (
                      <button
                        key={ep.id}
                        className="episode-card"
                        onClick={() => handlePlayEpisode(ep)}
                      >
                        <div className="thumb">
                          {(ep.still_path || item?.backdrop_path) && (
                            <img
                              src={`${IMG}/w300${ep.still_path || item.backdrop_path}`}
                              alt={ep.name}
                              loading="lazy"
                            />
                          )}
                          <span className="thumb-play">▶</span>
                        </div>
                        <div className="info">
                          <span className="ep-num">{ep.episode_number}화</span>
                          <span className="ep-title">{ep.name}</span>
                          <span className="runtime">
                            {[ep.runtime && `${ep.runtime}분`, formatDate(ep.air_date)].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    episodeList.map((v, i) => (
                      <button
                        key={v.id}
                        className="episode-card"
                        onClick={() => setPlayKey(v.key)}
                      >
                        <div className="thumb">
                          <img
                            src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`}
                            alt={v.name}
                            loading="lazy"
                          />
                          <span className="thumb-play">▶</span>
                        </div>
                        <div className="info">
                          <span className="ep-num">{i + 1}화</span>
                          <span className="ep-title">{v.name}</span>
                          <span className="runtime">
                            {VIDEO_TYPE_LABEL[v.type] || v.type} · {formatDate(v.published_at)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {/* 등장인물 */}
            {activeTab === 'cast' && (
              <div className="list-container">
                {cast.length > 0 ? (
                  <ul className="cast-grid">
                    {cast.map((p) => (
                      <li key={p.credit_id} className="cast-item">
                        <div className="cast-photo">
                          {p.profile_path ? (
                            <img src={`${IMG}/w185${p.profile_path}`} alt={p.name} loading="lazy" />
                          ) : (
                            <span>{p.name?.[0]}</span>
                          )}
                        </div>
                        <span className="cast-name">{p.name}</span>
                        <span className="cast-role">{p.character}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-content">등장인물 정보가 없습니다.</p>
                )}
              </div>
            )}

            {/* 추천 콘텐츠 (같은 종류: 영화 → 영화 상세, TV → TV 상세) */}
            {activeTab === 'similar' && (
              <div className="list-container">
                {similar.length > 0 ? (
                  <ul className="similar-grid">
                    {similar.map((m) => (
                      <li key={m.id}>
                        <Link to={detailPath(type, m.id)} className="similar-card">
                          <div className="similar-poster">
                            <img src={`${IMG}/w342${m.poster_path}`} alt={m.title || m.name} loading="lazy" />
                          </div>
                          <span className="similar-title">{m.title || m.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-content">추천 콘텐츠가 없습니다.</p>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* 전체화면 재생 팝업 */}
      {playKey && (
        <div className="detail-popup">
          <button className="popup-close" onClick={() => setPlayKey(null)}>
            닫기
          </button>
          {playKey !== 'none' ? (
            <iframe
              src={`https://www.youtube.com/embed/${playKey}?autoplay=1`}
              title="Video Popup"
              allow="autoplay; encrypted-media"
              allowFullScreen
            ></iframe>
          ) : (
            <p>재생할 수 있는 영상이 없습니다.</p>
          )}
        </div>
      )}
    </section>
  )
}

export default MovieDetail;
