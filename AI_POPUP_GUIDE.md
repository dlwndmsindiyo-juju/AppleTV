# AI 팝업 수정 안내 및 전체 코드

## 이번 디자인 수정

첨부한 개인 작업창 ZIP의 Group 299·300·301을 기준으로 선택 화면을 수정했습니다.

- Desktop 995×605px 라운드 박스, 넓은 805px 콘텐츠 영역을 적용했습니다.
- 장르 → 분위기 → 시청 시간 → 추천 결과 순서입니다.
- 장르와 분위기 화면은 동일한 중앙의 긴 넘어가기 버튼을 사용합니다. 장르는 하나 이상 선택해야 진행됩니다.
- 시청 시간 화면은 안내 문구, 왼쪽 초기화, 오른쪽 작품 추천받기 버튼을 사용합니다.
- 분위기 화면은 중앙 넘어가기 버튼을 사용합니다. 분위기 선택은 생략할 수 있습니다.
- 진행 표시는 실제 단계에 맞춰 1/3 → 2/3 → 3/3으로 변경됩니다.
- 이전 버튼으로 돌아가면 선택 내용을 유지합니다.
- 모바일에서는 칩을 줄바꿈합니다.
- 마지막 추천 결과 화면의 구성과 스타일은 유지했습니다. 결과는 예시 데이터입니다.

## 반응형 적용

- 1920px: 선택 팝업 995×605px, 추천 결과 960×760px.
- 1024px: 선택 팝업 760×602px, 추천 결과 너비 760px.
- 390px: 선택 팝업 358×580px, 추천 결과 너비 358px.
- 모든 화면에서 fixed + inset: 0 + margin: auto로 가로·세로 중앙 정렬합니다.
- 실제 높이는 화면 높이와 여백에 맞춰 제한되며 질문·결과 영역이 내부 스크롤됩니다.
- 글자 크기 최소 11px. 모바일 장르 3열, 분위기·시간 2열, 추천 카드 1열.
- 1920×1080, 1024×768, 390×844, 390×568, 320×568에서 전체 단계 중앙 정렬·최소 글자 크기·가로 넘침을 자동 검사했습니다.

## MoodAssistant 연결

`src/components/member/MoodAssistant.jsx`의 `member-head` 더보기는 기존 `/recommend` 링크로 복구했습니다.
플러스 아이콘(`ui-icon ui-icon-plus`)을 포함한 기존 취향 더 반영하기 버튼을 클릭하면 반응형 AI 팝업이 열립니다.
기존 버튼 마크업과 스타일을 유지하며, 팝업 닫기 시 버튼으로 키보드 포커스가 돌아옵니다.

## 수정 파일

이번 디자인 수정: `src/components/ai/AiAssistantPopup.jsx`, `src/components/ai/AiAssistantPopup.scss`.
기존 `AiAssistantPromo.jsx`, `Home.jsx`의 팝업 연결은 그대로 유지합니다.
`previews` 폴더에 단계별 PNG와 자동 재생 GIF를 포함했습니다.

## 다른 화면에 연결하기

`src/components/member` 안의 파일에서 사용하는 예:

```jsx
import AiAssistantLink from "../ai/AiAssistantLink";

<AiAssistantLink className="member-more">더보기</AiAssistantLink>
<AiAssistantLink className="member-btn" initialTaste="몰입감 있는">
  취향 더 반영하기
</AiAssistantLink>
```

페이지 파일(`src/pages`)에서 import할 때는 `../components/ai/AiAssistantLink`를 사용하세요.
React Router 내부라면 Provider나 새 Route를 추가할 필요가 없습니다.

## 구현 범위와 실제 API 연결

현재 결과는 **시안 확인용 예시 6개**입니다. AI 서버를 새로 만들거나 외부 AI를 호출하지 않습니다.
장르·분위기·길이와 일치하는 항목에 점수를 주어 정렬하며, 모든 조건으로 필터링하는 기능은 아닙니다.
`다른 추천 결과보기`는 같은 예시 목록의 순서를 바꿉니다. 이 사실은 결과 화면에도 안내합니다.
결과 카드 제목/포스터는 프로젝트에 이미 있는 `/search?q=작품명` 검색으로 이동합니다.
`+`는 팝업을 열어둔 동안의 관심 표시만 토글하며, 기존 Firestore 위시리스트에는 저장하지 않습니다.
닫았다 다시 열면 선택 내용과 관심 표시가 초기화됩니다.

실제 추천 서비스를 붙이려면 AiAssistantLink에 `onRecommend`를 전달하세요:

```jsx
async function requestRecommendations(preferences, { signal, page }) {
  // 아래 주소는 연결 예시입니다. 프로젝트에 구현된 API 주소로 교체하세요.
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ ...preferences, page }),
  });
  if (!response.ok) throw new Error("추천 요청 실패");
  const data = await response.json();
  return data.items;
}

<AiAssistantLink onRecommend={requestRecommendations}>맞는 작품 찾기</AiAssistantLink>
```

입력: `{ genres: string[], mood: string, duration: string }`.
반환: `[{ id, title, genre, overview, poster, detailPath? }]`.
`id`는 배열 내 고유 값, `poster`는 실제 이미지 URL, `detailPath`는 실제 프로젝트 상세 경로를 넣으세요.
비밀 API 키는 프론트엔드에 넣지 말고 서버에서 사용하세요.
API 연결 시 예시 안내가 숨겨지고 로딩·실패·빈 결과 화면이 동작합니다.

