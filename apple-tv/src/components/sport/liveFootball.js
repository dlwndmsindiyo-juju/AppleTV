// 검색 결과만으로는 실제 경기 중계 여부를 알 수 없어 videos API 메타데이터도 확인합니다.
export const isLiveFootballVideo = (video) => {
  const snippet = video?.snippet;
  const stream = video?.liveStreamingDetails;
  const topics = video?.topicDetails?.topicCategories || [];
  const title = snippet?.title || "";
  const football = topics.some((topic) => /\/Association_football\/?$/i.test(topic));
  const match = /\bvs\b|\bv\b\.?|\bversus\b|대\s|경기\s*(?:중계|생중계)|축구\s*생중계/i.test(title);
  const otherContent = /watch\s*along|reaction|podcast|talk\s*show|highlights?|replay|simulation|gameplay|\bfifa\b|\bfc\s*2\d\b|efootball|\bnfl\b|american football|중계석|입중계|토크|분석|하이라이트|다시보기|시뮬레이션|피파|풋볼매니저/i.test(title);

  return Boolean(video?.id?.videoId && snippet?.liveBroadcastContent === "live" &&
    snippet?.categoryId === "17" && stream?.actualStartTime && !stream.actualEndTime &&
    football && match && !otherContent);
};
