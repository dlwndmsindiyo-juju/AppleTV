// [추가] 로그인 · 구독을 마치면 하던 일로 돌아오기
// - 로그인 전 · 구독 전에 막힌 동작(예: AI 추천 팝업에서 취향 칩 선택)을 잠시 기억해 둠 (sessionStorage · 이 탭에서만)
// - 로그인 → 구독까지 끝나면 그 화면(path)으로 돌아오고, AI 추천 팝업이면 고르려던 칩을 골라 둔 채 다시 열림
//   · 저장: AiAssistantPopup (취향 칩) / 사용: AiAssistantLink (그 화면에 다시 오면 팝업 열기)
// - 30분이 지나면 버림 (오래된 기록으로 갑자기 팝업이 뜨지 않게)
const KEY = "apple-tv-resume-intent";
const MAX_AGE = 30 * 60 * 1000;

export const saveResumeIntent = (intent) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...intent, at: Date.now() }));
  } catch {
    // 저장이 안 되는 브라우저: 하던 일 복귀만 빠짐
  }
};

export const peekResumeIntent = () => {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (!value || Date.now() - value.at > MAX_AGE) return null;
    return value;
  } catch {
    return null;
  }
};

export const clearResumeIntent = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
};

// 돌아갈 화면 주소 (없으면 null)
// - 돌아가면 기록을 지움 · 단 AI 칩 기록은 그 화면의 AiAssistantLink 가 팝업을 열면서 지움
export const resumePath = () => {
  const intent = peekResumeIntent();
  if (!intent) return null;
  if (!intent.ai) clearResumeIntent();
  return intent.path || null;
};