## 실행 및 확인

압축을 풀고 `AppleTV-main/apple-tv` 폴더에서 실행:

```bash
npm ci
npm run dev
```

기존 프로젝트의 Firebase/TMDB 환경변수는 원래 사용하던 `.env` 설정을 그대로 사용하세요.
첨부 프로젝트에 `.env`와 SF Pro 실제 폰트 파일이 없으므로 계정/API 연동 및 폰트는 기존 환경에 의존합니다.
이 팝업의 기본 예시 화면 자체는 추천 API 키 없이 동작합니다.

검증: 프로덕션 빌드, 추가·수정한 AI 코드 ESLint 통과.
기존 전역 스타일을 적용한 별도 브라우저 화면에서 1920/1024/390/320px 가로 넘침,
팝업 열기, 배너 취향 전달, 초기화, 선택 검증, 추천 결과, 순서 변경, 태그 해제,
관심 표시, 포스터 표시, ESC 닫기, 포커스 유지·복귀를 확인했습니다.
Firebase 실계정 로그인과 실제 AI 추천은 검증 범위가 아닙니다.
기존 Sass deprecated 함수/누락 폰트/큰 번들에 대한 빌드 경고는 남아 있습니다.

## 전체 코드

### src/components/ai/AiAssistantLink.jsx

```jsx
import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AiAssistantPopup from "./AiAssistantPopup";

// Router 안의 어느 화면에서든 import하여 사용합니다. Provider/라우트 추가 불필요.
export default function AiAssistantLink({ children, initialTaste = null, className = "", onRecommend }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Link
        to={`${location.pathname}${location.search}${location.hash}`}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Link>
      {open && <AiAssistantPopup initialTaste={initialTaste} onClose={close} onRecommend={onRecommend} />}
    </>
  );
}

```

### src/components/ai/AiAssistantPopup.jsx

