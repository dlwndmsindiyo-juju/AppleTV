import React from "react";

// Apple TV 핵심 혜택 (설명용이라 링크 없이 span 으로 처리)
const valueProps = [
  { title: "오직 Apple에서 만나는 이야기", desc: "Apple Originals만의 독창적인 시리즈와 영화" },
  { title: "광고 없이, 이야기 속으로", desc: "작품에 온전히 집중할 수 있는 몰입의 순간" },
  { title: "어디서든 이어지는 감상", desc: "다양한 기기에서 끊김 없이 이어지는 시청 경험" },
];

const ValueProps = () => {
  return (
    <section className="value-props">
      <div className="inner value-props-inner">
        {valueProps.map((item) => (
          <div className="value-prop-item" key={item.title}>
            <span className="value-prop-title">{item.title}</span>
            <span className="value-prop-desc">{item.desc}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ValueProps;
