import React, { useEffect, useRef, useState } from 'react';
import './Intro.scss'; // 스타일 파일

// 인트로 영상 (넷플릭스 인트로처럼 들어오자마자 저절로 재생)
// - [수정] 어떤 기기든 재생 버튼 없이 바로 시작
//   · React 는 muted 를 속성(attribute)으로 넣지 않아 iOS 가 "소리 있는 영상"으로 보고 자동 재생을 막음
//     → 화면에 붙자마자 muted · playsinline 을 직접 넣고 play() 를 다시 부름
//   · iOS 기본 재생 버튼(가운데 큰 ▶)은 Intro.scss 에서 숨김
//   · 저전력 모드 · 데이터 절약 모드처럼 기기가 영상 자동 재생을 아예 막으면
//     → 같은 인트로의 움직이는 이미지(public/video/intro.webp)로 바꿔 보여 주고 영상 길이만큼 뒤에 끝냄
//     → intro.webp 가 없으면 바로 끝냄 (빈 검정 화면에 멈추지 않게)
// - [수정] 로딩 로고 없앰 → 들어오자마자 영상 화면 (로고가 영상 대신 보이는 일이 없게)
// - [수정] 건너뛰기(Skip Intro) 버튼: 글자 body-default-b · ✕ 글자 대신 닫기(X) 아이콘 (구독 팝업 닫기와 같은 아이콘)
// - [수정] 모바일에서 영상이 안 나오던 문제
//   · 휴대폰(767px 이하)은 가벼운 모바일 영상(intro-mobile.mp4 · 720p · 소리 없음 · 약 60KB)
//   · 두 영상 모두 재생 정보를 파일 앞에 둠(faststart) → 다 받기 전에 바로 재생
//   · 기기가 자동 재생을 "거부"했을 때(NotAllowedError)만 움직이는 이미지로 바꿈
//     → 불러오는 중 잠깐 끊긴 경우(AbortError 등)는 다시 재생 (예전엔 이것도 실패로 보고 인트로가 바로 끝남)
//   · 4초가 지나도 재생이 시작되지 않으면 움직이는 이미지로 바꿈 (검정 화면에 멈추지 않게)
//   · public/video/intro.webp 추가 (예전엔 파일이 없어 대체 화면 없이 바로 끝났음)
const VIDEO_SRC = '/video/intro.mp4';
const MOBILE_VIDEO_SRC = '/video/intro-mobile.mp4';
const FALLBACK_IMAGE = '/video/intro.webp';
const FALLBACK_DURATION = 3300; // 영상 길이를 모를 때 움직이는 이미지를 보여 줄 시간 (영상 길이 3.3초)
const START_TIMEOUT = 4000; // 이 시간 안에 재생이 시작되지 않으면 움직이는 이미지로
const MAX_RETRY = 3;

const isMobileScreen = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;

const Intro = ({ onFinish }) => {
  const videoRef = useRef(null);
  const finishedRef = useRef(false);
  const [isEnding, setIsEnding] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [videoSrc] = useState(() => (isMobileScreen() ? MOBILE_VIDEO_SRC : VIDEO_SRC));

  // 영상이 끝났을 때 · 건너뛰기 (한 번만)
  const handleVideoEnded = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsEnding(true);
    setTimeout(() => {
      onFinish(); // 부모 컴포넌트에 인트로 종료 알림
    }, 500); // 페이드 아웃 효과를 위한 지연 시간
  };
  const endRef = useRef(handleVideoEnded);
  endRef.current = handleVideoEnded;

  // 자동 재생 (소리 끔 · 화면 안 재생을 직접 넣고 재생)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    let alive = true;
    let retry = 0;
    const fallback = () => {
      if (alive && video.paused && !finishedRef.current) setUseFallback(true);
    };
    const tryPlay = () => {
      if (!alive || !video.paused) return;
      const result = video.play();
      if (result && typeof result.catch === 'function') {
        result.catch((error) => {
          if (!alive) return;
          // 기기가 자동 재생을 거부함(저전력 · 데이터 절약 모드 등) → 움직이는 이미지
          if (error?.name === 'NotAllowedError') return fallback();
          // 불러오는 중 잠깐 끊김 → 조금 뒤 다시 재생
          if (retry < MAX_RETRY) {
            retry += 1;
            setTimeout(tryPlay, 300);
          }
        });
      }
    };
    tryPlay();
    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('canplay', tryPlay);
    const startTimer = setTimeout(fallback, START_TIMEOUT); // 끝내 시작을 못 하면
    const onPlaying = () => clearTimeout(startTimer);
    video.addEventListener('playing', onPlaying);
    return () => {
      alive = false;
      clearTimeout(startTimer);
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('playing', onPlaying);
    };
  }, []);

  // 움직이는 이미지로 바꿨을 때: 영상 길이만큼 보여 주고 끝냄
  useEffect(() => {
    if (!useFallback) return undefined;
    const video = videoRef.current;
    video?.pause(); // 뒤에서 늦게 재생되지 않게
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      const seconds = video?.duration;
      const wait = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : FALLBACK_DURATION;
      timer = setTimeout(() => endRef.current(), wait);
    };
    schedule();
    video?.addEventListener('loadedmetadata', schedule); // 길이를 늦게 알게 되면 다시 맞춤
    return () => {
      clearTimeout(timer);
      video?.removeEventListener('loadedmetadata', schedule);
    };
  }, [useFallback]);

  return (
    <div className={`intro-container ${isEnding ? 'fade-out' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline // 모바일(특히 iOS)에서 전체화면으로 빠지는 것 방지
        preload="auto"
        disablePictureInPicture
        controls={false}
        onEnded={handleVideoEnded}
        className={`intro-video${useFallback ? ' is-hidden' : ''}`}
        aria-hidden="true"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {useFallback && (
        <img
          className="intro-video intro-fallback"
          src={FALLBACK_IMAGE}
          alt=""
          aria-hidden="true"
          onError={handleVideoEnded}
        />
      )}

      {/* 건너뛰기 버튼 */}
      <button type="button" className="skip-btn" onClick={handleVideoEnded}>
        <span>Skip Intro</span>
        <svg className="skip-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default Intro;
