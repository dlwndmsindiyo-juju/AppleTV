import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DetailBackLink from '../components/common/DetailBackLink' // [추가] 상세 공용 "← 홈으로"
import { useMovieStore } from '../store/useMovieStore';
import { toggleWish, useHeartStore, wishKey } from '../store/useHeartStore'; // 위시리스트 (Firestore)
import { useAuthStore, useSettings, isSubscribed } from '../store/useAuthStore'; // [수정] useSettings: 계정 설정 자동 재생 토글
import { isResumable, resumeAt, useWatchConnect, useWatchStore } from '../store/useWatchStore'; // 이어보기 (시청 기록)
import CastFilmography from '../components/detail/CastFilmography';
import WatchPlayer from '../components/common/WatchPlayer'; // 재생 위치를 알 수 있는 유튜브 플레이어
import AutoNext from '../components/common/AutoNext'; // [추가] 영상이 끝나면 "5초 후 다음 영상" 안내
import VideoPopup from '../components/common/VideoPopup'; // [추가] 전체 화면 영상 팝업 공용 ("← 뒤로" · Esc · 브라우저 뒤로가기로 닫기)
import { openSubscribeGate } from '../utils/subscribeGate'; // [정리] 구독 안내 팝업 열기 공용
import { TMDB_IMG as IMG } from '../utils/tmdb'; // [정리] TMDB 이미지 주소 공용
import InfoBadges from '../components/common/InfoBadges';
import { openShare } from '../utils/share'; // [추가] 공유 팝업 // [추가] 평점 · 4K · HDR10+ · CC · AD 배지 줄 (홈 히어로와 공용)
import SelectDropdown from '../components/common/SelectDropdown'; // [추가] 지불 방법 선택 상자와 같은 디자인 (아래 선만)