```jsx
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { DURATIONS, GENRES, MOODS, getExampleRecommendations } from "./aiRecommendations";
import closeIcon from "./assets/close.svg";
import genreIcon from "./assets/genre.svg";
import moodIcon from "./assets/mood.svg";
import timeIcon from "./assets/time.svg";
import checkIcon from "./assets/check.svg";
import starsIcon from "./assets/stars.svg";
import resetIcon from "./assets/reset.svg";
import arrowIcon from "./assets/arrow.svg";
import plusIcon from "./assets/plus.svg";
import removeIcon from "./assets/remove.svg";
import "./AiAssistantPopup.scss";

const emptyPreferences = (taste) => ({
  genres: [],
  mood: ({ "편안한 힐링": "따뜻한 감동", "몰입감 있는": "몰입감 있는", "가볍게 웃는": "가볍게 웃고 싶어요" })[taste] || "",
  duration: "",
});

function PreferenceGroup({ title, description, icon, options, selected, onSelect, columns }) {
  return (
    <fieldset className={`ai-popup-group ai-popup-group--${columns}`}>
      <legend className="ai-popup-sr-only">{title}</legend>
      <div className="ai-popup-question">
        <img src={icon} alt="" />
        <div><h3>{title}</h3><p>{description}</p></div>
      </div>
      <div className="ai-popup-options">
        {options.map((option) => {
          const active = selected.includes(option);
          return <button key={option} type="button" aria-pressed={active} className={`ai-popup-chip${active ? " is-selected" : ""}`} onClick={() => onSelect(option)}>
            {active && <img src={checkIcon} alt="" />}{option}
          </button>;
        })}
      </div>
    </fieldset>
  );
}

// onRecommend: (preferences, { signal, page }) => Promise<작품[]>
// 작품: { id, title, genre, overview, poster, detailPath? }
export default function AiAssistantPopup({ initialTaste, onClose, onRecommend }) {
  const dialogRef = useRef(null);
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const complete = preferences.genres.length > 0 && preferences.duration;
  const stepValid = [preferences.genres.length > 0, true, Boolean(preferences.duration)][step];
  const stepLabels = ["장르 선택", "분위기 선택", "시청 시간 선택"];
  const groups = [
    { title: "어떤 장르가 좋아요?", description: "관심있는 장르를 하나 이상 선택해 주세요.", icon: genreIcon, options: GENRES, selected: preferences.genres, onSelect: toggleGenre, columns: 3 },
    { title: "오늘 어떤 분위기를 원해요?", description: "보고 싶은 분위기를 선택해 주세요.", icon: moodIcon, options: MOODS, selected: [preferences.mood], onSelect: (v) => setSingle("mood", v), columns: 2 },
    { title: "어떤 길이로 볼까요?", description: "시청할 수 있는 시간을 선택해 주세요.", icon: timeIcon, options: DURATIONS, selected: [preferences.duration], onSelect: (v) => setSingle("duration", v), columns: 2 },
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
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  function setSingle(key, value) { setPreferences((prev) => ({ ...prev, [key]: prev[key] === value ? "" : value })); }
  function toggleGenre(value) { setPreferences((prev) => ({ ...prev, genres: prev.genres.includes(value) ? prev.genres.filter((g) => g !== value) : [...prev.genres, value] })); }

  async function recommend(nextPage = 0) {
    if (!complete || loading) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const items = await (onRecommend || getExampleRecommendations)(preferences, { signal: controller.signal, page: nextPage });
      if (controller.signal.aborted) return;
      if (!Array.isArray(items)) throw new Error("Invalid recommendation response");
      setResults(items);
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
          <button type="button" className="ai-popup-icon-button" onClick={onClose} aria-label="AI 작품 추천 닫기"><img src={closeIcon} alt="" /></button>
        </div>
        <p id={descriptionId}>{screen === "results" ? "선택 취향을 바탕으로 이런 작품을 추천해 드려요." : "지금 나에게 맞는 이야기를 찾아보세요."}</p>
      </div>

      {screen === "preferences" ? <>
        <div className="ai-popup-progress">
          <div className="ai-popup-step-label">
            <p><strong>{step + 1} / 3</strong><span>취향 선택</span></p>
            <button type="button" className="ai-popup-back" disabled={step === 0 || loading} onClick={() => setStep((prev) => prev - 1)}>이전</button>
          </div>
          <div role="progressbar" aria-label={stepLabels[step]} aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1}><span style={{ width: `${(step + 1) / 3 * 100}%` }} /></div>
        </div>
        <div className="ai-popup-form" aria-live="polite">
          <PreferenceGroup key={step} {...groups[step]} />
        </div>
        <div className="ai-popup-footer">
          {step < 2 ? <button type="button" className="ai-popup-skip" disabled={!stepValid} onClick={() => setStep((prev) => prev + 1)}>넘어가기</button> : <>
          <p className="ai-popup-helper"><img src={starsIcon} alt="" />선택한 취향을 바탕으로 맞춤 작품을 찾아드릴게요.</p>
          <div className="ai-popup-actions">
            <button type="button" className="ai-popup-reset" disabled={loading} onClick={() => { setPreferences(emptyPreferences()); setStep(0); setError(""); }}><img src={resetIcon} alt="" />초기화</button>
            <button type="button" className="ai-popup-primary" disabled={!stepValid || loading} onClick={() => {
              if (step < 2) { setStep((prev) => prev + 1); } else { recommend(); }
            }}>{loading ? "추천 중…" : "작품 추천받기"}<img src={arrowIcon} alt="" /></button>
          </div>
          </>}
        </div>
      </> : <>
        <div className="ai-popup-result-body">
        <div className="ai-popup-tags" aria-label="선택한 취향">
          {[...preferences.genres, preferences.mood, preferences.duration].filter(Boolean).map((value) => <button type="button" key={value} onClick={() => removePreference(value)} aria-label={`${value} 선택 해제 후 취향 수정`}>{value}<img src={removeIcon} alt="" /></button>)}
        </div>
        {!onRecommend && <p className="ai-popup-hint">추천 미리보기 · 예시 작품</p>}
        <ul className="ai-popup-results" aria-label="추천 작품" aria-busy={loading}>
          {results.map((item) => <li key={item.id} className="ai-popup-result">
            <Link to={item.detailPath || `/search?q=${encodeURIComponent(item.title)}`} onClick={onClose} aria-label={`${item.title} 자세히 보기`} className="ai-popup-poster"><img src={item.poster} alt={item.title} /></Link>
            <div className="ai-popup-result-copy">
              <div className="ai-popup-result-heading"><Link to={item.detailPath || `/search?q=${encodeURIComponent(item.title)}`} onClick={onClose}>{item.title}</Link>
                <button type="button" className="ai-popup-icon-button" aria-label={`${item.title} 관심 표시`} aria-pressed={marked.includes(item.id)} onClick={() => setMarked((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])}><img src={marked.includes(item.id) ? checkIcon : plusIcon} alt="" /></button>
              </div>
              <p className="ai-popup-result-genre">{item.genre}</p>
              <p className="ai-popup-result-overview">{item.overview}</p>
            </div>
          </li>)}
        </ul>
        {results.length === 0 && <p className="ai-popup-empty" role="status">추천 작품이 없어요. 취향을 바꿔 다시 찾아보세요.</p>}
        </div>
        <div className="ai-popup-results-footer">
        <button type="button" className="ai-popup-more" disabled={loading} onClick={() => recommend(page + 1)}><img src={resetIcon} alt="" />{loading ? "추천 중…" : "다른 추천 결과보기"}</button>
        <button type="button" className="ai-popup-edit" onClick={() => { setStep(0); setScreen("preferences"); dialogRef.current.scrollTop = 0; headingRef.current?.focus(); }}>취향 다시 선택하기</button>
        </div>
      </>}
      {error && <p className="ai-popup-error" role="alert">{error}</p>}
    </dialog>, document.body,
  );
}

```

### src/components/ai/AiAssistantPopup.scss

