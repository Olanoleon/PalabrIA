/**
 * Bre-B payment key handling.
 *
 * Bre-B keys are alphanumeric handles (`@nickname`, a phone number, a document
 * id or an email) that Colombian bank apps resolve to an account. v1 renders
 * the platform key as a QR the learner scans; there is no provider API to call,
 * which is why payment confirmation is manual.
 */
import QRCode from "qrcode";

export type BrebKeyKind = "alphanumeric" | "phone" | "document" | "email" | "unknown";

export function classifyKey(key: string): BrebKeyKind {
  const k = key.trim();
  if (!k) return "unknown";
  if (k.startsWith("@")) return "alphanumeric";
  if (/^\+?\d{7,15}$/.test(k)) return "phone";
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(k)) return "email";
  if (/^\d{5,15}$/.test(k)) return "document";
  return "unknown";
}

export function isUsableKey(key: string | null | undefined): boolean {
  return !!key && key.trim().length >= 3;
}

/**
 * QR payload. Bank apps read the plain key, so the QR carries exactly the key
 * — no amount, no reference, nothing that would make one learner's QR unusable
 * for another cycle.
 */
export function qrPayload(key: string): string {
  return key.trim();
}

/** Data-URI PNG, generated server-side so the page needs no client library. */
export async function qrDataUrl(key: string): Promise<string> {
  return QRCode.toDataURL(qrPayload(key), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
    color: { dark: "#1B1611ff", light: "#FFFFFFff" },
  });
}
