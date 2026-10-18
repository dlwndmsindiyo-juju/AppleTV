import React from "react";

// 기기 안내 (구독 서비스 / 앱 / 4K 의 차이)
const deviceItems = [
  { name: "구독 서비스", desc: "Apple Originals 시청" },
  { name: "Apple TV 앱", desc: "작품 화면에서 콘텐츠 이용" },
  { name: "Apple TV 4K", desc: "TV에 연결하는 스트리밍 기기" },
];

const deviceLinks = [
  { label: "세 가지 차이 보기", path: "#" },
  { label: "내 기기에서 보는 방법", path: "#" },
];

const DeviceGuide = () => {
  return (
    <section className="device-guide">
      <div className="inner device-guide-inner">
        {/* 좌측: 제목 */}
        <div className="device-guide-head">
          <h3 className="device-guide-title">
            Apple TV, 앱, Apple TV 4K.
            <br />
            이름은 비슷해도 역할은 달라요.
          </h3>
          <p className="device-guide-sub">
            구독, 앱, 기기의 차이를 한눈에 확인해 보세요.
          </p>
        </div>

        {/* 우측: 설명 + 링크 */}
        <div className="device-guide-body">
          <ul className="device-guide-list">
            {deviceItems.map((item) => (
              <li key={item.name}>
                {item.name} — {item.desc}
              </li>
            ))}
          </ul>

          <ul className="device-guide-links">
            {deviceLinks.map((link) => (
              <li key={link.label}>
                <a href={link.path}>
                  {link.label} <span aria-hidden="true">›</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default DeviceGuide;
