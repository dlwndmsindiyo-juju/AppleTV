import React, { useEffect, useMemo, useState } from "react";
import { usePlayableIds, checkPlayable } from "../../utils/youtubePlayable"; // [추가] 연령 제한 · 퍼가기 금지 예고편 빼기
import { useMovieStore } from "../../store/useMovieStore";
import { useSportStore } from "../../store/useSportStore";
import { useHeartStore, wishKey } from "../../store/useHeartStore";
import { openSubscribeGate } from "../../utils/subscribeGate";
import { useAuthStore } from "../../store/useAuthStore";
import { TMDB_IMG } from "../../utils/tmdb";
import { TV_SPORT_BG } from "../../data/tvSportData";
import { TV_REPLAY_MATCHES } from "../../data/tvReplayMatches";
import { TvDetailHero, scrollScreenTop } from "./TvDetailHero";
import { PlayIcon, PlusIcon, InfoIcon, useInterest } from "./TvActions";
import { ReplayCard } from "./TvEndScreen";
import { ottItem, videoItem, matchItem, seriesItem, sportSummary, cleanText } from "./tvDetailItems";
import { CONFERENCES } from "../../data/sportTeams";
import { SPORT_SERIES_DATA } from "../../data/mockSportSeries";
import { conferenceRows, clubOf } from "../sport/standingsUtils";
import TeamBadge from "../sport/TeamBadge";
import TvPlayer from "./TvPlayer";

// [추가] TV 영상 상세 (모든 영상 공용 · 관심구단 화면은 제외) — 스타일: TV.scss (.tv-detail)
// - 위: 상세 타이틀 (TvDetailHero · 시안 15 · 시즌 패스 · 소개)
// - 아래: PC 상세처럼 정보 + 관련 콘텐츠
//   · 스포츠: 하이라이트 · 경기 다시보기
//   · OTT  : 에피소드(시리즈) · 등장인물 · 추천 콘텐츠
// - 아래 카드를 누르면 그 콘텐츠의 상세로 바뀜 · "시청하기" 를 누르면 화면 가득 재생 (TvPlayer)
// - item: tvDetailItems.js 로 만든 항목 · onOpen(item): 다른 상세 열기 · [추가] onBack: 뒤로

const year = (d) => (d ? String(d).slice(0, 4) : "");

// 영상 카드 (관심구단 화면 카드와 같은 모양 · 410 × 231)
const VideoCard = ({ item, onClick }) => (
  <button type="button" className="tv-team-card" onClick={onClick} onFocus={(e) => e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}>
    {item.image && <img className="tv-team-thumb" src={item.image} alt="" loading="lazy" />}
    <span className="tv-team-card-text">
      <strong className="tv-team-card-title">{item.title}</strong>
      {cleanText(item.desc) && <span className="tv-team-card-desc">{cleanText(item.desc)}</span>}
      {item.meta && (
        <span className="tv-team-card-meta">
          <img src="/icons/play-w.svg" alt="" aria-hidden="true" />
          {item.meta}
        </span>
      )}
    </span>
  </button>
);

const Row = ({ title, children }) => (
  <section className="tv-team-row">
    <h2 className="tv-team-row-title tv-detail-row-title">{title}</h2>
    <div className="tv-team-track">{children}</div>
  </section>
);

// ---------------------------------------------------------------------
// [추가] 리그 순위 (MLS 동부 · 서부) — PC 리그 순위와 같은 데이터 (TheSportsDB → 없으면 목업)
// - 처음에는 상위 5팀 · 표를 누르면 전체 15팀 (리모컨으로 고를 수 있게 표 전체가 버튼)
// ---------------------------------------------------------------------
const COLS = [
  ["playedGames", "경기"],
  ["won", "승"],
  ["draw", "무"],
  ["lost", "패"],
  ["points", "승점"],
];

const StandingsTable = ({ conference, standings }) => {
  const [all, setAll] = useState(false);
  const rows = conferenceRows(standings, conference);
  const shown = all ? rows : rows.slice(0, 5);
  if (!rows.length) return null;
  return (
    <button
      type="button"
      className={`tv-detail-standings-card${all ? " is-open" : ""}`}
      aria-expanded={all}
      onClick={() => setAll((v) => !v)}
      onFocus={(e) => e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}
    >
      <span className="tv-detail-standings-head">
        <strong>{CONFERENCES[conference]}</strong>
        <span>{all ? "상위 5팀만 보기" : `전체 ${rows.length}팀 보기`}</span>
      </span>
      <span className="tv-detail-standings-row is-label" aria-hidden="true">
        <span>순위</span>
        <span>구단</span>
        {COLS.map(([k, label]) => (
          <span key={k}>{label}</span>
        ))}
      </span>
      {shown.map((r, i) => {
        const club = clubOf(r);
        return (
          <span key={club.key} className="tv-detail-standings-row">
            <span className="rank">{i + 1}</span>
            <span className="club">
              <TeamBadge src={club.logo} fallback={club.fallback} label={club.name} />
              {club.name}
            </span>
            {COLS.map(([k]) => (
              <span key={k}>{r.row[k] ?? "—"}</span>
            ))}
          </span>
        );
      })}
    </button>
  );
};

