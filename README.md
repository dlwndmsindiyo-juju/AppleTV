# Apple TV OTT Renewal

Apple TV의 시네마틱한 화면 경험을 바탕으로 작품 탐색, 프로필별 보관과 이어보기, 스포츠 콘텐츠를 구현한 비공식 OTT 웹 리뉴얼 팀 프로젝트입니다.

[배포 사이트](https://apple-tv-redesign.vercel.app/)

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| OTT 홈 | 히어로 슬라이드, 인기 콘텐츠, 무료 체험 안내 |
| 스포츠 홈 | 예정된 경기, 숏폼, 관심 구단, 리그 순위, 다시보기 |
| 통합 검색 | 영화·TV·인물 검색, 장르와 국내 시청 가능 여부를 참고할 수 있는 탐색 UI |
| AI 어시스턴트 | 장르·분위기·시청 시간에 맞춘 규칙 기반 추천, 조건 확장과 완화된 기준 표시 |
| 인증·프로필 | Firebase 이메일·Google 로그인, 프로필 관리 |
| 위시리스트 | 프로필별 작품과 그룹 관리, 낙관적 업데이트와 실패 복구 |
| 이어보기 | YouTube 영상의 ID·재생 위치·길이 저장과 미완료 영상의 위치 복원 |
| TV 미리보기 | 홈의 ‘TV 디자인 보기’ 또는 `/tv`에서 접근하는 웹 TV UI |
| 구독 | 플랜 선택 및 구독 상태 저장 데모 |

### AI 어시스턴트

`src/components/ai/recommendationEngine.mjs`가 정적 카탈로그를 평가합니다. 선택한 장르, 편집된 분위기 점수, 작품 또는 샘플 회차 길이를 기준으로 기본 결과를 구성합니다. 사용자가 ‘조건 넓혀서 추천받기’를 선택하면 연관 작품과 달라진 기준을 표시합니다. 이 추천 경로는 앱 내부 규칙 엔진으로 실행됩니다.

## 기술 스택

- React, Vite, React Router, Zustand
- SCSS, Swiper
- Firebase Authentication, Cloud Firestore, Firebase Functions
- TMDB, YouTube IFrame API, 스포츠 데이터 API
- Vercel

## 프로젝트 구조

```text
src/
  App.jsx                라우팅
  components/ai/         추천 UI, 카탈로그, 추천 엔진
  components/            공통 UI 및 기능별 컴포넌트
  pages/                 라우트 화면
  store/                 기능별 Zustand 상태
  firebase/              Firebase 초기화
functions/               코드 확인과 데모 구독 함수 소스
firestore.rules          Firestore 접근 규칙
firestore.indexes.json    Firestore 복합 인덱스
vercel.json              SPA 경로 재작성
```

## 로컬 실행

전체 저장소를 받은 후 프로젝트의 잠금 파일에 맞춰 의존성을 설치합니다. 공유된 압축본은 일부 소스와 설정이며, 실행에는 전체 저장소의 `package.json`, 잠금 파일, `index.html`, Vite 설정과 정적 자산이 필요합니다.

```bash
npm ci
npm run dev
npm run build
```

루트에 `.env.local`을 만들고 사용하는 기능의 값을 설정합니다. 소스의 변수명 철자와 대소문자를 따릅니다.

```dotenv
VITE_TMDB_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGEING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_YOUTUBE_API_KEY=
VITE_FOOTBALL_API_KEY=
VITE_FOOTBALL_BASE=
VITE_SPORTS_API_KEY=
VITE_SPORTSDB_BASE=
VITE_OMDb_API_KEY=
VITE_KAKAO_JS_KEY=
```

`VITE_*`는 클라이언트에 공개될 수 있는 설정에 사용합니다. 비밀 유지가 필요한 값은 서버 환경변수에서 관리합니다. Football API의 개발 기본 경로를 사용하는 경우 전체 저장소의 프록시 설정을 확인합니다.

## 배포와 Firebase

1. Vercel에서 Vite 프로젝트를 빌드하고 `dist`를 배포합니다. 필요한 환경변수는 빌드 전에 등록합니다.
2. `vercel.json`이 Vercel의 프로젝트 루트에 포함되는지 확인합니다. 앱은 SPA rewrite를 사용합니다.
3. Firebase에서 이메일·Google 제공자와 승인 도메인을 설정합니다.
4. 대상 Firebase 프로젝트에 Firestore 규칙과 인덱스를 적용합니다. 이어보기 쿼리는 `watchHistory`의 `profileId` 오름차순과 `updatedAt` 내림차순 복합 인덱스를 사용합니다.
5. Functions를 배포할 경우 전체 저장소에서 `firebase.json`, Functions 패키지·런타임 설정과 메일 발송 구성을 확인합니다. 공유된 Functions 압축본에는 JavaScript 소스가 포함되어 있습니다.

## 구현 및 검증 범위

- **공개 배포**  OTT 홈, 스포츠 홈 직접 접속, 작품 검색과 구독 안내, `/tv` 직접 접속과 새로고침을 확인했습니다. AI 어시스턴트 추가 조건 진입은 비로그인 상태에서 구독 안내가 표시됩니다.
- **추천 엔진**  최신 카탈로그의 고유 작품 187개와 단일 장르 기준 120개 조건 조합을 검사했습니다. 23개 조합에서 기본 결과가 비어 있었으며, 범위를 넓히는 흐름을 제공합니다.
- **데모 범위**  구독은 플랜 선택과 상태 저장 데모입니다. 동영상 재생은 YouTube 기반입니다. 코드 확인 클라이언트는 데모 모드이며 실제 메일 전달 검증이 필요합니다.
- **추가 확인**  로그인 후 저장·복원, Firebase 규칙·인덱스·Functions 배포 상태, 실제 TV 기기 동작, 전체 프로젝트 신규 설치와 빌드·린트.

## 기여 및 개발 도구

이주은은 팀 프로젝트에서 프론트엔드 개발 약 95%를 담당했으며 페이지, 공통 UI, 라우팅과 상태 관리의 초기 구조를 설계했습니다. 개발 과정에 Claude를 활용했고, Codex는 Figma 디자인을 참고한 작업과 소스·배포 코드 리뷰에 사용했습니다.

## 크레딧

Apple 브랜드와 작품 이미지·영상의 권리는 각 권리자에게 있습니다. 이 프로젝트는 학습 및 포트폴리오 목적으로 제작했습니다.

This product uses the TMDB API but is not endorsed or certified by TMDB.
