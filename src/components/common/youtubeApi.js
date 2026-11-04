// YouTube IFrame Player API 불러오기 (재생 위치 · 영상 끝 등을 알기 위해 사용)
// - 스크립트는 페이지에서 한 번만 불러오고, 여러 플레이어가 같이 씀
// - [정리] WatchPlayer.jsx · HeroSection.jsx 에 따로 있던 같은 코드를 한 곳으로 모음
let apiPromise = null;

export const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        apiPromise = null;
        reject(new Error("YouTube API 를 불러오지 못했습니다."));
      };
      document.head.appendChild(script);
    }
  });
  return apiPromise;
};