```scss
// 기존 전역 SCSS와 충돌하지 않도록 모든 셀렉터를 ai-popup으로 한정합니다.
.ai-popup {
  --ai-primary: #5865f2;
  --ai-subtle: #c8c8c8;
  box-sizing: border-box;
  position: fixed;
  inset: 0;
  margin: auto;
  width: 500px;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 64px);
  padding: 32px 24px;
  border: 0;
  background: #1e1f1f;
  color: #fff;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  font-family: 'SF Pro', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 17px;
  line-height: 1.4;
  &::backdrop { background: rgb(0 0 0 / 72%); }
  &, * { box-sizing: border-box; }
  * { font-family: inherit; }
  h2, h3, p, ul { margin: 0; padding: 0; }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; color: inherit; border: 0; cursor: pointer; background: transparent; }
  button:disabled { opacity: .45; cursor: not-allowed; }
  button:focus-visible, a:focus-visible { outline: 2px solid #a5acff; outline-offset: 4px; }
  img { display: block; flex-shrink: 0; width: auto; height: auto; max-width: none; }
  .ai-popup-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 43px; }
  .ai-popup-title-row h2 { font-size: 24px; font-weight: 600; outline: none; }
  .ai-popup-header > p { color: var(--ai-subtle); margin-top: 7px; text-align: center; }
  .ai-popup-icon-button { display: flex; align-items: center; justify-content: center; flex-shrink: 0; min-width: 32px; min-height: 32px; padding: 0; }
  .ai-popup-progress { max-width: 415px; margin: 24px auto; }
  .ai-popup-progress p { margin-bottom: 29px; }
  .ai-popup-progress p span { margin-left: 17px; color: var(--ai-subtle); }
  .ai-popup-progress [role=progressbar] { height: 7px; background: #464646; border-radius: 24px; overflow: hidden; }
  .ai-popup-progress [role=progressbar] > span { display: block; height: 100%; background: var(--ai-primary); border-radius: inherit; }
  .ai-popup-form { width: 100%; max-width: 404px; margin: 0 auto; }
  .ai-popup-group { border: 0; padding: 0 0 25px; margin: 0 0 25px; min-width: 0; border-bottom: 1px solid #525252; }
  .ai-popup-group:last-child { margin-bottom: 0; border-bottom: 0; padding-bottom: 0; }
  .ai-popup-question { display: flex; align-items: center; gap: 10px; min-height: 76px; padding: 10px 0 10px 10px; margin-bottom: 14px; }
  .ai-popup-question h3, .ai-popup-question p { font-size: 20px; font-weight: 400; }
  .ai-popup-question p { color: var(--ai-subtle); }
  .ai-popup-options { display: grid; gap: 12px 8px; justify-content: start; }
  .ai-popup-group--3 .ai-popup-options { grid-template-columns: repeat(3, max-content); }
  .ai-popup-group--2 .ai-popup-options { grid-template-columns: repeat(2, max-content); gap: 22px 8px; }
  .ai-popup-chip { border-radius: 30px; display: flex; align-items: center; justify-content: center; gap: 4px; min-height: 45px; padding: 13px 40px; font-size: 12.2px; white-space: nowrap; background: #242424; }
  .ai-popup-chip.is-selected { background: var(--ai-primary); padding-inline: 23px; }
  .ai-popup-chip img { flex: 0 0 auto; }
  .ai-popup-helper { display: flex; align-items: center; gap: 10px; max-width: 325px; margin: 24px auto; padding: 10px; color: var(--ai-subtle); }
  .ai-popup-actions { max-width: 386px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .ai-popup-reset, .ai-popup-primary, .ai-popup-more { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; }
  .ai-popup-reset { font-size: 20px; padding: 0; }
  .ai-popup-primary { background: var(--ai-primary); padding: 13px 16px; border-radius: 30px; min-width: 165px; }
  .ai-popup-hint { font-size: 11px; color: var(--ai-subtle); text-align: center; margin: 12px 0; }
  .ai-popup-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0; }
  .ai-popup-tags button { display: flex; align-items: center; gap: 17px; background: #242424; padding: 13px 23px; border-radius: 30px; }
  .ai-popup-results { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  .ai-popup-result { display: flex; align-items: center; gap: 16px; height: 140px; padding-right: 16px; overflow: hidden; border-radius: 20px; background: #2e2e2e; }
  .ai-popup-poster { display: block; width: 100px; height: 140px; flex: 0 0 100px; border-radius: 20px; overflow: hidden; }
  .ai-popup-poster img { width: 100px; height: 140px; object-fit: cover; }
  .ai-popup-result-copy { flex: 1; min-width: 0; }
  .ai-popup-result-heading { display: flex; align-items: center; gap: 8px; }
  .ai-popup-result-heading a { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex: 1; min-width: 0; }
  .ai-popup-result-genre { color: #d5d5d5; margin-top: 4px; }
  .ai-popup-result-overview { color: var(--ai-subtle); margin-top: 10px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .ai-popup-more { background: #2e2e2e; border: 1px solid #525252; border-radius: 30px; width: 328px; max-width: 100%; margin: 24px auto 0; padding: 12px; }
  .ai-popup-edit { display: block; margin: 14px auto 0; font-size: 12px; color: var(--ai-subtle); text-decoration: underline; }
  .ai-popup-empty { text-align: center; padding: 32px 0; color: var(--ai-subtle); }
  .ai-popup-error { margin-top: 16px; color: #ffb3b3; text-align: center; font-size: 14px; }
  .ai-popup-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
}

@media (max-width: 1024px) {
  .ai-popup {
    width: 460px; padding-block: 28px; font-size: 14px;
    .ai-popup-title-row h2 { font-size: 21px; }
    .ai-popup-question { min-height: 68px; }
    .ai-popup-question h3, .ai-popup-question p, .ai-popup-reset { font-size: 17px; }
    .ai-popup-group { margin-bottom: 22px; padding-bottom: 22px; }
  }
}

@media (max-width: 600px) {
  .ai-popup {
    width: 358px; max-height: calc(100dvh - 32px); padding: 24px 16px; font-size: 11px;
    .ai-popup-title-row h2 { font-size: 18px; }
    .ai-popup-progress { margin: 16px 0; }
    .ai-popup-question { min-height: 62px; }
    .ai-popup-question h3, .ai-popup-question p, .ai-popup-reset { font-size: 14px; }
    .ai-popup-chip, .ai-popup-chip.is-selected { min-height: 40px; padding: 10px 16px; font-size: 11px; gap: 8px; }
    .ai-popup-group { margin-bottom: 24px; padding-bottom: 24px; }
    .ai-popup-helper { padding: 10px 0; }
    .ai-popup-tags { gap: 8px; margin: 16px 0; }
    .ai-popup-tags button { padding: 11px 16px; gap: 8px; }
    .ai-popup-result { gap: 12px; padding-right: 12px; }
  }
}

@media (max-width: 359px) {
  .ai-popup {
    .ai-popup-group--3 .ai-popup-options { grid-template-columns: repeat(2, max-content); }
    .ai-popup-question { padding-left: 0; gap: 6px; }
    .ai-popup-primary { min-width: 0; }
  }
}

// 단계형 라운드 팝업: 상·하단 고정, 질문 영역만 교체합니다.
.ai-popup {
  width: 960px; height: 640px; max-width: calc(100vw - 64px);
  padding: 40px 48px; border-radius: 32px; overflow: hidden;
  &[open] { display: flex; flex-direction: column; }
  .ai-popup-header { flex: 0 0 auto; width: 100%; max-width: 500px; margin: 0 auto; }
  .ai-popup-title-row { min-height: 38px; }
  .ai-popup-header > p { margin-top: 12px; }
  .ai-popup-progress { flex: 0 0 auto; width: 100%; max-width: 500px; margin: 30px auto 0; }
  .ai-popup-step-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .ai-popup-progress p { margin-bottom: 0; }
  .ai-popup-progress strong { font-weight: 400; }
  .ai-popup-back { font-size: 14px; color: var(--ai-subtle); padding: 4px 0 4px 16px; }
  .ai-popup-back:disabled { visibility: hidden; }
  .ai-popup-progress [role=progressbar] > span { transition: width .2s ease; }
  .ai-popup-form { flex: 1 1 auto; min-height: 0; width: 100%; max-width: 500px; margin: 0 auto; padding: 28px 0 20px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; }
  .ai-popup-group { border: 0; padding: 0; margin: 0; }
  .ai-popup-question { gap: 12px; min-height: 70px; padding: 0 0 20px; margin-bottom: 20px; }
  .ai-popup-question p { margin-top: 2px; }
  .ai-popup-options { gap: 16px 10px; }
  .ai-popup-group--3 .ai-popup-options { grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 430px; }
  .ai-popup-group--2 .ai-popup-options { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 410px; gap: 16px 10px; }
  .ai-popup-chip, .ai-popup-chip.is-selected { min-height: 46px; padding: 12px 18px; font-size: 14px; gap: 7px; }
  .ai-popup-footer { flex: 0 0 auto; width: 100%; max-width: 500px; margin: 0 auto; padding-top: 16px; }
  .ai-popup-helper { max-width: 360px; min-height: 48px; margin: 0 auto 22px; padding: 0; }
  .ai-popup-actions { max-width: none; }
  .ai-popup-primary { min-width: 180px; padding-inline: 20px; }
  .ai-popup-result-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; margin-top: 20px; padding: 0 4px 4px; }
  .ai-popup-tags { justify-content: center; margin: 0 0 16px; }
  .ai-popup-tags button { padding: 10px 18px; font-size: 14px; gap: 10px; }
  .ai-popup-hint { margin: 0 0 12px; }
  .ai-popup-results { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .ai-popup-result { min-width: 0; gap: 14px; padding-right: 14px; }
  .ai-popup-result-copy { font-size: 14px; }
  .ai-popup-result-heading { gap: 4px; }
  .ai-popup-results-footer { flex: 0 0 auto; padding-top: 20px; }
  .ai-popup-more { margin-top: 0; }
  .ai-popup-error { flex: 0 0 auto; margin-top: 10px; }
  &.ai-popup--results { height: 760px; }
}
@media (max-width: 1024px) {
  .ai-popup {
    width: 760px; padding: 32px 36px; border-radius: 29px;
    .ai-popup-group { margin: 0; padding: 0; }
    .ai-popup-helper { max-width: 330px; }
    .ai-popup-result-copy { font-size: 13px; }
  }
}
@media (max-width: 600px) {
  .ai-popup {
    width: 358px; height: 580px; max-width: calc(100vw - 32px); padding: 24px 20px; border-radius: 26px;
    .ai-popup-header > p { margin-top: 9px; }
    .ai-popup-progress { margin: 27px 0 0; }
    .ai-popup-step-label { margin-bottom: 17px; }
    .ai-popup-question { gap: 10px; margin-bottom: 14px; }
    .ai-popup-chip, .ai-popup-chip.is-selected { min-height: 42px; padding: 10px 9px; font-size: 11px; gap: 4px; }
    .ai-popup-options, .ai-popup-group--2 .ai-popup-options { gap: 16px 8px; }
    .ai-popup-helper { max-width: 280px; min-height: 38px; margin-bottom: 18px; }
    .ai-popup-primary { min-width: 165px; padding-inline: 16px; }
    .ai-popup-back { font-size: 11px; }
    .ai-popup-tags { justify-content: flex-start; gap: 6px; margin: 0 0 16px; }
    .ai-popup-tags button { padding: 8px 12px; font-size: 11px; gap: 8px; }
    .ai-popup-results { grid-template-columns: minmax(0, 1fr); gap: 10px; }
    .ai-popup-result { gap: 12px; padding-right: 10px; }
    .ai-popup-result-copy { font-size: 11px; }
    &.ai-popup--results { height: 720px; }
  }
}
@media (max-height: 560px) {
  .ai-popup {
    padding-block: 18px;
    .ai-popup-progress { margin-top: 14px; }
    .ai-popup-helper { display: none; }
    .ai-popup-form { padding-block: 16px; }
    .ai-popup-footer { padding-top: 8px; }
  }
}
@media (prefers-reduced-motion: reduce) {
  .ai-popup .ai-popup-progress [role=progressbar] > span { transition: none; }
}

// 첨부 시안 Group 299–301: 선택 화면 전용. 추천 결과 스타일은 유지합니다.
.ai-popup.ai-popup--selection {
  width: 995px;
  height: 605px;
  padding: 60px 94px 52px;
  background: #1e1f1f;
  .ai-popup-header, .ai-popup-progress, .ai-popup-form, .ai-popup-footer { max-width: none; }
  .ai-popup-header > p { margin-top: 12px; }
  .ai-popup-progress { margin-top: 38px; }
  .ai-popup-step-label { margin-bottom: 28px; }
  .ai-popup-form { padding: 42px 0 24px; }
  .ai-popup-question { min-height: 58px; padding: 0 12px; margin-bottom: 24px; }
  .ai-popup-question h3, .ai-popup-question p { font-size: 20px; }
  .ai-popup-options,
  .ai-popup-group--2 .ai-popup-options,
  .ai-popup-group--3 .ai-popup-options {
    display: flex; flex-wrap: wrap; max-width: none; gap: 8px;
  }
  .ai-popup-chip, .ai-popup-chip.is-selected {
    min-height: 46px; padding: 12px 28px; font-size: 14px; gap: 7px;
  }
  .ai-popup-footer { padding-top: 12px; }
  .ai-popup-helper { width: 300px; max-width: 100%; min-height: 48px; margin: 0 auto 22px; }
  .ai-popup-primary { min-width: 165px; padding-inline: 16px; }
  .ai-popup-skip { display: block; width: 371px; max-width: 100%; min-height: 50px; padding: 12px 24px; margin: 0 auto 30px; border-radius: 30px; background: var(--ai-primary); font-size: 17px; }
}
@media (max-width: 1024px) {
  .ai-popup.ai-popup--selection {
    width: 760px; height: 602px;
    padding: 48px 48px 40px;
    .ai-popup-question h3, .ai-popup-question p { font-size: 17px; }
    .ai-popup-chip, .ai-popup-chip.is-selected { padding-inline: 22px; font-size: 11px; }
    .ai-popup-skip { font-size: 14px; }
  }
}
@media (max-width: 600px) {
  .ai-popup.ai-popup--selection {
    width: 358px; height: 580px; padding: 24px 20px;
    .ai-popup-progress { margin-top: 27px; }
    .ai-popup-step-label { margin-bottom: 17px; }
    .ai-popup-form { padding: 28px 0 20px; }
    .ai-popup-question { padding-inline: 0; margin-bottom: 24px; }
    .ai-popup-question h3, .ai-popup-question p { font-size: 14px; }
    .ai-popup-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .ai-popup-group--2 .ai-popup-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 8px; }
    .ai-popup-chip, .ai-popup-chip.is-selected { padding: 10px 8px; min-height: 42px; gap: 4px; }
    .ai-popup-helper { width: 280px; min-height: 38px; margin-bottom: 18px; }
    .ai-popup-skip { margin-bottom: 0; font-size: 11px; }
  }
}
@media (max-height: 560px) {
  .ai-popup.ai-popup--selection {
    padding-block: 18px;
    .ai-popup-progress { margin-top: 14px; }
    .ai-popup-form { padding-block: 16px; }
    .ai-popup-helper { display: none; }
    .ai-popup-skip { margin-bottom: 0; }
  }
}

```

