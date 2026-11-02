import React from "react";

// 기기 안내 — 시안 "TV 화면에서도 시청하세요."
// - 로그인 전 홈(Home.jsx) · 로그인 후 홈(MemberHome.jsx) 공용 (마지막 섹션, 아래는 푸터)
// - 가운데: Apple TV 로고 → 제목 → 설명
// - TV · 스트리밍 기기 로고 띠: 화면 끝에서 끝까지 왼쪽으로 계속 흘러감 (같은 목록을 두 번 이어 붙여 끊김 없이 반복)
//   · 마우스를 올리면 멈춤 / 기기의 '동작 줄이기' 설정이면 멈춘 상태로 표시
// - 아래: 이동 중 시청 안내 + Apple 지원 페이지 링크(새 탭) + 기기 아이콘 7개 (아이콘 안에 이름 포함)
// - 이미지: public/icons/devices/*.svg

// 흐르는 로고 (h: svg 원래 높이 — 같은 비율로 줄이기 위해 사용)
const TV_LOGOS = [
  { file: "4k-apple-tv.svg", name: "Apple TV 4K", h: 71 },
  { file: "samsung-smart-tv.svg", name: "Samsung Smart TV", h: 82 },
  { file: "lg-smart-tv.svg", name: "LG Smart TV", h: 82 },
  { file: "vizio.svg", name: "VIZIO", h: 82 },
  { file: "sony.svg", name: "SONY", h: 82 },
  { file: "xfinity.svg", name: "xfinity", h: 82 },
  { file: "roku.svg", name: "Roku", h: 82 },
  { file: "fire-tv.svg", name: "fire tv", h: 82 },
  { file: "google-tv.svg", name: "Google TV", h: 82 },
  { file: "play-station.svg", name: "PlayStation", h: 82 },
  { file: "xbox.svg", name: "XBOX", h: 82 },
  { file: "hisense.svg", name: "Hisense", h: 82 },
  { file: "tcl.svg", name: "TCL", h: 82 },
];

// 이동 중 시청 기기 (아이콘 안에 이름 글자가 들어 있음 · w: svg 원래 폭 — 같은 비율로 줄이기 위해 사용)
const MOBILE_DEVICES = [
  { file: "iphone.svg", w: 70, name: "iPhone" },
  { file: "ipad.svg", w: 72, name: "iPad" },
  { file: "mac-window.svg", w: 102, name: "Mac 및 Windows" },
  { file: "apple-vision-pro.svg", w: 102, name: "Apple Vision Pro" },
  { file: "airplay.svg", w: 43, name: "AirPlay" },
  { file: "android.svg", w: 49, name: "Android" },
  { file: "web.svg", w: 42, name: "웹" },
];

const ICON_PATH = "/icons/devices/";
const HELP_LINK = "https://support.apple.com/ko-kr/guide/tvapp/welcome/web";

const LogoList = ({ hidden = false }) => (
  <ul className="watch-logo-list" aria-hidden={hidden || undefined}>
    {TV_LOGOS.map((logo) => (
      <li key={logo.file} className="watch-logo" style={{ "--logo-h": logo.h }}>
        <img src={`${ICON_PATH}${logo.file}`} alt={hidden ? "" : logo.name} loading="lazy" />
      </li>
    ))}
  </ul>
);

const DeviceGuide = () => {
  return (
    <section className="device-guide device-guide--watch">
      <div className="inner watch-head">
        <img className="watch-logo-main" src="/icons/shorts/logo_w.svg" alt="Apple TV" />
        <h3 className="watch-title">TV 화면에서도 시청하세요.</h3>
        <p className="watch-desc">Apple TV는 Apple 기기, 스마트 TV, Apple TV app 에서도 시청하실 수 있습니다.</p>
      </div>

      {/* 흐르는 로고 띠 (화면 전체 폭) */}
      <div className="watch-marquee">
        <div className="watch-track">
          <LogoList />
          <LogoList hidden />
        </div>
      </div>

      <div className="inner watch-mobile">
        <h4 className="watch-subtitle">이동 중에도 시청할 수 있습니다.</h4>
        <a className="watch-link" href={HELP_LINK} target="_blank" rel="noopener noreferrer">
          Apple TV를 시청할 수 있는 모든 방법 보기
          <span className="watch-link-arrow" aria-hidden="true">›</span>
        </a>

        <ul className="watch-devices">
          {MOBILE_DEVICES.map((device) => (
            <li key={device.file} className="watch-device" style={{ "--icon-w": device.w }}>
              <img src={`${ICON_PATH}${device.file}`} alt={device.name} loading="lazy" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default DeviceGuide;