// ---------------------------------------------------------------------
// 스포츠 상세
// ---------------------------------------------------------------------
const SportDetail = ({ item, onOpen }) => {
  const [video, setVideo] = useState(item.videoId ? { videoId: item.videoId } : null);
  const [notice, setNotice] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [playing, setPlaying] = useState(null);
  const highlightList = useSportStore((s) => s.highlightList);
  const fetchHighlightList = useSportStore((s) => s.onFetchHighlightList);
  const standings = useSportStore((s) => s.standings);
  const fetchStandings = useSportStore((s) => s.onFetchStandings);
  const { saved, toggle } = useInterest(video?.videoId || item.key, {
    videoId: video?.videoId || item.videoId || null,
    title: item.title,
    image: video?.image || item.image,
    label: item.label,
    prefix: item.prefix,
    desc: video?.desc || item.desc,
  });

  useEffect(() => {
    fetchHighlightList();
    fetchStandings();
  }, [fetchHighlightList, fetchStandings]);

  // 영상이 정해지지 않은 항목(경기)은 들어오자마자 찾아 둠
  useEffect(() => {
    let dead = false;
    setInfoOpen(false);
    setNotice("");
    setVideo(item.videoId ? { videoId: item.videoId } : null);
    if (!item.videoId && item.resolve) {
      item.resolve().then((v) => !dead && setVideo(v));
    }
    return () => {
      dead = true;
    };
  }, [item]);

  // [수정] 줄거리: YouTube 설명 대신 경기 한 줄 요약 (링크 · undefined 가 보이던 문제)
  const desc = sportSummary(item);
  const related = useMemo(
    () =>
      (highlightList || [])
        .filter((v) => v?.id?.videoId && v.id.videoId !== video?.videoId)
        .slice(0, 12)
        .map((v) => ({ ...videoItem(v), meta: "하이라이트" })),
    [highlightList, video]
  );

  const watch = () => {
    // 로그인 전: 웹과 같은 구독 안내 팝업 (상세 페이지는 누구나 볼 수 있음)
    if (!useAuthStore.getState().user) {
      openSubscribeGate("watch");
      return;
    }
    if (!video?.videoId) {
      setNotice(item.resolve ? "영상을 찾는 중이거나 이 경기 영상을 찾지 못했어요." : "재생할 영상이 없어요.");
      return;
    }
    setPlaying({
      id: video.videoId,
      title: item.title,
      image: video.image || item.image,
      label: item.label,
      prefix: item.prefix,
      desc,
    });
  };

  const actions = [
    { key: "watch", label: "시청하기", onClick: watch, icon: <PlayIcon /> },
    { key: "interest", label: "관심 경기", onClick: toggle, pressed: saved, icon: <PlusIcon on={saved} /> },
    { key: "info", label: "경기 정보", onClick: () => setInfoOpen((v) => !v), pressed: infoOpen, icon: <InfoIcon /> },
  ];

  return (
    <>
      <TvDetailHero
        title={item.title}
        subtitle={`${item.prefix || "MLS"} · ${item.label || "경기 하이라이트"}`}
        desc={desc}
        bg={TV_SPORT_BG}
        actions={actions}
        focusOn={item.key}
        notice={notice}
        info={
          infoOpen && (
            <>
              <strong>{item.title}</strong>
              <p>{desc}</p>
            </>
          )
        }
      />

      <div className="tv-detail-body">
        {related.length > 0 && (
          <Row title="하이라이트">
            {related.map((r) => (
              <VideoCard key={r.key} item={r} onClick={() => onOpen(r)} />
            ))}
          </Row>
        )}
        <Row title="경기 다시보기">
          {TV_REPLAY_MATCHES.map((m) => (
            <ReplayCard
              key={m.id}
              match={m}
              onPlay={() => onOpen(matchItem({ id: m.id, homeId: m.homeId, awayId: m.awayId, title: `${m.home} vs. ${m.away}` }))}
            />
          ))}
        </Row>

        {/* [추가] 리그 순위 (동부 · 서부 컨퍼런스) */}
        {standings.length > 0 && (
          <section className="tv-team-row">
            <h2 className="tv-team-row-title tv-detail-row-title">리그 순위</h2>
            <div className="tv-detail-standings">
              <StandingsTable conference="east" standings={standings} />
              <StandingsTable conference="west" standings={standings} />
            </div>
          </section>
        )}

        {/* [추가] 추천 시리즈 (PC 스포츠 홈과 같은 데이터) */}
        <Row title="추천 시리즈">
          {SPORT_SERIES_DATA.map((s) => {
            const next = seriesItem(s);
            return <VideoCard key={next.key} item={{ ...next, meta: next.label }} onClick={() => onOpen(next)} />;
          })}
        </Row>
      </div>

      <TvPlayer video={playing} related={related.map((r) => ({ ...r, id: r.videoId }))} onClose={() => setPlaying(null)} />
    </>
  );
};

