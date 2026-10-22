// 팀 팔로우 별 아이콘 (star-btn.svg 를 그대로 옮김)
// - 색은 currentColor, 팔로우 중(filled)이면 안쪽까지 채움
const StarIcon = ({ filled = false, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8.00049 11.8346L3.88583 13.998L4.67183 9.41597L1.3385 6.17127L5.9385 5.5046L7.99583 1.33594L10.0532 5.5046L14.6532 6.17127L11.3198 9.41597L12.1058 13.998L8.00049 11.8346Z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default StarIcon;
