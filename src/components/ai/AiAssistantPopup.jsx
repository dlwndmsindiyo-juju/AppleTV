import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { resolveContentDetail } from "./resolveContentDetail";
import { DURATIONS, GENRES, MOODS, getContentRecommendations } from "./aiRecommendations";
import checkIcon from "./assets/check.svg";
import AiLogo from "./AiLogo"; // [수정] AI 아이콘 공용 
import selectionCheckIcon from "./assets/selection-check.svg";
import selectionArrowIcon from "./assets/selection-arrow.svg";
import resetIcon from "./assets/reset.svg";
import plusIcon from "./assets/plus.svg";
import removeIcon from "./assets/remove.svg";
import "./AiAssistantPopup.scss";
import { useAuthStore, isSubscribed } from "../../store/useAuthStore"; // [추가] 구독 전에는 취향을 고르면 구독 안내 팝업
import { openSubscribeGate } from "../../utils/subscribeGate";
import { saveResumeIntent } from "../../utils/resumeIntent"; // [추가] 로그인 · 구독 후 고르려던 칩으로 돌아오기
import { saveAiReturn } from "../../utils/aiReturn"; // [추가] 웹: 상세에서 뒤로 오면 보던 추천 결과로
import { findNext } from "../tv/tvFocus"; // [추가] TV: 방향키로 팝업 안 버튼 이동

const emptyPreferences = (taste) => ({
  genres: [],
  // [수정] 홍보 배너 기분 칩(힘든 · 슬픈 · 즐거운 · 화난)도 팝업 분위기로 이어줌
  mood: ({
    "편안한 힐링": "편안한 힐링", "몰입감 있는": "몰입감 있는", "가볍게 웃는": "가볍게 웃고 싶어요",
    "힘든": "편안한 힐링", "슬픈": "따뜻한 감동", "즐거운": "가볍게 웃고 싶어요", "화난": "긴장감 넘치는",
  })[taste] || "",
  duration: "",
});

const optionLabels = { "가볍게 웃고 싶어요": "가볍게 웃기", "따뜻한 감동": "따뜻한 갈등", "상관없어요": "상관없음" };

function PreferenceGroup({ title, description, options, selected, onSelect, columns }) {
  return (
    <fieldset className={`ai-popup-group ai-popup-group--${columns}`}>
      <legend className="ai-popup-sr-only">{title}</legend>
      <div className="ai-popup-question">
        <div><h3>{title}</h3><p>{description}</p></div>
      </div>
      <div className="ai-popup-options">
        {options.map((option) => {
          const active = selected.includes(option);
          return <button key={option} type="button" aria-pressed={active} className={`ai-popup-chip${active ? " is-selected" : ""}`} onClick={() => onSelect(option)}>
            {active && <img src={selectionCheckIcon} alt="" />}{optionLabels[option] || option}
          </button>;
        })}
      </div>
    </fieldset>
  );
}

const resolvedDetails = new Map();

function ResultLink({ item, children, onOpen, busy, disabled, className = "", ...props }) {
  return <button type="button" className={`ai-popup-detail-link ${className}`} onClick={() => onOpen(item)} aria-busy={busy || undefined} disabled={disabled} {...props}>{children}</button>;
}

