// src/utils/aiReturn.js
// [추가] 웹: AI 추천 결과에서 작품 상세로 갔다가 뒤로 오면 → 보던 추천 결과 그대로 팝업 다시 열기
// - 상세로 가기 직전에 팝업 상태(취향 · 결과 · 고른 작품)를 저장 → 그 페이지로 "뒤로" 돌아오면 AiAssistantLink 가 꺼내서 엶
// - 탭을 닫으면 지워짐 (sessionStorage) · 한 번 쓰면 지움
const KEY = "ai-return-v1";

export const saveAiReturn = (path, snapshot) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ path, snapshot }));
  } catch {
    // 저장 못 하면 돌아왔을 때 팝업만 안 열림
  }
};

export const peekAiReturn = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};

export const clearAiReturn = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
};