### src/components/ai/aiRecommendations.js

```jsx
import poster0 from "./assets/poster0.jpg";
import poster1 from "./assets/poster1.jpg";
import poster2 from "./assets/poster2.jpg";
import poster3 from "./assets/poster3.jpg";
import poster4 from "./assets/poster4.jpg";
import poster5 from "./assets/poster5.jpg";

export const GENRES = ["코미디", "호러", "로맨스", "스릴러", "SF", "애니메이션"];
export const MOODS = ["가볍게 웃고 싶어요", "긴장감 넘치는", "따뜻한 감동", "몰입감 있는"];
export const DURATIONS = ["30분 이하", "1시간 내외", "영화 한 편", "상관없어요"];

// Figma 원본 포스터를 사용하는 UI 예시 데이터. 실제 AI/개인화 결과가 아닙니다.
// API 연결 시 onRecommend(preferences, { signal, page }) -> Promise<작품[]> 로 교체하세요.
const EXAMPLES = [
  { id: 87917, title: "포 올 맨카인드", genre: "SF", genres: ["SF"], moods: ["몰입감 있는", "긴장감 넘치는"], duration: "1시간 내외", poster: poster0, overview: "치열한 우주 경쟁이 끝나지 않은 세상. 우주 비행사와 가족들의 위태로운 삶을 따라가는 이야기." },
  { id: 93740, title: "파운데이션", genre: "SF", genres: ["SF"], moods: ["몰입감 있는"], duration: "1시간 내외", poster: poster1, overview: "은하 제국의 몰락 앞에서 인류의 미래를 지키려는 이들의 장대한 여정." },
  { id: "pluribus", title: "플루리부스", genre: "SF · 드라마", genres: ["SF"], moods: ["긴장감 넘치는"], duration: "1시간 내외", poster: poster2, overview: "모두가 행복해진 세상에서 홀로 다른 감정을 느끼는 한 사람의 이야기." },
  { id: 91363, title: "모나크: 레거시 오브 몬스터즈", genre: "SF · 어드벤처", genres: ["SF", "스릴러"], moods: ["몰입감 있는", "긴장감 넘치는"], duration: "1시간 내외", poster: poster3, overview: "괴수의 존재가 드러난 세상. 가족의 비밀과 모나크의 숨겨진 역사를 추적한다." },
  { id: 80752, title: "어둠의 나날", genre: "SF · 드라마", genres: ["SF", "스릴러"], moods: ["긴장감 넘치는"], duration: "1시간 내외", poster: poster4, overview: "시력을 잃은 인류의 세상에 새로운 가능성이 태어나고, 가족을 지키기 위한 여정이 시작된다." },
  { id: 196322, title: "다크 매터", genre: "SF · 스릴러", genres: ["SF", "스릴러", "로맨스"], moods: ["몰입감 있는", "긴장감 넘치는"], duration: "1시간 내외", poster: poster5, overview: "다른 삶으로 옮겨진 한 남자가 사랑하는 가족과 자신의 현실을 되찾으려 한다." },
];

export function getExampleRecommendations(preferences, { page = 0 } = {}) {
  const score = (item) => preferences.genres.filter((g) => item.genres.includes(g)).length * 3
    + Number(item.moods.includes(preferences.mood)) * 2 + Number(item.duration === preferences.duration);
  const sorted = [...EXAMPLES].sort((a, b) => score(b) - score(a));
  const offset = page % sorted.length;
  return [...sorted.slice(offset), ...sorted.slice(0, offset)];
}

```

