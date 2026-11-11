# Apple TV Redesign

Apple TV의 시네마틱한 화면 경험을 참고해 콘텐츠 검색,
프로필별 위시리스트, 이어보기와 조건 기반 추천을 구현한
OTT 웹 리디자인 프로젝트입니다.

[배포 사이트](https://apple-tv-redesign.vercel.app/)

학습·포트폴리오 목적의 비공식 프로젝트입니다.
Apple의 공식 서비스가 아니며 실제 결제와 본편 스트리밍을 제공하지 않습니다.

## 주요 기능

| 영역 | 구현 내용 |
| --- | --- |
| 홈 | 로그인 상태에 따른 화면 분기, 히어로·콘텐츠 레일 |
| 검색 | 영화·TV·인물 병렬 검색, 장르 검색, 최근 검색 |
| 작품 정보 | 상세 정보, 예고편, 관련 작품, 대한민국 제공사 정보 |
| 인증·프로필 | Firebase 이메일·Google 로그인, 최대 5개 프로필 관리 |
| 위시리스트 | 프로필별 작품·그룹 관리, 실시간 연결, 낙관적 업데이트 |
| 이어보기 | 영상 ID·재생 위치·길이 저장, 미완료 영상 위치 복원 |
| 추천 | 장르·분위기·시간 기반 추천, 추천 이유와 조건 확장 |
| 스포츠 | 팀·경기·순위·영상 화면, 외부 API와 목업 데이터 |
| 계정 | 데모 구독, 지불 방법 표시 정보, 청구 주소·사용자 설정 |
| TV | `/tv` 웹 기반 TV UI 미리보기 |

## 기술 스택

- React · Vite · React Router
- Zustand
- Firebase Authentication · Cloud Firestore · Firebase Functions
- SCSS · Swiper
- TMDB · YouTube · 스포츠 관련 외부 API
- Vercel

정확한 설치 버전은 최종 저장소의 package-lock.json을 기준으로 합니다.

## 구현 범위

- 추천은 정적 카탈로그와 규칙 기반 엔진을 사용하며 LLM을 호출하지 않습니다.
- 영상은 YouTube IFrame API로 재생합니다.
- 구독은 플랜 선택과 상태 저장을 위한 데모이며 PG 결제는 포함하지 않습니다.
- 추가 코드 확인은 현재 데모 모드입니다.
- 이메일 코드 발송·검증 서버 소스와 실제 배포·메일 전달 여부는 별개입니다.
- 제공사 정보는 TMDB의 대한민국 데이터를 참고하며 실제 이용 권한을 보장하지 않습니다.
- 스포츠 화면에는 외부 API와 목업 데이터가 함께 사용됩니다.
- `/tv`는 스마트 TV 네이티브 앱이 아닌 웹 미리보기입니다.

## 폴더 구조

```text
src/
  components/          # 공용·추천·검색·스포츠·TV 등 UI
  pages/               # 라우트별 화면
  store/               # 도메인별 Zustand 상태
  firebase/            # Firebase 초기화
  data/                # 정적·목업 데이터
  utils/               # 공통 유틸리티
functions/
  index.js             # 코드 발송·검증 및 데모 구독 함수
  startTrial.js        # 별도 구독 예시
docs/ai-data/          # 추천 데이터·출처·조합·검증 스크립트
firestore.rules
firestore.indexes.json
eslint.config.js
```

## 로컬 실행

전체 저장소가 필요합니다. 공유된 src와 일부 설정만으로는 실행할 수 없습니다.
package.json, 잠금 파일, index.html, Vite 설정과 public 자산을 함께 준비합니다.

Vite 지원 범위에 맞는 Node.js를 사용합니다.
이번 검토는 Node.js 24.22.1과 기존 설치 의존성으로 진행했습니다.

```bash
npm ci
npm run dev
```

빌드·미리보기·정적 검사:

```bash
npm run build
npm run preview
npm run lint
```

## 환경변수

프로젝트 루트에 `.env.local`을 생성합니다.

```dotenv
VITE_TMDB_API_KEY=

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGEING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# 기능별 추가 설정
VITE_YOUTUBE_API_KEY=
VITE_FOOTBALL_API_KEY=
VITE_FOOTBALL_BASE=
VITE_SPORTS_API_KEY=
VITE_SPORTSDB_BASE=
VITE_OMDb_API_KEY=
VITE_KAKAO_JS_KEY=
```

`MESSAGEING`과 `OMDb`는 현재 소스의 철자·대소문자를 따릅니다.
변경할 경우 코드와 배포 설정을 함께 수정해야 합니다.

VITE_* 값은 브라우저 번들에 포함됩니다.
서버 전용 비밀키를 넣지 않으며, 비밀 유지가 필요한 API는 서버에서 호출합니다.
실제 값은 커밋하지 않고 변수명만 `.env.example`로 공유합니다.

## Firebase 설정

1. Firebase 웹 앱을 등록하고 환경변수를 설정합니다.
2. 이메일·비밀번호 및 Google 로그인 제공자를 활성화합니다.
3. 로컬·배포 도메인을 Authentication 승인 도메인에 등록합니다.
4. Firestore 규칙과 인덱스를 해당 프로젝트에 적용합니다.
5. 실제 로그인·저장·프로필 전환 흐름을 확인합니다.

제공된 규칙은 watchHistory의 profileId 저장과
해당 필드만 추가하는 기존 기록 이관을 허용합니다.

제공된 복합 인덱스:

- 컬렉션 범위: watchHistory
- profileId: ASCENDING
- updatedAt: DESCENDING

파일 포함과 실제 배포·인덱스 생성 완료는 구분해야 합니다.

Firebase CLI 프로젝트 연결과 firebase.json의 경로 매핑을 준비한 경우:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

공유 자료에는 firebase.json과 Functions용 package.json이 없습니다.
Functions 배포에는 별도 패키지·런타임·엔트리 설정이 필요합니다.

### 실제 이메일 코드 인증

- 클라이언트와 서버 리전: asia-northeast3
- Trigger Email from Firestore 확장 및 메일 발송 구성 필요
- 코드 유효시간: 5분
- 재전송 최소 간격: 60초
- 코드당 실패 시도: 최대 5회

코드 상태와 메일 작업을 같은 트랜잭션에 저장합니다.
메일 전달 자체의 성공을 보장하는 것은 아닙니다.

현재 클라이언트는 데모 모드이며 needsCode()는 이메일·비밀번호 계정을 제외합니다.
실제 인증을 사용하려면 진입 조건과 서버 강제 정책을 함께 설계해야 합니다.

## 스포츠 API 설정

개발 환경의 Football API 기본 경로는 `/football`입니다.
Vite 프록시 또는 서버 API 경로를 준비해야 합니다.

개발 프록시는 프로덕션에 자동 적용되지 않습니다.
배포에서도 키 보호와 CORS 정책을 고려한 호출 경로가 필요합니다.

## 핵심 구현

### 최신 검색 응답만 반영

영화·TV·인물 정보를 병렬 요청하고 요청 토큰을 비교합니다.
오래된 응답이 최신 검색 화면을 덮지 않도록 구성했습니다.

### 프로필별 위시리스트

작업 시작 시 계정·프로필·연결 번호를 고정합니다.
같은 작품의 저장은 큐로 순서를 관리하고,
실패 복구 시 현재 연결과 작업 버전을 확인합니다.

### 설명 가능한 추천

추천 엔진을 순수 함수로 분리했습니다.
조건 일치 여부, 추천 이유, 완화한 조건을 반환합니다.
기본 결과는 선택 조건을 유지하고 사용자가 조건 확장을 선택합니다.

### 재생 위치 복원

YouTube 플레이어에서 영상 ID·재생 위치·길이를 수집합니다.
같은 영상의 미완료 기록이 있으면 해당 위치에서 이어보도록 구성했습니다.

## 추천 데이터와 테스트

- 고유 작품: 187개
- 문서 데이터: 장르 6 × 분위기 4 × 시간 4 = 96개 조합
- 목록 내 후보: 총 1,920개 배치
- 현재 UI: 힐링을 포함해 단일 장르 기준 120개 조합

1,920개는 고유 작품 수가 아닙니다.
분위기 점수는 편집 기준이며 학습 모델의 확률이나 공식 평가가 아닙니다.

```bash
node docs/ai-data/tests.mjs
```

위 스크립트는 문서용 recommendations.mjs를 검사합니다.
앱의 recommendationEngine.mjs와 별도 파일이므로
실제 앱 엔진을 직접 검사하는 테스트도 유지해야 합니다.

## 배포

Vercel의 Vite 프로젝트 설정 기준:

- Build Command: npm run build
- Output Directory: dist
- 환경변수: 사용하는 기능에 맞춰 등록

환경변수 변경 후에는 재빌드·재배포합니다.
Firebase 규칙·인덱스·Functions 배포는 Vercel 프론트엔드 배포와 별도입니다.
중첩 경로 직접 접속과 새로고침을 확인하고 필요하면 SPA 재작성 규칙을 구성합니다.

## 검증 상태

2026-11-11 검토 기준:

- 업로드 소스와 기존 프로젝트 설정을 조합한 프로덕션 빌드 통과
- 전체 ESLint 오류 206개·경고 3개로 실패
- src 오류 195개, Functions 오류 11개
- 제공된 추천 테스트 통과
- 같은 96개 조합 검사를 앱 엔진에 연결해 통과 확인
- 앱 엔진 120개 조합의 조건 준수·결과 일관성 확인
- 이어보기 응답 순서 및 계정 전환 후 롤백 문제 재현

깨끗한 환경의 신규 설치, 실제 Firebase 배포 상태, 메일 전달,
전체 인증·저장 플로우와 모바일·TV 실기기 검증은 수행하지 않았습니다.
공개 배포본을 브라우저에서 추가 확인했습니다.

- OTT 홈의 히어로 슬라이드, 인기 콘텐츠, 무료 체험 안내를 확인했습니다.
- ‘테드 래소’ 검색 결과가 표시됐으며, 작품 선택 시 비로그인 상태에서 구독 안내가 열렸습니다.
- 홈의 추천 영역은 표시됐으며, ‘취향 더 반영하기’ 선택 시 구독 안내가 열렸습니다.
- Sport 메뉴에서 스포츠 홈으로 이동해 예정된 경기, 숏폼, 관심 구단, 리그 순위 섹션을 확인했습니다.
- 홈의 ‘TV 디자인 보기’로 TV 메뉴와 이용 안내 화면을 열 수 있었습니다. `/tv` 주소에 직접 접속하면 Vercel 404가 표시돼 배포 라우팅 확인이 필요합니다.

위 화면 확인은 비로그인 상태에서 진행했습니다.

## 개선 과제

- 이어보기 조회 실패 처리와 전역 호환 플래그 범위 개선
- 계정 전환·연속 작업을 고려한 낙관적 업데이트 복구
- 프론트엔드와 Functions 린트 설정 분리
- 페이지별 지연 로딩과 초기 번들 축소
- 전역 스타일 분리
- 실제 사용자 테스트를 통한 탐색 편의성과 추천 만족도 검증

## 크레딧

Apple 브랜드와 콘텐츠 이미지·영상의 권리는 각 권리자에게 있습니다.
공개 시 자산·API의 출처와 이용 조건을 확인하고 필요한 표기를 적용합니다.

This product uses the TMDB API but is not endorsed or certified by TMDB.

제공사 정보의 JustWatch 출처 표시는 해당 이용 조건에 맞게 적용합니다.
개발 기간·팀원·개인 기여 범위는 실제 작업 기록에 따라 기재합니다.
