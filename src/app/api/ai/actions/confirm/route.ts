import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAIContext } from "@/lib/ai/security";
import { executeConfirmedAction } from "@/lib/ai/action-executor";

const bodySchema = z.object({ confirmationId: z.string().uuid(), phrase: z.string().optional() });

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const context = await requireAIContext();
    return NextResponse.json(await executeConfirmedAction(context, body.confirmationId, body.phrase));
  } catch (error: any) {
    const status = error.message === "AUTH_REQUIRED" ? 401 : error.message === "PERMISSION_DENIED" ? 403 : 400;
    return NextResponse.json({ success: false, error: error.message || "Action bajarilmadi" }, { status });
  }
}