// onRecommend: (preferences, { signal, page }) => Promise<작품[]>
// 작품: { id, title, genre, overview, poster, detailPath?, appleUrl?, exactMatch?, relaxations? }
// [추가] requireSubscription: 구독 전(로그인 전 포함) 계정이 취향 버튼을 누르면 이 팝업을 닫고 "구독 후 이용해주세요." 팝업
//   · 로그인 전: [계정 만들기] → 로그인 화면 / 로그인했지만 구독 전: [구독하기] → 구독 팝업 (components/layout/SubscribeGate.jsx)
// [추가] resumePick: { step, value } — 로그인 · 구독 전에 고르려던 칩 (열리면 그 단계에서 그 칩을 골라 둔 상태)
// [추가] tv: TV 화면용 — 결과 카드 전체가 하나의 버튼(+ 없음) · 방향키로 이동 · Enter(리모컨 확인)로 상세
// [추가] onOpenDetail(r, snapshot): 있으면 웹 주소로 이동하지 않고 이 함수로 상세를 엶 (TV) · r = { type, id, title, detail }
// [추가] restoreState: 상세에서 뒤로 왔을 때 보던 추천 결과 그대로 (snapshot) — 고른 작품 카드에 포커스
export default function AiAssistantPopup({ initialTaste, onClose, onRecommend, requireSubscription = false, resumePick = null, tv = false, onOpenDetail = null, restoreState = null }) {
  const gateUser = useAuthStore((s) => s.user);
  const blocked = requireSubscription && !isSubscribed(gateUser);
  // stepIndex: 몇 번째 단계의 칩인지 (돌아왔을 때 같은 단계에서 다시 시작)
  const guard = (fn, stepIndex) => (...args) => {
    if (!blocked) return fn(...args);
    saveResumeIntent({
      path: `${window.location.pathname}${window.location.search}`,
      ai: { step: stepIndex, value: args[0] },
    });
    onClose();
    openSubscribeGate(gateUser ? "watch" : "ai");
    return undefined;
  };
  const dialogRef = useRef(null);
  const navigate = useNavigate();
  const detailRequestRef = useRef(null);
  const [openingId, setOpeningId] = useState(null);
  const headingRef = useRef(null);
  const requestRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const rs = restoreState; // [추가] 뒤로 왔을 때 보던 결과
  const [preferences, setPreferences] = useState(() => rs?.preferences || emptyPreferences(initialTaste));
  const [screen, setScreen] = useState(rs ? "results" : "preferences");
  const [step, setStep] = useState(0);
  const [results, setResults] = useState(() => rs?.results || []);
  const [marked, setMarked] = useState(() => rs?.marked || []);
  const [page, setPage] = useState(rs?.page || 0);
  const [hasMore, setHasMore] = useState(Boolean(rs?.hasMore));
  const [expanded, setExpanded] = useState(Boolean(rs?.expanded));
  const [total, setTotal] = useState(rs?.total || 0);
  const [exactTotal, setExactTotal] = useState(rs?.exactTotal || 0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const complete = preferences.genres.length > 0 && preferences.duration;
  const stepValid = [preferences.genres.length > 0, true, Boolean(preferences.duration)][step];
  // [추가] 취향 선택 진행 바: 이번 단계에서 고르면 그 단계 끝까지 늘어남 (고르기 전에는 조금만)
  const stepPicked = [preferences.genres.length > 0, Boolean(preferences.mood), Boolean(preferences.duration)][step];
  const progressRatio = (step + (stepPicked ? 1 : 0.35)) / 3;
  const stepLabels = ["장르 선택", "분위기 선택", "시청 시간 선택"];
  const groups = [
    { title: "어떤 장르가 좋아요?", description: "관심있는 장르를 하나 이상 선택해주세요.", options: GENRES, selected: preferences.genres, onSelect: guard(toggleGenre, 0), columns: 3 },
    { title: "오늘 어떤 분위기를 원해요?", description: "보고 싶은 분위기를 선택해주세요.", options: MOODS, selected: [preferences.mood], onSelect: guard((v) => setSingle("mood", v), 1), columns: 2 },
    { title: "어떤 길이로 볼까요?", description: "시청할 수 있는 시간을 선택해 주세요.", options: DURATIONS, selected: [preferences.duration], onSelect: guard((v) => setSingle("duration", v), 2), columns: 2 },
  ];

  // [추가] TV: 단계가 바뀌어 누르던 버튼이 사라지면(2 → 3단계) 포커스를 새 단계 첫 선택지로 → 방향키로 바로 이어서 이동
  useEffect(() => {
    if (!tv) return;
    const dialog = dialogRef.current;
    if (!dialog || (dialog.contains(document.activeElement) && document.activeElement !== dialog)) return;
    const first = dialog.querySelector(".ai-popup-chip.is-selected") || dialog.querySelector(".ai-popup-chip");
    first?.focus({ preventScroll: true });
  }, [step, tv]);
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Native modal: 배경을 inert 처리하고 Tab 포커스를 팝업 안에 유지합니다.
    dialog.showModal();
    // [수정] 뒤로 왔으면 고르려던 작품 카드에 포커스 · 아니면 제목
    const back = rs?.focusId != null && dialog.querySelector(`[data-ai-id="${CSS.escape(String(rs.focusId))}"]`);
    if (back) {
      back.focus();
      back.scrollIntoView({ block: "nearest" });
    } else headingRef.current?.focus();
    const trapFocus = (event) => {
      if (event.key !== "Tab") return;
      const nodes = [...dialog.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')];
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    dialog.addEventListener("keydown", trapFocus);
    // [추가] TV: 방향키로 팝업 안 버튼 사이 이동 (TV 화면의 방향키 이동은 팝업이 열려 있으면 멈춤)
    // [수정] 마지막(3/3) 단계에서 방향키가 안 먹던 문제
    // - 원인: 2단계 [다음 단계로] 버튼이 3단계에서 [바로 추천받기] 로 바뀌며 사라짐 → 포커스가 팝업 밖(body)으로 빠짐
    //   → 팝업(dialog)에 단 keydown 이 더 이상 오지 않았음
    // - 수정: 문서 전체에서 방향키를 받고 (팝업이 열려 있을 때만) · 화면에 안 보이는 버튼(.ai-popup-sr-only)은 건너뜀
    const isVisibleBtn = (btn) => !btn.closest(".ai-popup-sr-only") && !btn.classList.contains("ai-popup-sr-only");
    const moveFocus = (event) => {
      if (!tv || !dialog.open || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const active = document.activeElement;
      const current = dialog.contains(active) && active.tagName === "BUTTON" && isVisibleBtn(active) ? active : null;
      const next = findNext(dialog, current, event.key, isVisibleBtn);
      if (next) {
        next.focus({ preventScroll: true });
        next.scrollIntoView({ block: "nearest" });
      }
    };
    document.addEventListener("keydown", moveFocus);
    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      document.removeEventListener("keydown", moveFocus);
      requestRef.current?.abort();
      detailRequestRef.current?.abort();
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  // [추가] 로그인 · 구독 후 돌아왔을 때: 고르려던 단계로 가서 그 칩을 골라 둠 (한 번만)
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!resumePick || resumedRef.current) return;
    resumedRef.current = true;
    const { step: s, value } = resumePick;
    if (s === 0) toggleGenre(value);
    if (s === 1) setSingle("mood", value);
    if (s === 2) setSingle("duration", value);
    if (s > 0) setStep(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumePick]);

  function setSingle(key, value) { setPreferences((prev) => ({ ...prev, [key]: prev[key] === value ? "" : value })); }
  function toggleGenre(value) { setPreferences((prev) => ({ ...prev, genres: prev.genres.includes(value) ? prev.genres.filter((g) => g !== value) : [...prev.genres, value] })); }

  async function recommend(nextPage = 0, includeExpanded = false) {
    if (!complete || loading) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const items = await (onRecommend || getContentRecommendations)(preferences, { signal: controller.signal, page: nextPage, includeExpanded });
      if (controller.signal.aborted) return;
      if (!Array.isArray(items)) throw new Error("Invalid recommendation response");
      setResults(items);
      setHasMore(typeof items.hasMore === "boolean" ? items.hasMore : items.length > 0);
      setExpanded(includeExpanded);
      setTotal(Number.isFinite(items.total) ? items.total : items.length);
      setExactTotal(Number.isFinite(items.exactTotal) ? items.exactTotal : items.length);
      setPage(nextPage);
      setScreen("results");
      dialogRef.current.scrollTop = 0;
      headingRef.current?.focus();
    } catch (err) {
      if (!controller.signal.aborted && err.name !== "AbortError") setError("작품을 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  // [추가] 지금 보고 있는 추천 결과 (상세에서 뒤로 왔을 때 그대로 다시 보여 주기)
  const snapshotOf = (item) => ({ preferences, results, marked, page, hasMore, expanded, total, exactTotal, focusId: item.id });

  // [추가] 상세 열기 — TV: onOpenDetail · 웹: 주소 이동 (+ 뒤로 오면 다시 열 결과 저장)
  function goDetail(item, type, id, detail = null) {
    const snapshot = snapshotOf(item);
    if (onOpenDetail) {
      onOpenDetail({ type, id, title: item.title, detail }, snapshot);
    } else {
      saveAiReturn(`${window.location.pathname}${window.location.search}`, snapshot);
      navigate(`/${type}/${id}`);
    }
    onClose();
  }

  async function openResult(item) {
    if (openingId) return;
    setError("");
    // 외부 onRecommend가 이미 유효한 내부 상세 경로를 준 경우 그대로 사용합니다.
    const pathMatch = item.detailPath?.match(/^\/(tv|movie)\/(\d+)(?:[?#].*)?$/);
    if (pathMatch) {
      goDetail(item, pathMatch[1], Number(pathMatch[2]));
      return;
    }
    const controller = new AbortController();
    detailRequestRef.current?.abort();
    detailRequestRef.current = controller;
    setOpeningId(item.id);
    try {
      const match = resolvedDetails.get(item.id) || await resolveContentDetail(item, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!match) {
        setError("이 작품의 상세 정보를 확인하지 못했어요. 잠시 후 다시 눌러 주세요.");
        return;
      }
      resolvedDetails.set(item.id, match);
      useMovieStore.setState(state => ({
        contentDetails: {
          ...state.contentDetails, [`${match.type}_${match.id}`]: match.detail,
        }
      }));
      goDetail(item, match.type, match.id, match.detail); // [수정] TV · 웹 공통 (뒤로 오면 보던 결과로)
    } catch (err) {
      if (err.name !== "AbortError") setError("상세 정보를 불러오지 못했어요. 다시 눌러 주세요.");
    } finally {
      if (!controller.signal.aborted) setOpeningId(null);
    }
  }

  function removePreference(value) {
    setPreferences((prev) => ({
      genres: prev.genres.filter((g) => g !== value),
      mood: prev.mood === value ? "" : prev.mood,
      duration: prev.duration === value ? "" : prev.duration,
    }));
    setStep(preferences.genres.includes(value) ? 0 : preferences.mood === value ? 1 : 2);
    setScreen("preferences");
    dialogRef.current.scrollTop = 0;
    headingRef.current?.focus();
  }

  return createPortal(
    <dialog ref={dialogRef} className={`ai-popup${screen === "results" ? " ai-popup--results" : ` ai-popup--selection ai-popup--step-${step}`}`} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}>
      <div className="ai-popup-header">
        <div className="ai-popup-title-row">
          <h2 id={titleId} ref={headingRef} tabIndex={-1}>
            {/* [추가] 제목 앞 AI 아이콘 (홍보 배너와 같은 빛나는 아이콘 · 취향 선택 · 추천 결과 공통) */}
            <AiLogo size={32} className="ai-popup-title-logo" />
            {screen === "results" ? "당신을 위한 추천 작품이에요!" : "AI 작품 추천"}
          </h2>
          {/* [수정] 닫기: 인트로 건너뛰기 버튼과 같은 X 아이콘 */}
          <button type="button" className="ai-popup-icon-button ai-popup-close" onClick={onClose} aria-label="AI 작품 추천 닫기">
            <svg className="ai-popup-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {/* [추가] 소제목 앞 반짝이는 점 (홍보 배너 질문 앞 점과 같음 · 취향 선택 · 추천 결과 공통) */}
        <p id={descriptionId} className="ai-popup-desc">{screen === "results" ? "선택 취향을 바탕으로 이런 작품을 추천해 드려요." : "지금 나에게 맞는 이야기를 찾아보세요."}</p>
      </div>

      {screen === "preferences" ? <>
        <div className="ai-popup-progress">
          <div className="ai-popup-step-label">
            <p><strong>{step + 1} / 3</strong><span>취향 선택</span></p>
            <button type="button" className="ai-popup-back ai-popup-sr-only" disabled={step === 0 || loading} onClick={() => setStep((prev) => prev - 1)}>이전</button>
          </div>
          <div role="progressbar" aria-label={stepLabels[step]} aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}><span style={{ width: `${progressRatio * 100}%` }} /></div>
        </div>
        <div className="ai-popup-form" aria-live="polite">
          <PreferenceGroup key={step} {...groups[step]} />
        </div>
        <div className="ai-popup-footer">
          {step < 2 ? <button type="button" className="ai-popup-skip ai-glow-btn" disabled={!stepValid} onClick={() => setStep((prev) => prev + 1)}>다음 단계로<img className="ai-popup-next-arrow" src={selectionArrowIcon} alt="" /></button> : <>
            <p className="ai-popup-helper"><span className="ai-popup-sparkle" aria-hidden="true"><AiLogo size={24} /></span><span>선택한 취향을 바탕으로 맞춤 작품을 찾아드릴게요.</span></p>
            <div className="ai-popup-actions">
              <button type="button" className="ai-popup-reset ai-popup-sr-only" disabled={loading} onClick={() => { setPreferences(emptyPreferences()); setStep(0); setError(""); }}><img src={resetIcon} alt="" />초기화</button>
              <button type="button" className="ai-popup-primary ai-glow-btn" disabled={!stepValid || loading} onClick={() => {
                if (step < 2) { setStep((prev) => prev + 1); } else { recommend(); }
              }}>{loading ? "추천 중…" : "바로 추천받기"}</button>
            </div>
          </>}
        </div>
      </> : <>
        <div className="ai-popup-result-body">
          <div className="ai-popup-tags" aria-label="선택한 취향">
            {[...preferences.genres, preferences.mood, preferences.duration].filter(Boolean).map((value) => <button type="button" key={value} onClick={() => removePreference(value)} aria-label={`${value} 선택 해제 후 취향 수정`}>{optionLabels[value] || value}<img src={removeIcon} alt="" /></button>)}
          </div>
          {!onRecommend && <p className="ai-popup-hint" role="status">{expanded
            ? `연관 추천 포함 ${total}개 · 시간과 분위기 차이를 확인해 주세요.`
            : `선택한 취향과 일치하는 작품 ${total}개`}</p>}
          <ul className="ai-popup-results" aria-label="추천 작품" aria-busy={loading} >
            {results.map((item) => tv ? (
              // [추가] TV: 카드 전체가 버튼 하나 (+ 관심 표시 없음) · 방향키로 고르고 Enter(리모컨 확인)로 상세
              <li key={item.id} className="ai-popup-result is-tv">
                <ResultLink item={item} onOpen={openResult} busy={openingId === item.id} disabled={Boolean(openingId)} aria-label={`${item.title} 자세히 보기`} className="ai-popup-result-card" data-ai-id={item.id}>
                  <span className="ai-popup-poster"><img src={item.poster} alt="" /></span>
                  <span className="ai-popup-result-copy">
                    <span className="ai-popup-result-heading"><span className="ai-popup-result-title">{item.title}</span></span>
                    <span className="ai-popup-result-genre">{item.genre}{item.runtimeText && ` · ${item.runtimeText}`}</span>
                    {item.exactMatch === false && <span className="ai-popup-match-note">연관 추천 · {item.relaxations?.map(value => `${value} 다름`).join(" · ")}</span>}
                    <span className="ai-popup-result-overview">{item.overview}</span>
                  </span>
                </ResultLink>
              </li>
            ) : <li key={item.id} className="ai-popup-result">
              <ResultLink item={item} onOpen={openResult} busy={openingId === item.id} disabled={Boolean(openingId)} aria-label={`${item.title} 자세히 보기`} className="ai-popup-poster" data-ai-id={item.id}><img src={item.poster} alt={item.title} /></ResultLink>
              <div className="ai-popup-result-copy">
                <div className="ai-popup-result-heading"><ResultLink item={item} onOpen={openResult} busy={openingId === item.id} disabled={Boolean(openingId)}>{item.title}</ResultLink>
                  <button type="button" className="ai-popup-icon-button" aria-label={`${item.title} 관심 표시`} aria-pressed={marked.includes(item.id)} onClick={() => setMarked((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])}><img src={marked.includes(item.id) ? checkIcon : plusIcon} alt="" /></button>
                </div>
                <p className="ai-popup-result-genre">{item.genre}{item.runtimeText && ` · ${item.runtimeText}`}</p>
                {item.exactMatch === false && <p className="ai-popup-match-note">연관 추천 · {item.relaxations?.map(value => `${value} 다름`).join(" · ")}</p>}
                <p className="ai-popup-result-overview">{item.overview}</p>
              </div>
            </li>)}
          </ul>
          {results.length === 0 && <p className="ai-popup-empty" role="status">추천 작품이 없어요. 취향을 바꿔 다시 찾아보세요.</p>}
        </div>
        <div className="ai-popup-results-footer">
          {openingId && <p className="ai-popup-hint" role="status">작품 상세 정보를 불러오고 있어요…</p>}
          {!onRecommend && !expanded && exactTotal < 20 && <button type="button" className="ai-popup-expand ai-glow-btn" disabled={loading} onClick={() => recommend(0, true)}>조건 넓혀서 추천받기</button>}
          {/* [수정] 더 보여 줄 결과가 없으면 버튼 대신 안내 글자만 */}
          {!loading && !hasMore
            ? <p className="ai-popup-last" role="status">마지막 추천 결과예요</p>
            : <button type="button" className="ai-popup-more" disabled={loading || Boolean(openingId)} onClick={() => recommend(page + 1, expanded)}><img src={resetIcon} alt="" />{loading ? "추천 중…" : "다른 추천 결과보기"}</button>}
          <button type="button" className="ai-popup-edit" onClick={() => { setStep(0); setScreen("preferences"); dialogRef.current.scrollTop = 0; headingRef.current?.focus(); }}>취향 다시 선택하기</button>
        </div>
      </>}
      {error && <p className="ai-popup-error" role="alert">{error}</p>}
    </dialog>, document.body,
  );
}
