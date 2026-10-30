import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useMovieStore } from '../store/useMovieStore';
import { toggleWish, useHeartStore, wishKey } from '../store/useHeartStore'; // 위시리스트 (Firestore)
import { useAuthStore } from '../store/useAuthStore';
import { isResumable, resumeAt, useWatchConnect, useWatchStore } from '../store/useWatchStore'; // 이어보기 (시청 기록)
import CastFilmography from '../components/detail/CastFilmography';
import WatchPlayer from '../components/common/WatchPlayer'; // 재생 위치를 알 수 있는 유튜브 플레이어

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

// 별점 별 (public/icons/star-icon.svg 와 같은 모양)
// - 파일을 img 로 넣으면 색 · 채움을 바꿀 수 없어서, 같은 모양을 그대로 옮겨 상태별로 색만 바꿈
// - filled: 고른 점수까지 노랗게 채움 / 아니면 회색 테두리
const RatingStar = ({ filled = false, className = '' }) => (
  <svg className={className} viewBox="0 0 35 35" aria-hidden="true">
    <path
      d="M18.103 26.0768L24.9986 30.4455C25.88 31.0039 26.9744 30.1734 26.7127 29.1444L24.7205 21.3074C24.6644 21.0891 24.6711 20.8594 24.7396 20.6448C24.8083 20.4301 24.9362 20.2392 25.1084 20.0939L31.2919 14.9473C32.1043 14.2711 31.6851 12.9227 30.6412 12.8549L22.566 12.3309C22.3485 12.3153 22.1398 12.2383 21.9644 12.1088C21.789 11.9793 21.6539 11.8026 21.575 11.5993L18.5634 4.01513C18.4815 3.79937 18.3359 3.6136 18.146 3.48253C17.956 3.35145 17.7307 3.28125 17.5 3.28125C17.2693 3.28125 17.044 3.35145 16.854 3.48253C16.6641 3.6136 16.5185 3.79937 16.4366 4.01513L13.425 11.5993C13.346 11.8026 13.211 11.9793 13.0356 12.1088C12.8601 12.2383 12.6515 12.3153 12.434 12.3309L4.35887 12.8549C3.31501 12.9227 2.89567 14.2711 3.70813 14.9473L9.89156 20.0939C10.0639 20.2392 10.1917 20.4301 10.2603 20.6448C10.329 20.8594 10.3356 21.0891 10.2795 21.3074L8.43191 28.5753C8.11806 29.8101 9.43126 30.8067 10.489 30.1366L16.897 26.0768C17.0771 25.962 17.2864 25.901 17.5 25.901C17.7136 25.901 17.9229 25.962 18.103 26.0768Z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
  } = useMovieStore();

  // 팝업 / 탭 / 필터 / 평점 상태
  // 팝업에서 재생할 영상: { key(유튜브 key 또는 'none'), season, episode, episodeName, startAt(이어볼 위치 초) }
  const [playing, setPlaying] = useState(null);
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

  // ---------- 이어보기 (시청 기록) ----------
  const uid = useAuthStore((s) => s.user?.uid);
  useWatchConnect(uid);
  const watchStatus = useWatchStore((s) => s.status);
  const history = useWatchStore((s) => s.items.find((h) => h.type === type && h.id === contentId));
  const onSaveProgress = useWatchStore((s) => s.onSaveProgress);

  // 로그인 전: 상세 페이지는 둘러볼 수 있고, 재생할 때만 구독 팝업 (SubscribeGate)
  const authReady = useAuthStore((s) => s.authReady);
  const askSubscribe = () =>
    window.dispatchEvent(new CustomEvent('subscribe-gate:open', { detail: { reason: 'watch' } }));

  // 영상 열기: 같은 영상을 보다 멈췄으면 그 위치부터
  const openPlayer = (key, meta = {}) => {
    if (!uid) {
      askSubscribe();
      return;
    }
    setPlaying(key ? { key, ...meta, startAt: resumeAt(history, key) } : { key: 'none' });
  };

  // 재생하기 · 이어보기: 보던 영상이 있으면 이어서, 없으면 예고편
  const playFromHistory = () => {
    if (history?.videoKey && isResumable(history)) {
      openPlayer(history.videoKey, {
        season: history.season,
        episode: history.episode,
        episodeName: history.episodeName,
      });
    } else {
      openPlayer(trailer?.key);
    }
  };

  // 재생 위치 저장 (WatchPlayer 가 몇 초마다 · 닫을 때 호출)
  const handleProgress = (position, duration) => {
    if (!playing || playing.key === 'none') return;
    onSaveProgress({
      id: contentId,
      type,
      title,
      backdrop_path: item?.backdrop_path,
      poster_path: item?.poster_path,
      genre: detail?.genres?.[0]?.name,
      season: playing.season,
      episode: playing.episode,
      episodeName: playing.episodeName,
      videoKey: playing.key,
      position,
      duration,
    });
  };

  // [추가] 검색 > 작품 페이지의 "지금 보기" · 홈 이어보기 (?play=1) → 상세 정보를 받으면 바로 재생 팝업
  const [searchParams, setSearchParams] = useSearchParams();
  const autoPlay = searchParams.get('play') === '1';
  useEffect(() => {
    if (!autoPlay || !authReady || !detail || (uid && watchStatus === 'loading')) return;
    playFromHistory(); // 로그인 전이면 재생 대신 구독 팝업
    // 한 번만 재생되도록 주소에서 play 제거 (뒤로 가기 · 새로고침 시 다시 열리지 않게)
    const next = new URLSearchParams(searchParams);
    next.delete('play');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, authReady, detail, trailer, searchParams, setSearchParams, uid, watchStatus]);

  // [추가] 홈 추천작의 ★ 평점 버튼 (#rating) → 상세 정보를 받으면 "작품 평점"으로 스크롤
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== '#rating' || !detail) return;
    document.getElementById('rating')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [hash, detail]);

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

  // 찜하기 (위시리스트: 담으면 "어떤 그룹에 추가할까요?" 팝업)
  const isWished = useHeartStore((s) => Boolean(s.items[wishKey(type, contentId)]));
  const handleWish = () => {
    if (!item) return;
    toggleWish({
      id: contentId,
      type,
      title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      overview: item.overview,
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
    if (!uid) {
      askSubscribe(); // 로그인 전: 구독 팝업
      return;
    }
    await onFetchEpisodeVideo(contentId, ep.season_number, ep.episode_number);
    const key = `${contentId}_${ep.season_number}_${ep.episode_number}`;
    const list = useMovieStore.getState().episodeVideos[key] || [];
    const video = list.find((v) => v.site === 'YouTube');
    openPlayer(video?.key || trailer?.key, {
      season: ep.season_number,
      episode: ep.episode_number,
      episodeName: ep.name,
    });
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
                    onClick={playFromHistory}
                  >
                    {history && isResumable(history) ? '이어보기' : '재생하기'}
                  </button>
                </div>
              </div>
            </div>

            {/* 작품 평점 */}
            <div className="rating-section" id="rating">
              <div className="rating-header">
                <h3>작품 평점</h3>
                <div className="score-display">
                  <RatingStar filled className="score-star" />
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
                      <span className="star"><RatingStar filled={on} /></span>
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
                          <span className="thumb-play"><img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" /></span>
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
                        onClick={() => openPlayer(v.key)}
                      >
                        <div className="thumb">
                          <img
                            src={`https://img.youtube.com/vi/${v.key}/mqdefault.jpg`}
                            alt={v.name}
                            loading="lazy"
                          />
                          <span className="thumb-play"><img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" /></span>
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
              <div className="list-container cast-list-container">
                <CastFilmography key={`${type}_${contentId}`} cast={cast} />
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
      {playing && (
        <div className="detail-popup">
          <button className="popup-close" onClick={() => setPlaying(null)}>
            닫기
          </button>
          {playing.key !== 'none' ? (
            // 재생 위치를 몇 초마다 시청 기록에 저장 (홈 이어보기)
            <WatchPlayer
              videoKey={playing.key}
              startAt={playing.startAt}
              title={title}
              onProgress={handleProgress}
            />
          ) : (
            <p>재생할 수 있는 영상이 없습니다.</p>
          )}
        </div>
      )}
    </section>
  )
}

export default MovieDetail;
