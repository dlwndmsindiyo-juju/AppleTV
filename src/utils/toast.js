// src/utils/toast.js
// [추가] 화면 아래 토스트 알림 — 어디서든 showToast("알림을 설정했어요.", { icon: "bell" }) 한 줄로
// - 화면: components/common/AppToast.jsx (App.jsx 에 한 번만 둠) · 모양은 위시리스트 토스트와 같음 (.wish-toast)
// - icon: "bell" · "bell-off" · "star" · "star-off" · "check" (없으면 check)
// - 새 토스트가 오면 이전 것을 바로 바꿔서 보여 줌
export const TOAST_EVENT = "app:toast";

// [추가] 안내 문구로 아이콘 고르기 (계정 설정 · 구독 · 지불 방법 화면의 안내를 공용 토스트로 띄울 때)
// - "…켰어요" → 종 · "…껐어요" → 종 끄기 · 그 밖 → 체크
export const toastIconFor = (text = "") => {
  if (/켰/.test(text)) return "bell";
  if (/껐/.test(text)) return "bell-off";
  return "check";
};

export const showToast = (text, { icon = "check" } = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { text, icon, id: Date.now() } }));
};
