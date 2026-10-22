import { supabase } from "./supabaseClient";

// Server-side Premium Flow membership (20261022000250_premium_flow.sql). /api/chat reads the
// same row to lift the daily Cogni-Flow limit, so this is the source of truth in Supabase mode.
const toSubscription = (row) => (row ? {
  planId: row.plan_id,
  purchasedAt: row.purchased_at,
  expiresAt: row.expires_at,
  paymentType: row.payment_type,
} : null);

export async function loadPremiumSubscription(studentId) {
  const { data, error } = await supabase.from("premium_subscriptions")
    .select("plan_id, purchased_at, expires_at, payment_type")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return toSubscription(data);
}

export async function activateDemoPremium(planId) {
  const { data, error } = await supabase.rpc("activate_demo_premium", { p_plan_id: planId });
  if (error) throw error;
  return toSubscription(Array.isArray(data) ? data[0] : data);
}
