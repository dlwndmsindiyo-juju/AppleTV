// src/utils/share.js
// [추가] 공유 팝업 열기 — 어디서든 openShare({ title, url }) 한 줄로 (팝업: components/common/ShareSheet.jsx · App.jsx 에 한 번만 둠)
// - url 을 비우면 지금 보고 있는 페이지 주소
export const SHARE_EVENT = "app:share";

export const openShare = ({ title = document.title, url } = {}) => {
  window.dispatchEvent(new CustomEvent(SHARE_EVENT, { detail: { title, url: url || window.location.href } }));
};
