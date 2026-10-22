// functions/index.js 에 추가 (firebase-functions v2 기준)
// 결제 없는 UI 전용 구독: 실제 결제가 아니라 subscription 필드만 기록합니다.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const DAY = 24 * 60 * 60 * 1000;
const PERIOD = { monthly: 30 * DAY, yearly: 365 * DAY };

// region 은 클라이언트 getFunctions(app, "리전") 과 반드시 같아야 함
exports.startTrial = onCall({ region: "asia-northeast3" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const plan = request.data?.plan;
  if (!["monthly", "yearly"].includes(plan)) {
    throw new HttpsError("invalid-argument", "올바른 플랜을 선택해주세요.");
  }

  const ref = getFirestore().doc(`users/${request.auth.uid}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "사용자 정보를 찾을 수 없습니다.");

  const user = snap.data();
  if (!user.emailCodeVerified && !request.auth.token.firebase?.sign_in_provider?.includes("google")) {
    throw new HttpsError("failed-precondition", "이메일 인증을 먼저 완료해주세요.");
  }

  const sub = user.subscription;
  const exp = sub?.expiresAt?.toMillis?.() ?? 0;
  if (sub && ["active", "trial"].includes(sub.status) && exp > Date.now()) {
    throw new HttpsError("already-exists", "이미 구독 중입니다.");
  }

  // 첫 구독: 7일 체험(trial) / 체험 이력이 있으면 재구독(active, 결제 없이 기간만 부여)
  const firstTime = !user.trialUsed;
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + (firstTime ? 7 * DAY : PERIOD[plan]));

  await ref.update({
    trialUsed: true,
    subscription: {
      status: firstTime ? "trial" : "active",
      plan,
      startedAt: Timestamp.fromMillis(now),
      expiresAt,
    },
  });
  return { ok: true };
});
