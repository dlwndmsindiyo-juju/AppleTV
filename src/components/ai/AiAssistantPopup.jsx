import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { resolveContentDetail } from "./resolveContentDetail";
import { DURATIONS, GENRES, MOODS, getContentRecommendations } from "./aiRecommendations";
import closeIcon from "./assets/close.svg";
import checkIcon from "./assets/check.svg";
import starsIcon from "./assets/selection-stars.svg";
import selectionCloseIcon from "./assets/selection-close.svg";
import selectionCheckIcon from "./assets/selection-check.svg";
import selectionArrowIcon from "./assets/selection-arrow.svg";
import resetIcon from "./assets/reset.svg";
import plusIcon from "./assets/plus.svg";
import removeIcon from "./assets/remove.svg";
import "./AiAssistantPopup.scss";

const emptyPreferences = (taste) => ({
  genres: [],
  mood: ({ "편안한 힐링": "편안한 힐링", "몰입감 있는": "몰입감 있는", "가볍게 웃는": "가볍게 웃고 싶어요" })[taste] || "",
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
export default function AiAssistantPopup({ initialTaste, onClose, onRecommend }) {
  const dialogRef = useRef(null);
  const navigate = useNavigate();
  const detailRequestRef = useRef(null);
  const [openingId, setOpeningId] = useState(null);
  const headingRef = useRef(null);
  const requestRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const [preferences, setPreferences] = useState(() => emptyPreferences(initialTaste));
  const [screen, setScreen] = useState("preferences");
  const [step, setStep] = useState(0);
  const [results, setResults] = useState([]);
  const [marked, setMarked] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [total, setTotal] = useState(0);
  const [exactTotal, setExactTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const complete = preferences.genres.length > 0 && preferences.duration;
  const stepValid = [preferences.genres.length > 0, true, Boolean(preferences.duration)][step];
  const stepLabels = ["장르 선택", "분위기 선택", "시청 시간 선택"];
  const groups = [
    { title: "어떤 장르가 좋아요?", description: "관심있는 장르를 하나 이상 선택해주세요.", options: GENRES, selected: preferences.genres, onSelect: toggleGenre, columns: 3 },
    { title: "오늘 어떤 분위기를 원해요?", description: "보고 싶은 분위기를 선택해주세요.", options: MOODS, selected: [preferences.mood], onSelect: (v) => setSingle("mood", v), columns: 2 },
    { title: "어떤 길이로 볼까요?", description: "시청할 수 있는 시간을 선택해 주세요.", options: DURATIONS, selected: [preferences.duration], onSelect: (v) => setSingle("duration", v), columns: 2 },
  ];

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Native modal: 배경을 inert 처리하고 Tab 포커스를 팝업 안에 유지합니다.
    dialog.showModal();
    headingRef.current?.focus();
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
    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      requestRef.current?.abort();
      detailRequestRef.current?.abort();
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

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

  async function openResult(item) {
    if (openingId) return;
    setError("");
    // 외부 onRecommend가 이미 유효한 내부 상세 경로를 준 경우 그대로 사용합니다.
    if (item.detailPath && /^\/(tv|movie)\/\d+(?:[?#].*)?$/.test(item.detailPath)) {
      navigate(item.detailPath); onClose(); return;
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
      useMovieStore.setState(state => ({ contentDetails: {
        ...state.contentDetails, [`${match.type}_${match.id}`]: match.detail,
      } }));
      navigate(`/${match.type}/${match.id}`);
      onClose();
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
          <h2 id={titleId} ref={headingRef} tabIndex={-1}>{screen === "results" ? "당신을 위한 추천 작품이에요!" : "AI 작품 추천"}</h2>
          <button type="button" className="ai-popup-icon-button" onClick={onClose} aria-label="AI 작품 추천 닫기"><img src={screen === "preferences" ? selectionCloseIcon : closeIcon} alt="" /></button>
        </div>
        <p id={descriptionId}>{screen === "results" ? "선택 취향을 바탕으로 이런 작품을 추천해 드려요." : "지금 나에게 맞는 이야기를 찾아보세요."}</p>
      </div>

      {screen === "preferences" ? <>
        <div className="ai-popup-progress">
          <div className="ai-popup-step-label">
            <p><strong>{step + 1} / 3</strong><span>취향 선택</span></p>
            <button type="button" className="ai-popup-back ai-popup-sr-only" disabled={step === 0 || loading} onClick={() => setStep((prev) => prev - 1)}>이전</button>
          </div>
          <div role="progressbar" aria-label={stepLabels[step]} aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}><span style={{ width: `${(step + 1) / 3 * 100}%` }} /></div>
        </div>
        <div className="ai-popup-form" aria-live="polite">
          <PreferenceGroup key={step} {...groups[step]} />
        </div>
        <div className="ai-popup-footer">
          {step < 2 ? <button type="button" className="ai-popup-skip" disabled={!stepValid} onClick={() => setStep((prev) => prev + 1)}>넘어가기<img className="ai-popup-next-arrow" src={selectionArrowIcon} alt="" /></button> : <>
            <p className="ai-popup-helper"><span className="ai-popup-sparkle" aria-hidden="true"><img src={starsIcon} alt="" /></span><span>선택한 취향을 바탕으로 맞춤 작품을 찾아드릴게요.</span></p>
            <div className="ai-popup-actions">
              <button type="button" className="ai-popup-reset ai-popup-sr-only" disabled={loading} onClick={() => { setPreferences(emptyPreferences()); setStep(0); setError(""); }}><img src={resetIcon} alt="" />초기화</button>
              <button type="button" className="ai-popup-primary" disabled={!stepValid || loading} onClick={() => {
                if (step < 2) { setStep((prev) => prev + 1); } else { recommend(); }
              }}>{loading ? "추천 중…" : "작품 추천받기"}<img className="ai-popup-next-arrow" src={selectionArrowIcon} alt="" /></button>
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
            {results.map((item) => <li key={item.id} className="ai-popup-result">
              <ResultLink item={item} onOpen={openResult} busy={openingId === item.id} disabled={Boolean(openingId)} aria-label={`${item.title} 자세히 보기`} className="ai-popup-poster"><img src={item.poster} alt={item.title} /></ResultLink>
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
          {!onRecommend && !expanded && exactTotal < 20 && <button type="button" className="ai-popup-expand" disabled={loading} onClick={() => recommend(0, true)}>조건 넓혀서 추천받기</button>}
          <button type="button" className="ai-popup-more" disabled={loading || Boolean(openingId) || !hasMore} onClick={() => recommend(page + 1, expanded)}><img src={resetIcon} alt="" />{loading ? "추천 중…" : !hasMore ? "마지막 추천 결과예요" : "다른 추천 결과보기"}</button>
          <button type="button" className="ai-popup-edit" onClick={() => { setStep(0); setScreen("preferences"); dialogRef.current.scrollTop = 0; headingRef.current?.focus(); }}>취향 다시 선택하기</button>
        </div>
      </>}
      {error && <p className="ai-popup-error" role="alert">{error}</p>}
    </dialog>, document.body,
  );
}
