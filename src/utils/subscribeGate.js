// 로그인 전 안내 팝업 열기 (components/layout/SubscribeGate.jsx 가 받음)
// - reason: "watch"(구독 · 재생) | "account"(로그인 · 계정에 저장하는 기능)
// - [정리] 여러 파일에 똑같이 있던 window.dispatchEvent(...) 를 한 곳으로 모음
export const openSubscribeGate = (reason = "watch") =>
  window.dispatchEvent(new CustomEvent("subscribe-gate:open", { detail: { reason } }));
