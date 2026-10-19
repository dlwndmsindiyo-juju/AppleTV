// 스포츠 페이지 공통 유틸

// 유튜브 제목에 섞여 오는 HTML 엔티티(&quot; 등) 해제
export const decodeHtml = (str = "") => {
  const doc = new DOMParser().parseFromString(str, "text/html");
  return doc.documentElement.textContent || "";
};

// 경기가 진행 중인지
export const isLive = (match) =>
  match?.status === "IN_PLAY" || match?.status === "PAUSED";

// 킥오프 시간 라벨: 오늘 21:00 / 내일 04:00 / 10월 22일 21:00
export const formatKickoff = (utcDate) => {
  if (!utcDate) return "";
  const d = new Date(utcDate);
  const now = new Date();
  const time = d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const startOfDay = (x) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);

  if (diffDays === 0) return `오늘 ${time}`;
  if (diffDays === 1) return `내일 ${time}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${time}`;
};

// 스코어 (없으면 null)
export const getScore = (match) => {
  const { home, away } = match?.score?.fullTime || {};
  if (home == null || away == null) return null;
  return { home, away };
};
