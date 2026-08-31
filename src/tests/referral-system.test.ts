import assert from "node:assert/strict";
import { calculateDiscount, canCreateReferral, effectiveReferralPercent } from "../lib/referrals/domain.ts";

const one = calculateDiscount(300_000, [{ type: "referral", percent: 20 }]);
assert.equal(one.finalAmount, 240_000, "Case 1: one referral applies real 20% discount");
assert.equal(effectiveReferralPercent(5, 20), 100, "Case 2: five referrals cap at 100%");
assert.equal(effectiveReferralPercent(7, 20), 100, "Discount never exceeds 100%");

const covered = calculateDiscount(300_000, Array.from({ length: 5 }, () => ({ type: "referral", percent: 20 })));
assert.deepEqual({ finalAmount: covered.finalAmount, status: covered.paymentStatus, revenue: covered.includeInRevenue }, { finalAmount: 0, status: "paid", revenue: false }, "Case 6: fully covered payment has zero debt/revenue semantics");

assert.equal(canCreateReferral("ali", "ali", true, false).reason, "SELF_REFERRAL");
assert.equal(canCreateReferral("ali", "jamshid", false, false).reason, "CROSS_ORGANIZATION", "Case 5: cross organization is rejected");
assert.equal(canCreateReferral("ali", "jamshid", true, true).reason, "DUPLICATE_REFERRAL", "Case 4: duplicate reward relationship rejected");

console.log("✅ Referral domain tests passed");
