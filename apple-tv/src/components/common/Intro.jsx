import React, { useState, useRef } from 'react';
import './Intro.scss'; // 스타일 파일

const Intro = ({ onFinish }) => {
  const videoRef = useRef(null);
  const [isEnding, setIsEnding] = useState(false);

  // 영상 재생이 끝났을 때 실행
  const handleVideoEnded = () => {
    setIsEnding(true);
    setTimeout(() => {
      onFinish(); // 부모 컴포넌트에 인트로 종료 알림
    }, 500); // 페이드 아웃 효과를 위한 지연 시간 (선택 사항)
  };

  return (
    <div className={`intro-container ${isEnding ? 'fade-out' : ''}`}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline // 모바일(특히 iOS)에서 전체화면으로 빠지는 것 방지
        onEnded={handleVideoEnded}
        className="intro-video"
      >
        <source src="/video/intro.mp4" type="video/mp4" />
        브라우저가 비디오 태그를 지원하지 않습니다.
      </video>

      {/* 건너뛰기 버튼 */}
      <button className="skip-btn" onClick={handleVideoEnded}>
        Skip Intro ✕
      </button>
    </div>
  );
};

export default Intro;