### src/components/landing/AiAssistantPromo.jsx

```jsx
import { useState } from "react";
import AiAssistantLink from "../ai/AiAssistantLink";

// AI 어시스턴트 안내 띠 (로그인 전 메인 · 시안)
// - 왼쪽: APPLE TV / 제목 / 설명,  오른쪽: 흰 카드(취향 칩 + 맞는 작품 찾기)
// - 선택한 취향을 전달하여 AI 팝업을 엽니다.
const TASTES = ["편안한 힐링", "몰입감 있는", "가볍게 웃는"];

const AiAssistantPromo = () => {
  const [taste, setTaste] = useState(null);

  return (
    <section className="ai-promo">
      <div className="ai-promo-band">
        <div className="inner">
          <div className="ai-promo-text">
            <p className="ai-promo-eyebrow">APPLE TV</p>
            <h3 className="ai-promo-title">오늘의 취향을 발견하세요.</h3>
            <p className="ai-promo-desc">
              기분과 취향에 맞는 작품을 AI가 추천해 드려요.
              <br />
              지금 나에게 맞는 이야기를 찾아보세요.
            </p>
          </div>

          <div className="ai-promo-card">
            <h4 className="ai-promo-card-title">AI Assistant</h4>
            <p className="ai-promo-card-sub">단 3일간의 무료체험</p>

            <ul className="ai-promo-chips" aria-label="취향 선택">
              {TASTES.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    className={`ai-promo-chip${taste === t ? " active" : ""}`}
                    aria-pressed={taste === t}
                    onClick={() => setTaste(taste === t ? null : t)}
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>

            <p className="ai-promo-question">무엇을 보고 싶으세요?</p>
            <AiAssistantLink initialTaste={taste} className="ai-promo-btn">
              맞는 작품 찾기
            </AiAssistantLink>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiAssistantPromo;

```

