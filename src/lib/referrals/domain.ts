export type DiscountInput = { percent?: number; amount?: number; type: string };

export function calculateDiscount(baseAmount: number, discounts: DiscountInput[], maximumPercent = 100, allowStacking = true) {
  if (!Number.isFinite(baseAmount) || baseAmount < 0) throw new Error("BASE_AMOUNT_INVALID");
  const percents = discounts.map((d) => Math.max(0, Math.min(100, Number(d.percent || 0))));
  const amounts = discounts.map((d) => Math.max(0, Number(d.amount || 0)));
  const percent = Math.min(maximumPercent, allowStacking ? percents.reduce((s, v) => s + v, 0) : Math.max(0, ...percents));
  const fixed = allowStacking ? amounts.reduce((s, v) => s + v, 0) : Math.max(0, ...amounts);
  const discountAmount = Math.min(baseAmount, Math.round((baseAmount * percent / 100 + fixed) * 100) / 100);
  const finalAmount = Math.max(0, baseAmount - discountAmount);
  return { baseAmount, discountPercent: percent, discountAmount, finalAmount, paymentStatus: finalAmount === 0 ? "paid" : "due", includeInRevenue: finalAmount > 0 };
}

export function effectiveReferralPercent(successfulCount: number, rewardPercent: number, maximumPercent = 100) {
  return Math.min(maximumPercent, Math.max(0, successfulCount) * Math.max(0, rewardPercent));
}

export function canCreateReferral(referrerId: string, referredId: string, sameOrganization: boolean, alreadyReferred: boolean) {
  if (!sameOrganization) return { ok: false, reason: "CROSS_ORGANIZATION" };
  if (referrerId === referredId) return { ok: false, reason: "SELF_REFERRAL" };
  if (alreadyReferred) return { ok: false, reason: "DUPLICATE_REFERRAL" };
  return { ok: true };
}