// =====================================================================
// 영화 / TV 공통 상세 (Apple TV 토글의 모든 작품 상세)
// - 하나의 컴포넌트로 영화와 TV 시리즈를 모두 표시
// - 라우터: /movie/:id · /tv/:id · /detail/:id?type=tv (모두 이 컴포넌트)
// - 영화: 에피소드 탭 = 관련 영상(예고편 · 클립 ...)
// - TV  : 에피소드 탭 = 시즌 선택 + 실제 회차 목록 (회차 영상이 없으면 예고편 재생)
// =====================================================================


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
  const [upNext, setUpNext] = useState(null); // [추가] 끝난 뒤 자동 재생할 것 { kind, title, image, run }
  const settings = useSettings(); // [추가] 계정 설정 (다음 에피소드 · 추천 항목 재생)
  const navigate = useNavigate();

  // 작품이 바뀌면 데이터 불러오고 상태 초기화 (추천 콘텐츠 클릭 시)
  useEffect(() => {
    if (!contentId) return;
    onFetchContentDetail(type, contentId);

    setActiveTab('episodes');
    setVideoType('all');
    setSeason(null);
    setSortOrder('oldest');
    // [수정] 예전에 남긴 평점이 있으면 그대로 보여 줌 (새로고침 · 다시 들어와도 유지)
    const saved = useMovieStore.getState().myRatings?.[`${type}_${contentId}`]?.score || 0;
    setMyRating(saved);
    setRatingSaved(saved > 0);
    window.scrollTo(0, 0);
  }, [type, contentId, onFetchContentDetail]);

  // 상세 정보(장르·출연진 포함)를 우선 사용하고, 없으면 인기 영화 목록에서 찾기
  const detail = contentDetails[`${type}_${contentId}`];
  const item = detail || (!isTv ? popMovie.find((m) => m.id === contentId) : null);

  // 영화 / TV 필드 이름 차이 정리
  const title = item?.title || item?.name || '';
  const savedScore = useMovieStore((s) => s.myRatings?.[`${type}_${contentId}`]?.score || 0); // [추가] 저장된 내 평점
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

  // [수정] 타이틀 로고 — 한국어 → 영어 → 첫 로고 순 (홈 히어로와 같은 순서)
  // - 색은 CSS 에서 항상 흰색(light-0 #FFFFFF)으로 바꿔서 표시 (App.scss .title-logo)
  //   예전: 검정 로고(예: 슬로 호시스)가 그대로 나와 어두운 배경에 묻혔음
  const logoList = detail?.images?.logos || [];
  const logo =
    logoList.find((l) => l.iso_639_1 === 'ko') ||
    logoList.find((l) => l.iso_639_1 === 'en') ||
    logoList[0];
  // [추가] 전체보기 — 위 영상(예고편 · 이미지) 칸을 화면 가득 (브라우저 전체 화면) · 다시 누르거나 Esc 로 원래대로
  // - 아이콘: public/icons/full-screen.svg (mask 로 써서 파일 색과 상관없이 흰색) · [수정] 버튼 위치: 영상 칸 오른쪽 위
  // - 요소 전체 화면을 지원하지 않는 브라우저(아이폰 Safari 등)는 재생 팝업으로 대신 크게 보기
  const mediaRef = useRef(null);
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const onChange = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFull(Boolean(el) && el === mediaRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);
  const toggleFull = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      return;
    }
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (request) request.call(el);
    else playFromHistory();
  };

  // [추가] 제목 아래 정보 배지 줄 (InfoBadges · 홈 히어로와 같은 모양)
  // - Apple Original 판단: 시리즈 = 방송사 Apple TV+(2552) / 영화 = Apple Original Films · Apple Studios
  const isAppleOriginal = isTv
    ? Boolean(detail?.networks?.some((n) => n.id === 2552))
    : Boolean(detail?.production_companies?.some((c) => [151347, 194232].includes(c.id)));
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
  const subscribed = useAuthStore((s) => isSubscribed(s.user)); // [추가] 구독 여부 (구독 전에는 재생 대신 구독 안내 팝업)
  useWatchConnect(uid);
  const watchStatus = useWatchStore((s) => s.status);
  const history = useWatchStore((s) => s.items.find((h) => h.type === type && h.id === contentId));
  const onSaveProgress = useWatchStore((s) => s.onSaveProgress);

  // 로그인 전: 상세 페이지는 둘러볼 수 있고, 재생할 때만 구독 팝업 (SubscribeGate)
  const authReady = useAuthStore((s) => s.authReady);
  const askSubscribe = () =>
    openSubscribeGate('watch');

  // 영상 열기: 같은 영상을 보다 멈췄으면 그 위치부터
  const openPlayer = (key, meta = {}) => {
    if (!uid || !subscribed) { // [수정] 로그인했지만 구독 전이어도 구독 안내 팝업
      askSubscribe();
      return;
    }
    setUpNext(null);
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

  // [수정] 공유하기 — 기기 기본 공유 창 대신 공유 팝업 (components/common/ShareSheet.jsx)
  const handleShare = () => openShare({ title, url: window.location.href });



  // (TV) 회차 재생: 회차 영상 → 없으면 작품 예고편 → 없으면 안내
  const handlePlayEpisode = async (ep) => {
    if (!uid || !subscribed) {
      askSubscribe(); // 로그인 전 · 구독 전: 구독 팝업
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

  // [추가] 영상이 끝났을 때 자동 재생 (계정 설정 토글)
  // - 다음 에피소드 재생: 시리즈 회차를 보던 중이면 같은 시즌의 다음 회차
  // - 추천 항목 재생: 다음 회차가 없거나(영화 · 예고편 · 마지막 회차) 위 토글이 꺼져 있으면 추천 콘텐츠 첫 번째
  // - 둘 다 꺼져 있으면 끝난 화면 그대로
  const handleEnded = () => {
    if (!playing || playing.key === 'none') return;
    if (settings.autoplayNext && isTv && playing.episode) {
      const list = episodes[`${contentId}_${playing.season}`] || [];
      const ep = list.find((e) => e.episode_number === playing.episode + 1);
      if (ep) {
        setUpNext({
          kind: '다음 에피소드',
          title: `${ep.episode_number}화 · ${ep.name}`,
          image: ep.still_path || item?.backdrop_path ? `${IMG}/w300${ep.still_path || item.backdrop_path}` : '',
          run: () => handlePlayEpisode(ep),
        });
        return;
      }
    }
    const next = similar[0];
    if (settings.autoplayRecommend && next) {
      setUpNext({
        kind: '추천 콘텐츠',
        title: next.title || next.name,
        image: next.backdrop_path ? `${IMG}/w300${next.backdrop_path}` : `${IMG}/w342${next.poster_path}`,
        // 그 작품 상세로 가서 바로 재생 (?play=1 · 검색 "지금 보기" 와 같은 방식)
        run: () => {
          setPlaying(null);
          navigate(`${detailPath(type, next.id)}?play=1`);
        },
      });
    }
  };

  const runUpNext = () => {
    const run = upNext?.run;
    setUpNext(null);
    run?.();
  };

  // 평점 남기기
  const handleSubmitRating = () => {
    if (!myRating) return;
    // [수정] 저장(localStorage) + 토스트 (처음: 남겼어요 · 다시: 수정했어요)
    useMovieStore.getState().onSaveRating(`${type}_${contentId}`, myRating, title);
    setRatingSaved(true);
  };

  // [수정] TV: 고른 시즌 번호 그대로 "시즌 N" (시즌 정보가 없으면 글자 자체를 안 보여줌)
  // 영화: 영상 종류 + 개수 (예전 그대로)
  const listLabel = isTv
    ? (seasons.length > 0 && currentSeason !== null ? `시즌 ${currentSeason}` : '')
    : `${videoType === 'all' ? '전체 영상' : VIDEO_TYPE_LABEL[videoType] || videoType} ${episodeList.length}`;

  return (
    <section className={`sub-page movie-detail-page movie-detail-page--${type}`}>
      <div className="inner">
        {/* [수정] 홈으로 돌아가기 — 모든 상세 공용 (스포츠 상세 "← 스포츠 홈으로" 와 같은 자리 · 모양) */}
        <DetailBackLink to="/" label="홈으로" />

        <div className="content-layout">

          {/* ===== 왼쪽: 플레이어 + 정보 + 평점 ===== */}
          <div className="left-section">
            <div className="player-box">
              {/* 상단 미디어 (트레일러 또는 배경 이미지) */}
              <div className={`player-media${isFull ? ' is-full' : ''}`} ref={mediaRef}>
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
                {/* [추가] 전체보기 버튼 (영상 칸 오른쪽 아래) */}
                <button
                  type="button"
                  className="btn-fullscreen"
                  onClick={toggleFull}
                  aria-label={isFull ? '전체 화면 닫기' : '전체 화면으로 보기'}
                  title={isFull ? '전체 화면 닫기' : '전체보기'}
                >
                  <span className="btn-fullscreen-icon" aria-hidden="true" />
                </button>
              </div>

              {/* 하단 정보 바 */}
              <div className="player-info">
                <div className="info-text">
                  {/* [수정] 제목은 하나만 — 작품 로고(TMDB 타이틀 이미지)가 있으면 로고, 없으면 글자 제목 (원제 줄 없앰) */}
                  {logo ? (
                    <img
                      className="title-logo"
                      src={`${IMG}/w500${logo.file_path}`}
                      alt={title}
                    />
                  ) : (
                    <h2 className="title">{title}</h2>
                  )}
                  <p className="genres">{metaText}</p>
                  {/* [추가] 평점(5점 만점) + 화질 · 자막 배지 */}
                  <InfoBadges type={type} id={contentId} voteAverage={item?.vote_average} apple={isAppleOriginal} />
                  <p className="overview">{item?.overview || '줄거리 정보가 없습니다.'}</p>
                </div>

                <div className="info-actions">
                  <div className="icon-btns">
                    <button
                      className={`icon-btn ${isWished ? 'on' : ''}`}
                      onClick={handleWish}
                      aria-label={isWished ? '찜 해제' : '찜하기'}
                    >
                      {/* [수정] 글자 하트(♥ ♡) 대신 아이콘 — 담기면 채운 하트(active-heart.svg) */}
                      <span className={`icon-heart${isWished ? ' is-on' : ''}`} aria-hidden="true" />
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
                {savedScore ? '평점 수정하기' : '평점 남기기'}
              </button>
              {ratingSaved && savedScore > 0 && (
                <p className="rating-done">{savedScore}점으로 평가했어요.</p>
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
                {/* [수정] 기본 select → 지불 방법 선택 상자와 같은 목록 (목록은 아래 내용 위에 덮임 · 상자 대신 아래 선) */}
                <div className="filter-bar">
                  {isTv ? (
                    <SelectDropdown
                      variant="line"
                      ariaLabel="시즌"
                      value={seasons.length === 0 ? '' : currentSeason}
                      onChange={(v) => setSeason(Number(v))}
                      disabled={seasons.length === 0}
                      options={seasons.length === 0
                        ? [{ value: '', label: '시즌 정보 없음' }]
                        : seasons.map((s) => ({ value: s.season_number, label: s.name || `시즌 ${s.season_number}` }))}
                    />
                  ) : (
                    <SelectDropdown
                      variant="line"
                      ariaLabel="영상 유형"
                      value={videoType}
                      onChange={setVideoType}
                      options={[
                        { value: 'all', label: '전체 영상' },
                        ...videoTypes.map((t) => ({ value: t, label: VIDEO_TYPE_LABEL[t] || t })),
                      ]}
                    />
                  )}
                  <SelectDropdown
                    variant="line"
                    ariaLabel="정렬"
                    value={sortOrder}
                    onChange={setSortOrder}
                    options={[
                      { value: 'oldest', label: isTv ? '1화부터' : '오래된 순' },
                      { value: 'newest', label: isTv ? '최신화부터' : '최신 순' },
                    ]}
                  />
                </div>

                {listLabel && <p className="season-label">{listLabel}</p>}

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
      {/* [수정] 재생 팝업: 공용 VideoPopup (왼쪽 위 "← 뒤로" · body 에 그려 화면 전체에 고정) */}
      <VideoPopup
        open={Boolean(playing)}
        onClose={() => {
          setPlaying(null);
          setUpNext(null);
        }}
        label={`${title} 재생`}
        className="detail-popup"
      >
        {playing?.key !== 'none' ? (
          // 재생 위치를 몇 초마다 시청 기록에 저장 (홈 이어보기)
          // [수정] key: 다음 회차가 같은 영상(예고편)이어도 처음부터 다시 재생 · onEnded: 자동 재생
          <WatchPlayer
            key={`${playing?.key}_${playing?.season ?? ''}_${playing?.episode ?? ''}`}
            videoKey={playing?.key}
            startAt={playing?.startAt}
            title={title}
            onProgress={handleProgress}
            onEnded={handleEnded}
          />
        ) : (
          <p>재생할 수 있는 영상이 없습니다.</p>
        )}
        {/* [추가] 끝나면 5초 뒤 다음 에피소드 · 추천 콘텐츠 (계정 설정 토글) */}
        {upNext && (
          <AutoNext kind={upNext.kind} title={upNext.title} image={upNext.image} onPlay={runUpNext} onCancel={() => setUpNext(null)} />
        )}
      </VideoPopup>


    </section>
  )
}

export default MovieDetail;
