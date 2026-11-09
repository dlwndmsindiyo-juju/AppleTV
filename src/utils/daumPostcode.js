// src/utils/daumPostcode.js
// [추가] 도로명 주소 검색 팝업 (카카오 · Daum 우편번호 서비스) — 키 발급 · 가입 없이 무료
// - 스크립트를 처음 누를 때 한 번만 불러옴 (페이지를 열 때마다 받지 않음)
// - openPostcode() → 사용자가 주소를 고르면 { sido, sigungu, road, postal, full } · 닫으면 null
//   sido · sigungu 는 청구 주소 선택 상자(data/koreaRegions.js) 이름에 맞춰서 돌려줌
// - 안내: https://postcode.map.daum.net/guide
import { KOREA_REGIONS, SIDO_LIST } from "../data/koreaRegions";

const SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let loading = null;

const loadScript = () => {
  if (window.daum?.Postcode) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error("주소 검색을 불러오지 못했어요."));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
};

// Daum 은 시/도를 짧게 줄 때가 있음 ("서울" · "경기" · "충북") → 선택 상자 이름으로
const SHORT_SIDO = {
  충북: "충청북도",
  충남: "충청남도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
};
const toSido = (name = "") => SHORT_SIDO[name] || SIDO_LIST.find((x) => x === name || x.startsWith(name)) || "";

// "성남시 분당구" → 목록에 있는 "성남시" · 세종은 시/군/구가 비어 있음
const toSigungu = (sido, name = "") => {
  const list = KOREA_REGIONS[sido] || [];
  if (!name) return list.length === 1 ? list[0] : "";
  return list.find((x) => x === name) || list.find((x) => name.startsWith(`${x} `) || name.startsWith(x)) || "";
};

export const openPostcode = async () => {
  await loadScript();
  return new Promise((resolve) => {
    let picked = false;
    new window.daum.Postcode({
      oncomplete: (data) => {
        picked = true;
        const full = data.roadAddress || data.autoRoadAddress || data.address || "";
        const prefix = [data.sido, data.sigungu].filter(Boolean).join(" ");
        const road = (full.startsWith(`${prefix} `) ? full.slice(prefix.length + 1) : full).trim();
        // 건물 이름이 있으면 괄호로 덧붙임 (예: 테헤란로 152 (강남파이낸스센터))
        const building = data.buildingName && data.apartment === "Y" ? ` (${data.buildingName})` : "";
        const sido = toSido(data.sido);
        resolve({
          sido,
          sigungu: toSigungu(sido, data.sigungu),
          road: `${road}${building}`,
          postal: data.zonecode || "",
          full,
        });
      },
      onclose: () => {
        if (!picked) resolve(null);
      },
    }).open({ popupTitle: "도로명 주소 검색" });
  });
};
