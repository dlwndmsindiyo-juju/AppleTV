import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMovieStore } from '../store/useMovieStore';

const IMG = 'https://image.tmdb.org/t/p';

// 상세 페이지 경로 (라우터에 등록된 경로와 맞춰 주세요)
const detailPath = (id) => `/movie/${id}`;

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

export const MovieDetail = () => {
  // 주소줄에 매개 값을 받아서 사용하기
  const { id } = useParams();
  const movieId = Number(id);

  const {
    popMovie,
    popVideo,
    onFetchVideo,
    movieDetails,
    onFetchMovieDetail,
    wishlist,
    onToggleWishlist,
  } = useMovieStore();

  // 팝업 / 탭 / 필터 / 평점 상태
  const [playKey, setPlayKey] = useState(null);            // 팝업에서 재생할 유튜브 key
  const [activeTab, setActiveTab] = useState('episodes');  // episodes | cast | similar
  const [videoType, setVideoType] = useState('all');       // 영상 유형 필터
  const [sortOrder, setSortOrder] = useState('oldest');    // oldest | newest
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSaved, setRatingSaved] = useState(false);

  // 영화가 바뀌면 데이터 불러오고 상태 초기화 (추천 콘텐츠 클릭 시)
  useEffect(() => {
    if (!movieId) return;
    onFetchVideo(movieId);
    onFetchMovieDetail(movieId);

    setActiveTab('episodes');
    setVideoType('all');
    setSortOrder('oldest');
    setMyRating(0);
    setRatingSaved(false);
    window.scrollTo(0, 0);
  }, [movieId, onFetchVideo, onFetchMovieDetail]);

  // 상세 정보(장르·출연진 포함)를 우선 사용하고, 없으면 인기 목록에서 찾기
  const detail = movieDetails[movieId];
  const movie = detail || popMovie.find((m) => m.id === movieId);

  const genres = detail?.genres?.map((g) => g.name).join(' / ');
  const logo =
    detail?.images?.logos?.find((l) => l.iso_639_1 === 'ko') ||
    detail?.images?.logos?.[0];
  const cast = detail?.credits?.cast?.slice(0, 21) || [];
  const similar = detail?.similar?.results?.filter((m) => m.poster_path) || [];

  // 영상 정보
  const videos = popVideo[movieId] || [];
  const youtubeVideos = videos.filter((v) => v.site === 'YouTube');
  const trailer =
    youtubeVideos.find((v) => v.type === 'Trailer') || youtubeVideos[0];

  // 영상 유형 목록 (select 옵션)
  const videoTypes = useMemo(
    () => [...new Set(youtubeVideos.map((v) => v.type))],
    [youtubeVideos]
  );

  // 필터 + 정렬된 영상 목록
  const videoList = useMemo(() => {
    const list =
      videoType === 'all'
        ? youtubeVideos
        : youtubeVideos.filter((v) => v.type === videoType);
    return [...list].sort((a, b) => {
      const diff = new Date(a.published_at) - new Date(b.published_at);
      return sortOrder === 'oldest' ? diff : -diff;
    });
  }, [youtubeVideos, videoType, sortOrder]);

  // TMDB 평점(10점 만점) → 5점 만점
  const score = movie?.vote_average ? (movie.vote_average / 2).toFixed(1) : '-';

  // 찜하기
  const isWished = wishlist.some((w) => w.id === movieId && w.type === 'movie');
  const handleWish = () => {
    if (!movie) return;
    onToggleWishlist({
      id: movieId,
      type: 'movie',
      title: movie.title,
      poster_path: movie.poster_path,
    });
  };

  // 공유하기
  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: movie?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('링크가 복사되었습니다.');
      }
    } catch {
      // 공유 취소 등은 무시
    }
  };

  // 평점 남기기
  const handleSubmitRating = () => {
    if (!myRating) return;
    setRatingSaved(true);
  };

  const formatDate = (date) => (date ? date.slice(0, 10).replaceAll('-', '.') : '');

  return (
    <section className="sub-page movie-detail-page">
      <div className="inner">
        <div className="content-layout">

          {/* ===== 왼쪽: 플레이어 + 정보 + 평점 ===== */}
          <div className="left-section">
            <div className="player-box">
              {/* 상단 미디어 (트레일러 또는 배경 이미지) */}
              <div className="player-media">
                {trailer ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&loop=1&controls=0&playlist=${trailer.key}`}
                    title="Movie Trailer"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  ></iframe>
                ) : (
                  (movie?.backdrop_path || movie?.poster_path) && (
                    <img
                      src={`${IMG}/original${movie.backdrop_path || movie.poster_path}`}
                      alt={movie.title}
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
                      alt={movie?.title}
                    />
                  ) : (
                    <h2 className="title">{movie?.title}</h2>
                  )}
                  {movie?.original_title && (
                    <p className="original-title">{movie.original_title}</p>
                  )}
                  <p className="genres">
                    {[genres, movie?.release_date?.slice(0, 4), detail?.runtime && `${detail.runtime}분`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="overview">{movie?.overview || '줄거리 정보가 없습니다.'}</p>
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

            {/* 에피소드(관련 영상) */}
            {activeTab === 'episodes' && (
              <>
                <div className="filter-bar">
                  <select value={videoType} onChange={(e) => setVideoType(e.target.value)}>
                    <option value="all">전체 영상</option>
                    {videoTypes.map((t) => (
                      <option key={t} value={t}>
                        {VIDEO_TYPE_LABEL[t] || t}
                      </option>
                    ))}
                  </select>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="oldest">오래된 순</option>
                    <option value="newest">최신 순</option>
                  </select>
                </div>

                <p className="season-label">
                  {videoType === 'all' ? '전체 영상' : VIDEO_TYPE_LABEL[videoType] || videoType}
                  {' '}{videoList.length}
                </p>

                <div className="list-container">
                  {videoList.length > 0 ? (
                    videoList.map((v, i) => (
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
                  ) : (
                    <p className="empty-content">관련 영상이 없습니다.</p>
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

            {/* 추천 콘텐츠 */}
            {activeTab === 'similar' && (
              <div className="list-container">
                {similar.length > 0 ? (
                  <ul className="similar-grid">
                    {similar.map((m) => (
                      <li key={m.id}>
                        <Link to={detailPath(m.id)} className="similar-card">
                          <div className="similar-poster">
                            <img src={`${IMG}/w342${m.poster_path}`} alt={m.title} loading="lazy" />
                          </div>
                          <span className="similar-title">{m.title}</span>
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