### src/pages/Home.jsx

```jsx
// src/pages/Home.jsx
import React, { useEffect } from "react";
import { useMovieStore } from "../store/useMovieStore";
import HeroSection from "../components/landing/HeroSection";
import ValueProps from "../components/landing/ValueProps";
import Top10Section from "../components/landing/Top10Section";
import UpcomingSection from "../components/landing/UpcomingSection";
import AppleOriginals from "../components/landing/AppleOriginals";
import AiAssistantPromo from "../components/landing/AiAssistantPromo"; // [추가] 시안: AI 어시스턴트 안내 띠
import SubscribeCTA from "../components/landing/SubscribeCTA"; // 구독 유도 CTA (로그인 전 메인에만 표시)
import DeviceGuide from "../components/landing/DeviceGuide";
import MemberHome from "../components/member/MemberHome"; // [추가] 로그인 후 메인
import { useAuthStore } from "../store/useAuthStore"; // [추가] 로그인 상태
// import MovieSlider from "../components/common/MovieSlider"; // 영화/TV 슬라이더 (임시 숨김)

const Home = () => {
  // const { popMovie, onFetchPopular, tvs, onFetchTv } = useMovieStore();
  const { onFetchPopular } = useMovieStore();

  useEffect(() => {
    onFetchPopular();
    // onFetchTv(); // 영화/TV 슬라이더 복구 시 함께 주석 해제
  }, [onFetchPopular]);

  // [추가] 로그인 사용자가 확인되면 같은 홈(/)에서 로그인 후 메인(MemberHome)을 보여줌
  const user = useAuthStore((s) => s.user);
  if (user) return <MemberHome userName={user.name} />;

  return (
    <main className="page-fade">
      {/* 1. 상단 히어로 섹션 */}
      <HeroSection />

      {/* 2. 핵심 혜택 (Apple TV 설명, 링크 없음) */}
      <ValueProps />

      {/* 3. TOP 10 (호버 시 제목/평점) */}
      <Top10Section />

      {/* 4. 공개예정작 (알림 받기) */}
      <UpcomingSection />

      {/* 5. 오리지널스 */}
      <AppleOriginals />

      {/* 6. AI 어시스턴트 안내 띠 (시안: 구독 CTA 자리) */}
      <AiAssistantPromo />

      {/* 7. 구독 유도 CTA — 로그인 전에만 보임 (로그인하면 위의 MemberHome 으로 바뀌어 자동으로 숨겨짐) */}
      <SubscribeCTA type="tv" />

      {/* 8. 기기 안내 (마지막 섹션, 아래는 푸터) */}
      <DeviceGuide />

      {/* 인기 영화 슬라이더 (임시 숨김)
      <MovieSlider movies={popMovie} title="지금 뜨는 영화" />
      */}

      {/* 인기 TV 프로그램 슬라이더 (임시 숨김)
      <MovieSlider movies={tvs} title="Apple TV+ 인기 시리즈" />
      */}
    </main>
  );
};

export default Home;

```


