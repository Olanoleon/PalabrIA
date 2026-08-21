"use server";

import { revalidatePath } from "next/cache";
import { requireLearner } from "@/lib/rbac";
import { declarePayment } from "@/lib/billing";

/**
 * "I paid": records the declaration and extends access immediately. A Super
 * Admin reviews it afterwards, and a rejection rolls the period back.
 */
export async function declareMyPayment(formData: FormData) {
  const { learner } = await requireLearner();
  const reference = String(formData.get("reference") ?? "").slice(0, 64);
  await declarePayment(learner.id, reference || null);
  revalidatePath("/payments");
  revalidatePath("/path");
  revalidatePath("/profile");
}
