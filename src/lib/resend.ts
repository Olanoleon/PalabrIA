/**
 * Transactional email. The API key is read here and nowhere else, so it can
 * never be bundled into a client component.
 */
import "server-only";
import { Resend } from "resend";

/**
 * Sender address.
 *
 * Resend requires a `from` on every send, so there is always a value — but it
 * needs no configuration: `onboarding@resend.dev` is Resend's own verified
 * sender and works with nothing but a valid API key. Set RESEND_FROM only once
 * you have verified your own domain, to stop mail arriving from resend.dev.
 *
 * Not a secret. It is an ordinary configuration value.
 */
const DEFAULT_FROM = "PalabrIA <onboarding@resend.dev>";
const FROM = process.env.RESEND_FROM || DEFAULT_FROM;

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

type Mail = { to: string; subject: string; html: string };

/**
 * Sends, or logs and returns false when Resend is not configured. Callers must
 * treat a false return as "the user cannot receive this" and say so, rather
 * than pretending the mail went out.
 */
async function send({ to, subject, html }: Mail): Promise<boolean> {
  const resend = client();
  if (!resend) {
    console.warn(`[resend] RESEND_API_KEY unset — dropping mail to ${to}: ${subject}`);
    return false;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    // Surface the sender too: the most common failure is an unverified `from`
    // domain, or resend.dev's own restriction on who it may write to.
    console.error(`[resend] send failed (from=${FROM}, to=${to}):`, error);
    return false;
  }
  return true;
}

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#EFE7DB;padding:28px;font-family:'Helvetica Neue',Arial,sans-serif;color:#1B1611">
  <div style="max-width:520px;margin:0 auto;background:#FDF9F3;border:2px solid #1B1611;border-radius:18px;box-shadow:5px 5px 0 #1B1611;padding:26px">
    <div style="font-size:20px;font-weight:700;letter-spacing:-0.03em">Palabr<span style="color:#EA580C">IA</span></div>
    <h1 style="font-size:22px;margin:18px 0 10px;letter-spacing:-0.02em">${title}</h1>
    ${body}
  </div>
</body></html>`;
}

export function sendTwoFactorCode(to: string, code: string, minutes: number) {
  return send({
    to,
    subject: `PalabrIA — código de acceso ${code}`,
    html: shell(
      "Tu código de acceso",
      `<p style="font-size:15px;line-height:1.55;color:#4A3F35">Usa este código para entrar. Caduca en ${minutes} minutos.</p>
       <div style="margin:18px 0;padding:16px;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.22em;background:#FFEDD5;border:2px solid #1B1611;border-radius:14px">${code}</div>
       <p style="font-size:13px;color:#8C8177">Si no intentaste entrar, ignora este correo y avisa a tu administrador.</p>`,
    ),
  });
}

export function sendPasswordReset(to: string, url: string, minutes: number) {
  return send({
    to,
    subject: "PalabrIA — restablece tu contraseña",
    html: shell(
      "Restablece tu contraseña",
      `<p style="font-size:15px;line-height:1.55;color:#4A3F35">Este enlace caduca en ${minutes} minutos y solo se puede usar una vez.</p>
       <p style="margin:20px 0"><a href="${url}" style="display:inline-block;padding:13px 20px;background:#EA580C;color:#FFF7ED;border:2px solid #1B1611;border-radius:14px;font-weight:700;text-decoration:none">Elegir contraseña</a></p>
       <p style="font-size:13px;color:#8C8177">Si no lo pediste, puedes ignorar este correo.</p>`,
    ),
  });
}

export function sendLearnerInvite(to: string, name: string, appUrl: string) {
  return send({
    to,
    subject: "PalabrIA — tu cuenta está lista",
    html: shell(
      `Hola, ${name}`,
      `<p style="font-size:15px;line-height:1.55;color:#4A3F35">Ya puedes entrar a PalabrIA. Tu contraseña inicial es tu propio correo:</p>
       <div style="margin:14px 0;padding:12px 14px;background:#FFF9EF;border:2px dashed #1B1611;border-radius:12px;font-size:14px"><strong>${to}</strong></div>
       <p style="font-size:15px;line-height:1.55;color:#4A3F35">Te pediremos una contraseña nueva la primera vez que entres.</p>
       <p style="margin:20px 0"><a href="${appUrl}/login" style="display:inline-block;padding:13px 20px;background:#EA580C;color:#FFF7ED;border:2px solid #1B1611;border-radius:14px;font-weight:700;text-decoration:none">Entrar</a></p>`,
    ),
  });
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/** True when mail goes out under Resend's shared sender rather than our own. */
export function usingDefaultSender(): boolean {
  return !process.env.RESEND_FROM;
}

export function senderAddress(): string {
  return FROM;
}