### src/components/member/MoodAssistant.jsx

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMovieStore } from "../../store/useMovieStore";
import { SwiperSlide } from "swiper/react";
import Rail from "../common/Rail";
import { img, genreText, detailPath } from "./memberUtils";
import AiAssistantPopup from "../ai/AiAssistantPopup";

// useMovieStore 의 MOOD_GENRES 키와 동일해야 함
const MOODS = ["심심한", "힘든", "슬픈", "즐거움", "화남"];

const MoodAssistant = ({ userName = "회원" }) => {
  const [mood, setMood] = useState(MOODS[0]);
  const [aiOpen, setAiOpen] = useState(false);
  const list = useMovieStore((s) => s.moodList[mood]);
  const onFetchMood = useMovieStore((s) => s.onFetchMood);

  useEffect(() => {
    onFetchMood(mood);
  }, [mood, onFetchMood]);

  return (
    <section className="member-section member-mood">
      <div className="inner">
        <div className="member-head">
          <div>
            <h2 className="member-title">AI 어시스턴트</h2>
            <p className="member-desc">오늘의 기분을 골라보세요</p>
          </div>
          <Link to="/recommend" className="member-more">더보기</Link>
        </div>

        <div className="member-chips" role="group" aria-label="기분 선택">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              className={`member-chip${m === mood ? " active" : ""}`}
              aria-pressed={m === mood}
              onClick={() => setMood(m)}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="member-notice">
          <p>{userName}님의 기분에 맞춰 추천하는 콘텐츠입니다.</p>
          <button type="button" className="member-btn" aria-haspopup="dialog" aria-expanded={aiOpen} onClick={() => setAiOpen(true)}>
            <span className="ui-icon ui-icon-plus" aria-hidden="true" />
            취향 더 반영하기
          </button>
        </div>

        <Rail bleed={false} className="rail-mood" label="기분별 추천">
          {(list ? list.slice(0, 10) : Array.from({ length: 5 })).map((tv, i) =>
            tv ? (
              <SwiperSlide key={tv.id}>
                <Link to={detailPath("tv", tv.id)} className="member-card">
                  <div className="member-thumb portrait">
                    {/* 가로형(16:9) 카드라 태블릿·모바일은 backdrop 이미지 사용 */}
                    <picture>
                      {tv.backdrop_path && (
                        <source
                          media="(max-width: 1024px)"
                          srcSet={img(tv.backdrop_path, "w780")}
                        />
                      )}
                      <img src={img(tv.poster_path, "w500")} alt={tv.name} loading="lazy" />
                    </picture>
                  </div>
                  <h3 className="member-card-title">{tv.name}</h3>
                  <span className="member-card-meta">{genreText(tv.genre_ids)}</span>
                  <span className="member-card-meta member-clamp">{tv.overview}</span>
                  <span className="member-card-link">상세보기 <img className="ui-icon ui-icon-arrow" src="/icons/nav/right-nav.svg" alt="" aria-hidden="true" /></span>
                </Link>
              </SwiperSlide>
            ) : (
              <SwiperSlide key={`sk_${i}`} aria-hidden="true">
                <div className="member-thumb portrait skeleton" />
              </SwiperSlide>
            ),
          )}
        </Rail>
      </div>
      {aiOpen && <AiAssistantPopup onClose={() => setAiOpen(false)} />}
    </section>
  );
};

export default MoodAssistant;

```
