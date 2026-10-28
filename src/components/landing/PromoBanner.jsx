import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useSportStore } from "../../store/useSportStore";
import { SPORT_TEAMS } from "../../data/sportTeams";
import { isLive, getScore, formatKickoff } from "../sport/sportUtils";
import { getPresentationMatch, isSampleMatch } from "../sport/sportPresentation";

// 스포츠 화면 경로 / 경기 시청 경로 (라우터와 맞춰 주세요)
const SPORT_PATH = "/sport";
const watchPath = (match) => `${SPORT_PATH}/match/${match.id}`;

// 영문 구단명 → 한글 짧은 이름 (data/sportTeams.js), 없으면 원래 이름
const teamLabel = (team) => {
  if (!team) return "";
  const found = SPORT_TEAMS.find(
    (t) => t.enName === team.name || t.enName === team.shortName
  );
  return found?.shortName || team.shortName || team.name;
};

// 진행 시간 라벨: 전반 32분 / 후반 87분 / 하프타임
const liveTimeLabel = (match) => {
  if (match.status === "PAUSED") return "하프타임";
  const minute = match.minute;
  if (!minute) return "";
  return `${Number(minute) > 45 ? "후반" : "전반"} ${minute}분`;
};

// 하단 고정 배너
// - 로그인 전: TV / 스포츠 모두 무료 체험 프로모션
// - 로그인(구독) 후: TV 는 배너 없음, 스포츠는 LIVE 경기 배너 (같은 크기)
// - 첫 스크롤이 발생하면 아래에서 올라오며 나타남
const PromoBanner = () => {
  const user = useAuthStore((state) => state.user);
  const liveMatches = useSportStore((state) => state.liveMatches);
  const onFetchLiveMatches = useSportStore((state) => state.onFetchLiveMatches);
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const isSport = pathname.startsWith(SPORT_PATH);
  const isHome = pathname === "/";

  // 로그인 후 스포츠 화면: 라이브 경기 불러오기 (1분마다 갱신)
  useEffect(() => {
    if (!user || !isSport) return;
    onFetchLiveMatches();
    const timer = setInterval(onFetchLiveMatches, 60 * 1000);
    return () => clearInterval(timer);
  }, [user, isSport, onFetchLiveMatches]);

  // 스포츠 히어로와 같은 "대표 경기" (sportPresentation.js)
  // 진행 중 경기 → 없으면 샘플 경기(내슈빌 3 : 3 토론토)
  const nextMatch = getPresentationMatch(liveMatches);
  const isFallback = isSampleMatch(nextMatch);

  // 어떤 배너를 보여줄지: promo | live | null
  // - 로그인 전: TV 홈(/) · 스포츠(/sport…) 에서 프로모션
  // - 로그인 후: 스포츠에서만 LIVE (경기 정보가 없으면 기본 경기로 표시)
  let mode = null;
  if (!user && (isHome || isSport)) mode = "promo";
  else if (user && isSport) mode = "live";

  // 기본 경기로 표시 중인지 콘솔에서 확인
  useEffect(() => {
    if (mode === "live" && isFallback) {
      console.info("[PromoBanner] 진행 중 경기가 없어 샘플 경기(내슈빌 vs 토론토)로 표시 중");
    }
  }, [mode, isFallback]);

  // 첫 스크롤 감지 (한 번 나타나면 계속 유지)
  useEffect(() => {
    if (!mode) return;

    const onScroll = () => {
      if (window.scrollY > 0) {
        setScrolled(true);
        window.removeEventListener("scroll", onScroll);
      }
    };

    onScroll(); // 새로고침으로 이미 스크롤된 상태일 때 대비
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode]);

  // 배너가 푸터 문구를 가리지 않도록 body 에 표시
  useEffect(() => {
    const visible = Boolean(mode) && scrolled;
    document.body.classList.toggle("has-promo-banner", visible);
    return () => document.body.classList.remove("has-promo-banner");
  }, [mode, scrolled]);

  if (!mode) return null;

  const tabIndex = scrolled ? 0 : -1;

  // .page-fade 의 transform 때문에 fixed 가 화면 기준이 되지 않으므로
  // document.body 에 직접 그려서 항상 화면 하단에 고정
  return createPortal(
    <aside
      className={`promo-banner${mode === "live" ? " is-live" : ""}${scrolled ? " show" : ""}`}
      aria-hidden={!scrolled}
      data-fallback={mode === "live" && isFallback ? "true" : undefined}
    >
      <div className="inner promo-banner-inner">
        {mode === "promo" ? (
          <>
            {/* ===== 로그인 전: 무료 체험 프로모션 ===== */}
            <div className="promo-banner-text">
              <strong className="promo-banner-title">
                Apple TV를 1주일 무료로 즐기세요.
              </strong>
              <p className="promo-banner-desc">
                수백 편의 단독 공개 시리즈와 영화를 즐겨보세요. 매주 새로운 작품이
                찾아옵니다.
              </p>
            </div>

            <div className="promo-banner-action">
              <Link
                to="/login"
                state={{ from: pathname, intent: "subscribe" }}
                className="promo-banner-btn"
                tabIndex={tabIndex}
              >
                무료 체험 수락
              </Link>
              <p className="promo-banner-note">
                7일 무료 체험 후 월 ₩6,500입니다.
                <br />
                약관이 적용됩니다.
              </p>
            </div>
          </>
        ) : (
          <LiveContent match={nextMatch} tabIndex={tabIndex} />
        )}
      </div>
    </aside>,
    document.body
  );
};

// ===== 로그인 후 스포츠: LIVE 경기 배너 =====
const LiveContent = ({ match, tabIndex }) => {
  const live = isLive(match);
  const score = getScore(match);
  const home = teamLabel(match.homeTeam);
  const away = teamLabel(match.awayTeam);

  const meta = live
    ? [liveTimeLabel(match), "진행 중"].filter(Boolean)
    : [formatKickoff(match.utcDate), "킥오프 예정"];

  return (
    <>
      <div className="promo-banner-text">
        <strong className="promo-banner-title live-title">
          {live ? (
            <span className="live-badge">
              <span className="live-dot" aria-hidden="true" />
              LIVE
            </span>
          ) : (
            <span className="live-badge upcoming">NEXT</span>
          )}
          <span className="live-team">{home}</span>
          <span className="live-score">
            {score ? `${score.home} : ${score.away}` : "vs"}
          </span>
          <span className="live-team">{away}</span>
        </strong>
        <p className="promo-banner-desc">
          응원하는 팀의 실시간 라이브를 한눈에 확인하고 바로 만나보세요.
        </p>
      </div>

      <div className="promo-banner-action">
        <Link to={watchPath(match)} className="promo-banner-btn" tabIndex={tabIndex}>
          <img className="play-icon" src="/icons/play-w.svg" alt="" aria-hidden="true" />
          {live ? "경기 시청" : "경기 보기"}
        </Link>
        <p className="promo-banner-note">
          {meta.map((text, i) => (
            <React.Fragment key={text}>
              {i > 0 && <span className="dot-sep">·</span>}
              {text}
            </React.Fragment>
          ))}
        </p>
      </div>
    </>
  );
};

export default PromoBanner;
