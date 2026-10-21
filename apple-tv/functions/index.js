const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

// 클라이언트 getFunctions(app, REGION) 의 리전과 반드시 같아야 함
const REGION = "asia-northeast3";

const CODE_TTL_MS = 5 * 60 * 1000; // 코드 유효시간 5분
const RESEND_MS = 60 * 1000; // 재전송 최소 간격 60초
const MAX_ATTEMPTS = 5; // 코드당 최대 입력 시도
const TRIAL_DAYS = 7;

const hashCode = (uid, code) =>
    crypto.createHash("sha256").update(`${uid}:${code}`).digest("hex");

const requireAuth = (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    return req.auth;
};

// 1) 6자리 코드 생성 + 메일 발송
exports.sendVerificationCode = onCall({ region: REGION }, async (req) => {
    const { uid, token } = requireAuth(req);
    const email = token.email;
    if (!email) throw new HttpsError("failed-precondition", "이메일 정보가 없는 계정입니다.");

    const ref = db.doc(`emailCodes/${uid}`);
    const snap = await ref.get();
    const now = Date.now();

    if (snap.exists && now - snap.data().sentAt < RESEND_MS) {
        const wait = Math.ceil((RESEND_MS - (now - snap.data().sentAt)) / 1000);
        throw new HttpsError("resource-exhausted", `${wait}초 후에 다시 요청해주세요.`);
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    await ref.set({
        hash: hashCode(uid, code), // 코드 원문은 저장하지 않음
        sentAt: now,
        expiresAt: now + CODE_TTL_MS,
        attempts: 0,
    });

    // Firebase "Trigger Email from Firestore" 확장 프로그램이 mail 컬렉션을 감시해 발송
    await db.collection("mail").add({
        to: email,
        message: {
            subject: "[Apple TV] 인증번호 안내",
            text: `인증번호: ${code}\n5분 안에 입력해주세요.`,
            html: `<p>인증번호</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>5분 안에 입력해주세요.</p>`,
        },
    });

    return { ok: true };
});

// 2) 코드 검증 → 성공 시 emailCodeVerified 기록
exports.verifyVerificationCode = onCall({ region: REGION }, async (req) => {
    const { uid } = requireAuth(req);
    const code = String(req.data?.code ?? "");
    if (!/^\d{6}$/.test(code)) {
        throw new HttpsError("invalid-argument", "6자리 숫자를 입력해주세요.");
    }

    const ref = db.doc(`emailCodes/${uid}`);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new HttpsError("failed-precondition", "인증번호를 먼저 요청해주세요.");
    }

    const d = snap.data();
    if (Date.now() > d.expiresAt) {
        throw new HttpsError("failed-precondition", "인증번호가 만료되었습니다. 재전송해주세요.");
    }
    if (d.attempts >= MAX_ATTEMPTS) {
        throw new HttpsError(
            "resource-exhausted",
            "시도 횟수를 초과했습니다. 인증번호를 재전송해주세요."
        );
    }

    const given = Buffer.from(hashCode(uid, code));
    const saved = Buffer.from(d.hash);
    const match = given.length === saved.length && crypto.timingSafeEqual(given, saved);

    if (!match) {
        await ref.update({ attempts: FieldValue.increment(1) });
        throw new HttpsError("invalid-argument", "인증번호가 올바르지 않습니다.");
    }

    await db.doc(`users/${uid}`).set(
        { emailCodeVerified: true, emailVerifiedAt: FieldValue.serverTimestamp() },
        { merge: true }
    );
    await ref.delete();
    return { ok: true };
});

// 3) 7일 무료구독 시작 (계정당 1회)
exports.startTrial = onCall({ region: REGION }, async (req) => {
    const { uid, token } = requireAuth(req);
    const ref = db.doc(`users/${uid}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("failed-precondition", "사용자 정보를 찾을 수 없습니다.");

    const data = snap.data();
    const isPasswordUser = token.firebase?.sign_in_provider === "password";
    if (isPasswordUser && !data.emailCodeVerified) {
        throw new HttpsError("permission-denied", "이메일 인증을 먼저 완료해주세요.");
    }
    if (data.subscription) {
        throw new HttpsError("already-exists", "이미 구독 이력이 있는 계정입니다.");
    }

    const now = Date.now();
    await ref.set(
        {
            subscription: {
                status: "trial",
                startedAt: Timestamp.fromMillis(now),
                expiresAt: Timestamp.fromMillis(now + TRIAL_DAYS * 24 * 60 * 60 * 1000),
            },
        },
        { merge: true }
    );
    return { ok: true };
});
