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

// ---------------------------------------------------------------------
// [수정] 인증 코드 발송 · 검증을 트랜잭션으로 (리뷰 P2 · 실제 이메일 인증을 켜기 전에 필요)
// - 예전: 재전송 간격 확인 → 저장, 시도 횟수 확인 → 증가, 성공 → 삭제가 각각 따로 실행
//   → 동시에 요청하면 60초 · 5회 제한을 넘거나, 검증 중 재전송된 새 코드가 지워질 수 있었음
// - 지금: 읽기와 쓰기를 한 트랜잭션에서 처리 (동시에 바뀌면 Firestore 가 트랜잭션을 다시 실행)
//   · 발송: 60초 간격 확인 + 새 코드 저장 + 메일 작업(mail 문서) 생성을 한 번에 → 코드만 바뀌고 메일이 안 가는 일 없음
//   · 검증: 만료 · 시도 횟수 · 코드 비교 · 실패 횟수 증가 · 성공 시 인증 기록 + 코드 삭제를 한 번에
//     → 실패 횟수는 트랜잭션을 정상 커밋한 뒤 바깥에서 오류를 던짐 (안에서 throw 하면 증가가 취소됨)
//   · 코드마다 version 을 둬서, 검증하는 사이 재전송으로 바뀐 새 코드는 이전 검증이 지우지 않음
//     (트랜잭션이 같은 문서를 다시 읽어 확인하므로 이전 코드 기준의 삭제는 커밋되지 않음)
// - 메일 발송: "Trigger Email from Firestore" 확장이 mail 문서를 보고 보냄 (outbox)
//   · 확장이 실패를 mail 문서의 delivery.state = "ERROR" 로 남김 → 사용자는 60초 뒤 [재전송]으로 새 코드 · 새 메일
// ---------------------------------------------------------------------

// 1) 6자리 코드 생성 + 메일 발송
exports.sendVerificationCode = onCall({ region: REGION }, async (req) => {
    const { uid, token } = requireAuth(req);
    const email = token.email;
    if (!email) throw new HttpsError("failed-precondition", "이메일 정보가 없는 계정입니다.");

    const ref = db.doc(`emailCodes/${uid}`);
    const mailRef = db.collection("mail").doc(); // 메일 작업 id 를 먼저 만들어 트랜잭션 안에서 생성

    // 트랜잭션은 충돌하면 다시 실행되므로, 코드도 실행할 때마다 새로 만듦 (마지막으로 커밋된 것만 남음)
    const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();
        if (snap.exists && now - snap.data().sentAt < RESEND_MS) {
            return { wait: Math.ceil((RESEND_MS - (now - snap.data().sentAt)) / 1000) };
        }

        const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
        tx.set(ref, {
            hash: hashCode(uid, code), // 코드 원문은 저장하지 않음
            version: crypto.randomUUID(), // [추가] 코드 버전
            sentAt: now,
            expiresAt: now + CODE_TTL_MS,
            attempts: 0,
        });
        // [수정] 메일 작업도 같은 트랜잭션에서 생성 (outbox)
        tx.create(mailRef, {
            to: email,
            message: {
                subject: "[Apple TV] 인증번호 안내",
                text: `인증번호: ${code}\n5분 안에 입력해주세요.`,
                html: `<p>인증번호</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>5분 안에 입력해주세요.</p>`,
            },
            uid,
            createdAt: FieldValue.serverTimestamp(),
        });
        return { ok: true };
    });

    if (result.wait) {
        throw new HttpsError("resource-exhausted", `${result.wait}초 후에 다시 요청해주세요.`);
    }
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
    const userRef = db.doc(`users/${uid}`);

    // 트랜잭션 안에서는 throw 하지 않고 결과만 돌려줌 → 실패 횟수 증가가 커밋된 뒤 바깥에서 오류
    const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return { error: "missing" };

        const d = snap.data();
        if (Date.now() > d.expiresAt) return { error: "expired" };
        if (d.attempts >= MAX_ATTEMPTS) return { error: "locked" };

        const given = Buffer.from(hashCode(uid, code));
        const saved = Buffer.from(d.hash);
        const match = given.length === saved.length && crypto.timingSafeEqual(given, saved);

        if (!match) {
            // 읽은 값 기준으로 증가 → 동시에 들어온 실패도 트랜잭션 재실행으로 하나씩 셈
            tx.update(ref, { attempts: d.attempts + 1 });
            return { error: "wrong" };
        }

        // 성공: 인증 기록 + 코드 삭제(소비)를 한 번에 — 이 트랜잭션이 읽은 그 코드(version)일 때만 커밋됨
        tx.set(
            userRef,
            { emailCodeVerified: true, emailVerifiedAt: FieldValue.serverTimestamp() },
            { merge: true }
        );
        tx.delete(ref);
        return { ok: true };
    });

    if (result.error === "missing") {
        throw new HttpsError("failed-precondition", "인증번호를 먼저 요청해주세요.");
    }
    if (result.error === "expired") {
        throw new HttpsError("failed-precondition", "인증번호가 만료되었습니다. 재전송해주세요.");
    }
    if (result.error === "locked") {
        throw new HttpsError("resource-exhausted", "시도 횟수를 초과했습니다. 인증번호를 재전송해주세요.");
    }
    if (result.error === "wrong") {
        throw new HttpsError("invalid-argument", "인증번호가 올바르지 않습니다.");
    }
    return { ok: true };
});

// 3) 구독 시작 (결제 없는 UI 전용: subscription 필드만 기록)
//    - 체험 이력이 없는 계정: 7일 무료 체험(trial)
//    - 체험 이력이 있는 계정(재구독): 결제 없이 플랜 기간만큼 active 부여
const PLAN_DAYS = { monthly: 30, yearly: 365 };

exports.startTrial = onCall({ region: REGION }, async (req) => {
    const { uid, token } = requireAuth(req);

    const plan = req.data?.plan;
    if (!PLAN_DAYS[plan]) {
        throw new HttpsError("invalid-argument", "올바른 플랜을 선택해주세요.");
    }

    const ref = db.doc(`users/${uid}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("failed-precondition", "사용자 정보를 찾을 수 없습니다.");

    const data = snap.data();
    // 이메일 인증 강제: 실제 메일 인증을 쓸 때만 true 로 (클라이언트 DEMO_CODE_ONLY 와 반대로 맞추기)
    const REQUIRE_EMAIL_CODE = false;
    const isPasswordUser = token.firebase?.sign_in_provider === "password";
    if (REQUIRE_EMAIL_CODE && isPasswordUser && !data.emailCodeVerified) {
        throw new HttpsError("permission-denied", "이메일 인증을 먼저 완료해주세요.");
    }

    // 이미 구독/체험 중이면 중복 시작 방지
    const sub = data.subscription;
    const exp = sub?.expiresAt?.toMillis?.() ?? 0;
    if (sub && ["active", "trial"].includes(sub.status) && exp > Date.now()) {
        throw new HttpsError("already-exists", "이미 구독 중입니다.");
    }

    // 이전 버전(trialUsed 필드 없음)으로 만든 구독 이력도 체험 사용으로 취급
    const firstTime = !data.trialUsed && !sub;
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const periodMs = firstTime ? TRIAL_DAYS * DAY : PLAN_DAYS[plan] * DAY;

    await ref.set(
        {
            trialUsed: true,
            subscription: {
                status: firstTime ? "trial" : "active",
                plan,
                startedAt: Timestamp.fromMillis(now),
                expiresAt: Timestamp.fromMillis(now + periodMs),
            },
        },
        { merge: true }
    );
    return { ok: true };
});