// ---------------------------------------------------------------------
// OTT 상세 (영화 · 시리즈)
// ---------------------------------------------------------------------
const OttDetail = ({ item, onOpen }) => {
  const key = `${item.type}_${item.id}`;
  const detail = useMovieStore((s) => s.contentDetails[key]);
  const fetchDetail = useMovieStore((s) => s.onFetchContentDetail);
  const episodesAll = useMovieStore((s) => s.episodes);
  const fetchEpisode = useMovieStore((s) => s.onFetchEpisode);
  const wished = useHeartStore((s) => Boolean(s.items[wishKey(item.type, item.id)]));
  const [infoOpen, setInfoOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    fetchDetail(item.type, item.id);
    setInfoOpen(false);
    setNotice("");
  }, [fetchDetail, item.type, item.id]);

  // 시리즈: 첫 시즌 에피소드
  const season = item.type === "tv" ? (detail?.seasons || []).find((s) => s.season_number >= 1) : null;
  useEffect(() => {
    if (season) fetchEpisode(item.id, season.season_number)?.catch?.(() => {});
  }, [fetchEpisode, item.id, season?.season_number]); // eslint-disable-line react-hooks/exhaustive-deps
  const episodes = season ? episodesAll[`${item.id}_${season.season_number}`] || [] : [];

  const typeLabel = item.type === "tv" ? "시리즈" : "영화";
  const genres = (detail?.genres || []).map((g) => g.name);
  const subtitle = [typeLabel, ...genres.slice(0, 2), year(detail?.release_date || detail?.first_air_date)].filter(Boolean).join(" · ");
  const bg = detail?.backdrop_path ? `${TMDB_IMG}/original${detail.backdrop_path}` : item.image;
  const cast = (detail?.credits?.cast || []).filter((c) => c.profile_path).slice(0, 15);
  const similar = (detail?.similar?.results || []).filter((r) => r.backdrop_path || r.poster_path).slice(0, 12);

  // 예고편 (YouTube · 한국어 → 영어)
  // [수정] 재생할 수 있는 영상 중에서 예고편 고르기 (연령 제한 · 퍼가기 금지 빼기)
  const ytAll = useMemo(() => (detail?.videos?.results || []).filter((v) => v.site === "YouTube"), [detail]);
  const playableKeys = usePlayableIds(ytAll.map((v) => v.key));
  const trailer = useMemo(() => {
    const yt = ytAll.filter((v) => playableKeys.has(v.key));
    return yt.find((v) => v.type === "Trailer") || yt.find((v) => v.type === "Teaser") || yt[0] || null;
  }, [ytAll, playableKeys]);

  const watch = () => {
    if (!useAuthStore.getState().user) {
      openSubscribeGate("watch");
      return;
    }
    if (!trailer) {
      setNotice("재생할 영상이 없어요.");
      return;
    }
    setPlaying({ id: trailer.key, title: item.title, image: bg, prefix: typeLabel, label: "예고편", desc: detail?.overview });
  };

  // [추가] 끝 화면 자동 재생 (계정 설정 "추천 항목 재생"): 추천 콘텐츠 중 아직 안 본 작품의 예고편
  const nextTrailer = async (current, played) => {
    for (const r of similar.slice(0, 5)) {
      await fetchDetail(item.type, r.id);
      const d = useMovieStore.getState().contentDetails[`${item.type}_${r.id}`];
      const ytRaw = (d?.videos?.results || []).filter((v) => v.site === "YouTube");
      const ok = await checkPlayable(ytRaw.map((x) => x.key)); // [추가] 재생 가능한 예고편만
      const yt = ytRaw.filter((x) => ok.has(x.key));
      const v = yt.find((x) => x.type === "Trailer") || yt.find((x) => x.type === "Teaser") || yt[0];
      if (v && v.key !== current.id && !played.includes(v.key)) {
        const next = ottItem(r, item.type);
        return {
          id: v.key,
          title: next.title,
          image: r.backdrop_path ? `${TMDB_IMG}/w780${r.backdrop_path}` : next.image,
          prefix: typeLabel,
          label: "예고편",
          desc: d?.overview,
        };
      }
    }
    return null;
  };

  // 관심 콘텐츠 = 위시리스트 (웹과 같은 목록 · 로그인 전에는 로그인 안내)
  const toggleWish = () => {
    const st = useHeartStore.getState();
    if (!st.uid) {
      openSubscribeGate("account");
      return;
    }
    const k = wishKey(item.type, item.id);
    if (st.items[k]) st.onRemove(k);
    else st.onAdd({ ...(detail || {}), id: item.id, type: item.type, title: item.title }, { silent: true });
  };

  const actions = [
    { key: "watch", label: "시청하기", onClick: watch, icon: <PlayIcon /> },
    { key: "interest", label: "관심 콘텐츠", onClick: toggleWish, pressed: wished, icon: <PlusIcon on={wished} /> },
    { key: "info", label: "작품 정보", onClick: () => setInfoOpen((v) => !v), pressed: infoOpen, icon: <InfoIcon /> },
  ];

  const infoRows = [
    ["장르", genres.join(", ")],
    [item.type === "tv" ? "첫 방영" : "개봉", detail?.release_date || detail?.first_air_date],
    item.type === "tv" ? ["시즌", detail?.number_of_seasons ? `${detail.number_of_seasons}개 시즌` : ""] : ["러닝타임", detail?.runtime ? `${detail.runtime}분` : ""],
    ["평점", detail?.vote_average ? `★ ${(detail.vote_average / 2).toFixed(1)} / 5` : ""], // [수정] 10점 → 5점 만점
    ["출연", cast.slice(0, 3).map((c) => c.name).join(", ")],
  ].filter(([, v]) => v);

  return (
    <>
      <TvDetailHero
        title={item.title}
        subtitle={subtitle}
        desc={detail?.overview}
        bg={bg}
        actions={actions}
        focusOn={item.key}
        notice={notice}
        info={
          infoOpen && (
            <>
              <strong>{item.title}</strong>
              <dl>
                {infoRows.map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </>
          )
        }
      />

      <div className="tv-detail-body">
        {episodes.length > 0 && (
          <Row title={`에피소드 · ${season?.name || "시즌 1"}`}>
            {episodes.slice(0, 20).map((ep) => (
              <VideoCard
                key={ep.id}
                item={{
                  title: `${ep.episode_number}화 · ${ep.name}`,
                  desc: ep.overview,
                  image: ep.still_path ? `${TMDB_IMG}/w780${ep.still_path}` : bg,
                  meta: ep.runtime ? `${ep.runtime}분` : "",
                }}
                onClick={watch}
              />
            ))}
          </Row>
        )}

        {cast.length > 0 && (
          <Row title="등장인물">
            {cast.map((c) => (
              <div key={c.credit_id || c.id} className="tv-detail-cast">
                <img src={`${TMDB_IMG}/w300${c.profile_path}`} alt="" loading="lazy" />
                <strong>{c.name}</strong>
                {c.character && <span>{c.character}</span>}
              </div>
            ))}
          </Row>
        )}

        {similar.length > 0 && (
          <Row title="추천 콘텐츠">
            {similar.map((r) => {
              const next = ottItem(r, item.type);
              return <VideoCard key={next.key} item={{ ...next, image: r.backdrop_path ? `${TMDB_IMG}/w780${r.backdrop_path}` : next.image }} onClick={() => onOpen(next)} />;
            })}
          </Row>
        )}
      </div>

      <TvPlayer video={playing} onClose={() => setPlaying(null)} getNext={nextTrailer} />
    </>
  );
};

// [추가] onBack: "← 뒤로" (화면 왼쪽 위 · 히어로 버튼에서 ↑ 로도 갈 수 있음) — 이전 상세 또는 보던 화면으로 (TvPreview)
export const TvDetail = ({ item, onOpen, onBack }) => (
  <main className="tv-screen tv-detail">
    {onBack && (
      <button type="button" className="tv-detail-back" onClick={onBack} onFocus={scrollScreenTop}>
        <span className="tv-detail-back-icon" aria-hidden="true" />
        뒤로
      </button>
    )}
    {item.kind === "ott" ? <OttDetail item={item} onOpen={onOpen} /> : <SportDetail item={item} onOpen={onOpen} />}
  </main>
);

export default TvDetail;

