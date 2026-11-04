import React, { useEffect, useRef, useState } from "react";
import VideoPopup from "../common/VideoPopup";
import { loadYouTubeApi } from "../common/youtubeApi";
import { useSportStore } from "../../store/useSportStore";
import { getTeamById } from "../../data/sportTeams";
import { ytThumb, decodeHtml } from "../sport/sportUtils";
import TvEndScreen from "./TvEndScreen";

// [추가] TV 영상 재생 — 카드를 누르면 그 영상을 화면 가득 바로 재생
// - 웹과 같은 전체 화면 팝업(VideoPopup) · 왼쪽 위 "← 뒤로" · Esc · 브라우저 뒤로가기로 닫기
// - 리모컨: 열리면 "← 뒤로" 버튼에 포커스 (Enter 로 닫기) · 닫으면 누른 카드로 포커스 되돌림
// - [추가] 영상을 끝까지 보면 끝 화면(TvEndScreen · 시안 "처음부터 보기")
//   · 시청하기: 처음부터 다시 · 관심 경기: 담기 / 빼기 · 경기정보: 영상 설명
//   · 경기 다시보기 카드: 그 경기 하이라이트를 찾아 재생 · 하이라이트 카드: 그 영상 재생
//   · 끝 화면에서는 "← 뒤로" 버튼을 숨김 (Esc · 브라우저 뒤로가기로 닫기)
// - YouTube API 를 못 불러오면 일반 영상으로 재생 (끝 화면 없이)
// video: { id, title, image, label, desc, meta } · related: 같은 모양 배열 (끝 화면 하이라이트 줄)
const TvPlayer = ({ video, related = [], onClose }) => {
  const [current, setCurrent] = useState(video);
  const [ended, setEnded] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [notice, setNotice] = useState("");
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const lastFocus = useRef(null);
  const open = Boolean(video?.id);
  const fetchHighlights = useSportStore((s) => s.onFetchHighlights);

  // 새 영상으로 열릴 때
  useEffect(() => {
    setCurrent(video);
    setEnded(false);
    setNotice("");
  }, [video]);

  // 열고 닫을 때: 포커스 저장 · "← 뒤로" 에 포커스 · 닫으면 누른 카드로
  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const t = setTimeout(() => document.querySelector(".video-popup .video-back-btn")?.focus(), 0);
    return () => {
      clearTimeout(t);
      lastFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  // YouTube 플레이어 (영상이 끝난 것을 알기 위해 API 사용)
  useEffect(() => {
    if (!open || fallback) return undefined;
    let dead = false;
    const host = hostRef.current;
    loadYouTubeApi()
      .then((YT) => {
        if (dead || !host) return;
        const el = document.createElement("div");
        host.appendChild(el);
        playerRef.current = new YT.Player(el, {
          videoId: video.id,
          playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
          events: {
            onReady: (e) => e.target.playVideo(),
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) setEnded(true);
            },
          },
        });
      })
      .catch(() => !dead && setFallback(true));
    return () => {
      dead = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
      if (host) host.innerHTML = "";
    };
  }, [open, video?.id, fallback]);

  // 끝 화면 ↔ 재생: 다시 재생하면 "← 뒤로" 로 포커스
  useEffect(() => {
    if (open && !ended) document.querySelector(".video-popup .video-back-btn")?.focus();
  }, [ended, open]);

  // 다른 영상 재생 (같은 플레이어에서)
  const play = (next) => {
    setCurrent(next);
    setEnded(false);
    setNotice("");
    playerRef.current?.loadVideoById?.(next.id);
  };

  const replay = () => {
    setEnded(false);
    playerRef.current?.seekTo?.(0, true);
    playerRef.current?.playVideo?.();
  };

  // 경기 다시보기 카드: "홈 vs 원정 하이라이트" 영상을 찾아 재생
  const playMatch = async (match) => {
    const home = getTeamById(match.homeId);
    const away = getTeamById(match.awayId);
    const key = match.id;
    setNotice("");
    await fetchHighlights(key, `${home?.enName || match.home} vs ${away?.enName || match.away}`);
    const found = (useSportStore.getState().highlights[key] || []).find((v) => v?.id?.videoId);
    if (!found) {
      setNotice("이 경기 영상을 찾지 못했어요.");
      return;
    }
    play({
      id: found.id.videoId,
      title: `${home?.shortName || match.home} vs. ${away?.shortName || match.away}`,
      image: ytThumb(found),
      label: "경기 하이라이트",
      desc: decodeHtml(found.snippet?.description),
    });
  };

  return (
    <VideoPopup
      open={open}
      onClose={onClose}
      label={current?.title || "영상"}
      className={`tv-video-popup${ended ? " is-ended" : ""}`}
    >
      {fallback ? (
        open && (
          <iframe
            src={`https://www.youtube.com/embed/${current.id}?autoplay=1&rel=0&playsinline=1`}
            title={current.title || "영상"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )
      ) : (
        <div className="tv-player-host" ref={hostRef} />
      )}

      {ended && current && (
        <TvEndScreen
          video={current}
          related={related}
          onReplay={replay}
          onPlay={play}
          onPlayMatch={playMatch}
          notice={notice}
        />
      )}
    </VideoPopup>
  );
};

export default TvPlayer;
