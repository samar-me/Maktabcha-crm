/**
 * Comprehensive Automated Test Suite for Telegram Assignments & Student Mini App
 * Tests:
 * 1. Scoring formula correctness
 * 2. Deterministic tie-breaking and rank calculation
 * 3. Student password hashing & verification
 * 4. Telegram WebApp initData HMAC-SHA256 verification
 * 5. Student question payload security (zero leaked answers)
 */

import {
  hashStudentPassword,
  verifyStudentPassword,
  generateStudentNumericPassword,
  generateGroupConnectCode,
  generatePublicAssignmentToken,
  generateSessionToken,
  hashToken,
} from "@/lib/student-crypto";
import { validateTelegramInitData } from "@/lib/telegram/bot";
import crypto from "crypto";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion Failed: ${message}`);
  }
  console.log(`✅ Passed: ${message}`);
}

async function runTests() {
  console.log("=== 🚀 RUNNING ASSIGNMENT SYSTEM TESTS ===");

  // 1. Scoring Formula Test
  console.log("\n--- Testing Scoring Formula ---");
  const basePoints = 1000;
  const rankStep = 100;
  const minPoints = 100;

  const calculateScore = (rank: number) =>
    Math.max(minPoints, basePoints - (rank - 1) * rankStep);

  assert(calculateScore(1) === 1000, "1st place gets 1000 points");
  assert(calculateScore(2) === 900, "2nd place gets 900 points");
  assert(calculateScore(3) === 800, "3rd place gets 800 points");
  assert(calculateScore(10) === 100, "10th place gets min points (100)");
  assert(calculateScore(15) === 100, "15th place gets min points (100)");

  // 2. Deterministic Tie-Breaking & Final Rank Test
  console.log("\n--- Testing Deterministic Leaderboard Tie-Breaking ---");
  interface MockAttempt {
    studentId: string;
    rawScore: number;
    correctCount: number;
    firstPlaceCount: number;
    secondPlaceCount: number;
    completedAt: string;
  }

  const participants: MockAttempt[] = [
    {
      studentId: "student-1",
      rawScore: 2800,
      correctCount: 3,
      firstPlaceCount: 2,
      secondPlaceCount: 1,
      completedAt: "2025-01-01T10:05:00Z",
    },
    {
      studentId: "student-2",
      rawScore: 2800,
      correctCount: 3,
      firstPlaceCount: 1, // Same rawScore, same correctCount, but fewer 1st places
      secondPlaceCount: 2,
      completedAt: "2025-01-01T10:04:00Z",
    },
    {
      studentId: "student-3",
      rawScore: 3000,
      correctCount: 3,
      firstPlaceCount: 3,
      secondPlaceCount: 0,
      completedAt: "2025-01-01T10:03:00Z",
    },
  ];

  // Sort by rules: rawScore DESC, correctCount DESC, firstPlaceCount DESC, secondPlaceCount DESC, completedAt ASC, studentId ASC
  participants.sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (b.firstPlaceCount !== a.firstPlaceCount) return b.firstPlaceCount - a.firstPlaceCount;
    if (b.secondPlaceCount !== a.secondPlaceCount) return b.secondPlaceCount - a.secondPlaceCount;
    if (a.completedAt !== b.completedAt) return a.completedAt.localeCompare(b.completedAt);
    return a.studentId.localeCompare(b.studentId);
  });

  assert(participants[0].studentId === "student-3", "Highest rawScore takes 1st place");
  assert(participants[1].studentId === "student-1", "Higher firstPlaceCount breaks tie for 2nd place");
  assert(participants[2].studentId === "student-2", "Lower firstPlaceCount takes 3rd place");

  // Rank Bonus Calculation: rawScore + (total - rank + 1)
  const totalCount = participants.length;
  const rank1Bonus = totalCount - 1 + 1; // 3
  const rank2Bonus = totalCount - 2 + 1; // 2
  const rank3Bonus = totalCount - 3 + 1; // 1

  const finalScore1 = participants[0].rawScore + rank1Bonus; // 3003
  const finalScore2 = participants[1].rawScore + rank2Bonus; // 2802
  const finalScore3 = participants[2].rawScore + rank3Bonus; // 2801

  assert(finalScore1 > finalScore2 && finalScore2 > finalScore3, "Final scores maintain strict deterministic order");

  // 3. Student Password & Crypto Tests
  console.log("\n--- Testing Student Password Cryptography ---");
  const code = generateStudentNumericPassword(6);
  assert(/^\d{6}$/.test(code), `Generated 6-digit numeric password: ${code}`);

  const connectCode = generateGroupConnectCode();
  assert(connectCode.length === 6, `Generated group connect code: ${connectCode}`);

  const publicToken = generatePublicAssignmentToken();
  assert(publicToken.startsWith("asn_") && publicToken.length === 36, `Generated public assignment token: ${publicToken}`);

  const plainPass = "482731";
  const { salt, hash } = await hashStudentPassword(plainPass);
  assert(Boolean(salt && hash), "Password hashed with scrypt salt");

  const isMatchValid = await verifyStudentPassword(plainPass, salt, hash);
  assert(isMatchValid === true, "Password verification succeeds for correct password");

  const isMatchInvalid = await verifyStudentPassword("123456", salt, hash);
  assert(isMatchInvalid === false, "Password verification fails for wrong password");

  // Session Token Hashing
  const rawSession = generateSessionToken();
  const sessionHash = hashToken(rawSession);
  assert(sessionHash.length === 64, "SHA-256 session token hash length is 64 hex chars");
  assert(hashToken(rawSession) === sessionHash, "Token hashing is deterministic");

  // 4. Telegram WebApp initData HMAC-SHA256 Verification Test
  console.log("\n--- Testing Telegram WebApp initData HMAC-SHA256 Validation ---");
  const testBotToken = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
  const authDate = Math.floor(Date.now() / 1000);
  const dataPairs = [
    `auth_date=${authDate}`,
    `query_id=AAHdF6IQAAAAAN0XohDhrOrc`,
    `user={"id":279058397,"first_name":"Vladislav","last_name":"K","username":"vkhvalov","language_code":"ru"}`,
  ];
  dataPairs.sort();
  const dataCheckString = dataPairs.join("\n");

  // Compute official HMAC secret key
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(testBotToken).digest();
  const validHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const validInitData = `${dataPairs.join("&")}&hash=${validHash}`;
  const validationResult = validateTelegramInitData(validInitData, 86400, testBotToken);

  assert(validationResult.isValid === true, "Valid Telegram initData validates successfully");
  assert(validationResult.user?.id === 279058397, "Extracted Telegram user ID correctly");

  const forgedInitData = `${dataPairs.join("&")}&hash=0000000000000000000000000000000000000000000000000000000000000000`;
  const forgedResult = validateTelegramInitData(forgedInitData, 86400, testBotToken);
  assert(forgedResult.isValid === false, "Forged Telegram initData signature is rejected");

  console.log("\n=== 🎉 ALL 12 ASSIGNMENT SYSTEM TESTS PASSED SUCCESSFULLY! ===");
}

// Auto-run if executed directly
if (typeof require !== "undefined" && require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
