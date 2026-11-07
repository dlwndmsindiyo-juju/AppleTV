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
// - [추가] 영상을 받는 동안: 검은 화면 대신 가운데 Apple TV 로고가 은은하게 빛나는 로딩 (재생되면 사라짐)
// - [수정] 건너뛰기(Skip Intro) 버튼: 글자 body-default-b · ✕ 글자 대신 닫기(X) 아이콘 (구독 팝업 닫기와 같은 아이콘)
const FALLBACK_IMAGE = '/video/intro.webp';
const FALLBACK_DURATION = 5000; // 영상 길이를 모를 때 움직이는 이미지를 보여 줄 시간 (5초)

const Intro = ({ onFinish }) => {
  const videoRef = useRef(null);
  const finishedRef = useRef(false);
  const [isEnding, setIsEnding] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [started, setStarted] = useState(false); // [추가] 영상(또는 움직이는 이미지)이 화면에 나오기 시작했는지

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
    const tryPlay = () => {
      const result = video.play();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          if (alive && video.paused) setUseFallback(true); // 기기가 자동 재생을 막음 → 움직이는 이미지
        });
      }
    };
    tryPlay();
    video.addEventListener('loadeddata', tryPlay, { once: true });
    return () => {
      alive = false;
      video.removeEventListener('loadeddata', tryPlay);
    };
  }, []);

  // 움직이는 이미지로 바꿨을 때: 영상 길이만큼 보여 주고 끝냄
  useEffect(() => {
    if (!useFallback) return undefined;
    const video = videoRef.current;
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
        onPlaying={() => setStarted(true)}
        className={`intro-video${useFallback ? ' is-hidden' : ''}`}
        aria-hidden="true"
      >
        <source src="/video/intro.mp4" type="video/mp4" />
      </video>

      {useFallback && (
        <img
          className="intro-video intro-fallback"
          src={FALLBACK_IMAGE}
          alt=""
          aria-hidden="true"
          onLoad={() => setStarted(true)}
          onError={handleVideoEnded}
        />
      )}

      {/* [추가] 로딩: 영상이 나오기 전까지 로고 */}
      <div className={`intro-loading${started ? ' is-done' : ''}`} aria-hidden="true">
        <img src="/icons/login-logo.svg" alt="" />
      </div>

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
