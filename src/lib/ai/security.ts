import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AIRiskLevel = 0 | 1 | 2 | 3 | 4;
export type AIContext = { userId: string; organizationId: string; role: "admin" | "teacher" | "staff" };

const permissions: Record<AIContext["role"], AIRiskLevel> = { admin: 4, teacher: 1, staff: 1 };

export async function requireAIContext(): Promise<AIContext> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");

  const admin: any = createAdminClient();
  let { data: profile } = await (admin.from("profiles") as any)
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  // The CRM uses one server-configured Supabase account. Older installations
  // can have that auth user without a matching public.profiles row, so create
  // the missing tenant membership once instead of leaving authenticated admins
  // unable to use server-side CRM tools.
  if (!profile) {
    const configuredOwnerEmail = process.env.MAKTABCHA_SUPABASE_EMAIL?.trim().toLowerCase();
    if (!configuredOwnerEmail || user.email?.trim().toLowerCase() !== configuredOwnerEmail) {
      throw new Error("PROFILE_REQUIRED");
    }
    const { data: organization } = await (admin.from("organizations") as any)
      .select("id").eq("slug", "default").single();
    if (!organization) throw new Error("ORGANIZATION_REQUIRED");

    const { data: created, error: createError } = await (admin.from("profiles") as any)
      .upsert({
        id: user.id,
        email: user.email,
        full_name: String(user.user_metadata?.full_name || "Administrator"),
        role: "admin",
        organization_id: organization.id,
      }, { onConflict: "id" })
      .select("role, organization_id")
      .single();
    if (createError || !created) throw new Error("PROFILE_CREATE_FAILED");
    profile = created;
  }

  let organizationId = profile.organization_id as string | null;
  if (!organizationId) {
    const { data: organization } = await (admin.from("organizations") as any)
      .select("id").eq("slug", "default").single();
    if (!organization) throw new Error("ORGANIZATION_REQUIRED");
    organizationId = organization.id;
  }
  if (!organizationId) throw new Error("ORGANIZATION_REQUIRED");
  if (!["admin", "teacher", "staff"].includes(profile.role)) throw new Error("ROLE_INVALID");
  return { userId: user.id, organizationId, role: profile.role as AIContext["role"] };
}

export function authorize(context: AIContext, risk: AIRiskLevel) {
  if (permissions[context.role] < risk) throw new Error("PERMISSION_DENIED");
}

export async function audit(context: AIContext, entry: Record<string, unknown>) {
  const admin: any = createAdminClient();
  await (admin.from("ai_audit_logs") as any).insert({
    organization_id: context.organizationId,
    user_id: context.userId,
    ...entry,
  });
}

export async function createPreview(
  context: AIContext,
  tool: string,
  riskLevel: AIRiskLevel,
  input: unknown,
  preview: unknown,
) {
  authorize(context, riskLevel);
  const phrase = riskLevel >= 3 ? `TASDIQLAYMAN ${tool}` : null;
  const admin: any = createAdminClient();
  const { data, error } = await (admin.from("ai_pending_actions") as any).insert({
    organization_id: context.organizationId,
    user_id: context.userId,
    tool,
    risk_level: riskLevel,
    input,
    preview,
    confirmation_phrase: phrase,
  }).select("id, expires_at").single();
  if (error) throw error;
  await audit(context, { tool, risk_level: riskLevel, status: "previewed", after_data: preview });
  return { confirmationRequired: true, confirmationId: data.id, expiresAt: data.expires_at, phrase, preview };
}
