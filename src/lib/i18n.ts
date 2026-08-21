/**
 * UI copy. Lifted from the `T` dictionary in the Claude Design source
 * (`Lexica Learner v2.dc.html`) so the app reads exactly like the mockup,
 * extended with the keys the design does not cover: payments, the leaderboard
 * module, and the disabled avatar tab. Threshold strings say 70%, per the PRD.
 */

export type Lang = "es" | "en";

export const ES = {
  // ── Sign in ───────────────────────────────────────────────────────────────
  signOut: "Cerrar sesión",
  signinChip: "6 palabras al día",
  signinTitle: "Inglés que sí usas, con tu equipo",
  signinSub:
    "Seis palabras por unidad, con audio y práctica. Entra con tu correo para guardar tu racha y tu puesto en la tabla del mes.",
  signinLabel: "Correo del trabajo",
  signinCta: "Entrar",
  signinPw: "Contraseña",
  signinForgot: "¿Olvidaste tu contraseña?",
  pwShow: "Ver",
  pwHide: "Ocultar",
  forgotToast: "Te enviamos un enlace para restablecer tu contraseña.",
  signinNote:
    "Usa el correo de tu organización para aparecer en la tabla mensual.",
  signinLegal: "Al entrar aceptas los términos y el aviso de privacidad.",
  signinBadCreds: "Correo o contraseña incorrectos.",
  signinInactive: "Tu cuenta está desactivada. Habla con tu administrador.",
  signinMissing: "Escribe tu correo y tu contraseña.",

  // ── Password change / 2FA ─────────────────────────────────────────────────
  newPwTitle: "Crea tu contraseña",
  newPwSub:
    "Tu contraseña inicial es tu correo. Elige una nueva para continuar.",
  newPwLabel: "Nueva contraseña",
  newPwConfirm: "Confirma la contraseña",
  newPwCta: "Guardar y continuar",
  newPwShort: "Usa al menos 8 caracteres.",
  newPwMismatch: "Las contraseñas no coinciden.",
  newPwSameAsEmail: "La contraseña no puede ser tu correo.",
  twoFaTitle: "Verifica que eres tú",
  twoFaSub: "Enviamos un código de 6 dígitos a tu correo. Caduca en 10 minutos.",
  twoFaLabel: "Código",
  twoFaCta: "Verificar",
  twoFaBad: "Código incorrecto o caducado.",
  twoFaResend: "Enviar otro código",
  twoFaSent: "Te enviamos un código nuevo.",
  resetTitle: "Nueva contraseña",
  resetSub: "Elige una contraseña para entrar.",
  resetDone: "Listo. Ya puedes entrar.",
  resetBadLink: "Este enlace caducó. Pide otro desde la pantalla de entrada.",

  // ── Home ──────────────────────────────────────────────────────────────────
  code: "ES",
  greet: (name: string) => "Hola, " + name,
  level: (n: number) => "Nivel " + n,
  xpNext: (n: number, lvl: number) => n + " XP para el nivel " + lvl,
  areasTitle: "Áreas de vocabulario",
  areasSub: (n: number) => (n === 1 ? "1 área abierta" : n + " áreas abiertas"),
  blank: "",
  boardTitle: (month: string) => "Los más PRO · " + month,
  boardTop: "Top del mes",
  boardRank: (rank: number, total: number, org: string) =>
    "Puesto " + rank + " de " + total + " en " + org,
  boardGap: (xp: number) => xp + " XP para el podio",
  boardLeading: "Vas de primero este mes",
  colPeer: "Compañero",
  boardNote:
    "Se reinicia el día 1 de cada mes. Solo cuentan las unidades aprobadas con 70% o más.",
  boardEmpty: "Aún no hay XP este mes. Aprueba una unidad para aparecer.",
  boardViewAll: "Ver la tabla completa",

  // ── Profile ───────────────────────────────────────────────────────────────
  profile: "Perfil",
  profileMeta: (lvl: number, xp: number, streak: number) =>
    "Nivel " + lvl + " · " + xp + " XP · racha de " + streak + " días",
  thisWeek: "Esta semana",
  streakTitle: (n: number) => "Racha de " + n + " días",
  badgesTitle: "Insignias por área",
  xpNote:
    "Aprobar una unidad con 70% o más da XP según la dificultad y tu puntaje. Repetir y mejorar tu marca paga la diferencia; bajar no te quita nada.",
  tabs: ["Ruta", "Tabla", "Pagos", "Perfil"],
  week: ["L", "M", "M", "J", "V", "S", "D"],

  // ── Areas & units ─────────────────────────────────────────────────────────
  lockedUnit: (n: number) =>
    "Aprueba la unidad " + n + " con 70% o más para abrir esta.",
  areaWord: "Área",
  unit: "Unidad",
  intro: "Intro",
  words: "palabras",
  unitsOf: (d: number, tt: number) => d + " de " + tt + " unidades",
  areaComplete: "Área completa",
  startHere: "Empieza cuando quieras",
  unitOpen: (n: number) => "Unidad " + n + " en curso",
  lockedSub: "Se abre al aprobar la anterior",
  ctaReview: "Repasar y reintentar",
  ctaStart: "Empezar la intro",
  tagCurrent: "En curso",
  tagLocked: "Bloqueada",
  areasEmpty:
    "Tu organización todavía no tiene áreas visibles. Vuelve en un rato.",

  // ── Cards / reading / avatar ──────────────────────────────────────────────
  card: "Tarjeta",
  flipShow: "Toca para ver la definición",
  flipBack: "Toca para volver",
  pron: "Pronunciación · IPA americano",
  stress: "acento en",
  listen: "Escuchar",
  defTitle: "Definición en español",
  exTitle: "Ejemplo en inglés",
  paraKicker: "Párrafo del tema",
  chipsNote: (n: number) => "Las " + n + " palabras de la unidad, en el párrafo",
  paraPlay: "Escuchar el párrafo",
  paraStop: "Detener",
  videoKicker: "Avatar IA · lee el párrafo",
  videoPlaceholder: "Marcador de video · avatar hablante 4:5",
  videoSoon: "El avatar con IA llega en una próxima versión.",
  play: "Reproducir",
  pause: "Pausar",
  resume: "Continuar",
  slow: "0.75× lento",
  slowOn: "0.75× activo",
  need70: "Necesitas 70% para desbloquear",
  practice: "Practicar",
  ttsUnsupported: "Este navegador no puede leer en voz alta.",

  // ── Practice ──────────────────────────────────────────────────────────────
  tapRepeat: "Toca para repetir",
  del: "borrar",
  check: "Comprobar",
  cont: "Continuar",
  seeResult: "Ver resultado",
  correct: "¡Correcto!",
  almost: (w: string) => "Casi — es «" + w + "»",
  accuracy: "de acierto",
  hits: "aciertos",
  attempt: "intento",
  ordinal: "º",
  kickerBlank: "Completa la frase",
  kickerIpa: "Palabra ↔ IPA",
  kickerAudio: "Escribe lo que oyes",
  practiceEmpty: "Esta unidad todavía no tiene práctica.",

  // ── Result ────────────────────────────────────────────────────────────────
  passTitle: "¡Unidad aprobada!",
  failTitle: "Casi lo tienes",
  passNote: (xp: number) =>
    xp > 0
      ? "Superaste el 70%. Ganaste " + xp + " XP y subiste en la tabla del mes."
      : "Superaste el 70%. Ya tenías el XP de esta unidad; mejora tu marca para ganar más.",
  failNote:
    "Necesitas 70% para desbloquear. Repasa las palabras marcadas y vuelve a intentarlo — se guarda tu mejor marca.",
  unlockedX: (x: string) => "Desbloqueada: " + x,
  stillLocked: (x: string) => "Sigue bloqueada: " + x,
  areaNotDone: "Área sin terminar",
  areaNotDoneNote: "Aprueba esta unidad con 70% para completar el área",
  lockNote: "Se abre al llegar a 70% en esta unidad",
  allDone: (a: string) => "Terminaste todas las unidades de " + a,
  goUnit: (n: number) => "Ir a la unidad " + n,
  backArea: "Volver al área",
  backPath: "Volver a la ruta",
  q1: "«",
  q2: "»",
  reviewCards: "Repasar las tarjetas",
  retry: "Reintentar la práctica",
  reviewFirst: "Repasa antes de reintentar",
  levelUp: (n: number) => "¡Subiste al nivel " + n + "!",

  // ── Celebration overlays ──────────────────────────────────────────────────
  xpIntroTitle: "¡Ganaste tus primeros XP!",
  xpIntroBody:
    "Los XP miden lo que aprendes. Aprobar una unidad da XP según su dificultad y tu puntaje, y mejorar tu marca paga la diferencia.",
  xpIntroStreak: "Practica un día tras otro y tu racha suma XP extra.",
  xpIntroBoard: "Cada mes compites con tu organización en la tabla.",
  xpIntroCta: "Entendido",
  xpIntroEarned: (xp: number) => "+" + xp + " XP",
  levelUpTitle: (n: number) => "¡Nivel " + n + "!",
  levelUpBody: (xp: number) =>
    "Llevas " + xp + " XP. Cada nivel pide un poco más que el anterior.",
  levelUpNext: (xp: number, n: number) =>
    "Te faltan " + xp + " XP para el nivel " + n + ".",
  levelUpCta: "Seguir",
  tapHint: "Toca un área para empezar",
  newBadge: (n: number) =>
    n === 1 ? "Ganaste una insignia nueva" : "Ganaste " + n + " insignias nuevas",

  // ── Badges ────────────────────────────────────────────────────────────────
  introTabs: ["Tarjetas", "Lectura", "Video"],
  badgesView: "Insignias",
  badgesSub: "Colecciónalas al aprobar unidades",
  earnedWord: "conseguidas",
  earnedTag: "Conseguida",
  meSuffix: " (tú)",
  seeBadges: "Ver insignias",
  locked: "Por conseguir",
  bd1: "Primera unidad",
  bd1m: "Aprueba tu primera unidad",
  bd2: "Racha 10",
  bd2m: "10 días seguidos",
  bd3: "Área completa",
  bd3m: "Aprueba todas las unidades de un área",
  bd4: "Oído fino",
  bd4m: "50 dictados correctos",
  bd5: "Vocabulario 100",
  bd5m: "Aprende 100 palabras",
  bd6: "Sin fallos",
  bd6m: "Una práctica al 100%",

  // ── Payments ──────────────────────────────────────────────────────────────
  payments: "Pagos",
  paymentsTitle: "Tu suscripción",
  paymentsSub: "Paga con Bre-B desde tu app del banco y avísanos aquí.",
  payAmount: "Mensualidad",
  payNextDue: "Próximo pago",
  payPaidThrough: (d: string) => "Acceso activo hasta el " + d,
  payStatusActive: "Al día",
  payStatusTrial: "Periodo de prueba",
  payStatusDueSoon: (n: number) =>
    n === 0 ? "Vence hoy" : n === 1 ? "Vence mañana" : "Vence en " + n + " días",
  payStatusPastDue: (n: number) =>
    "Pago vencido hace " + n + (n === 1 ? " día" : " días"),
  payStatusSuspended: "Acceso suspendido por pago vencido",
  payStatusOverride: "Acceso autorizado por un administrador",
  payStatusDisabled: "Cuenta desactivada por un administrador",
  payKeyLabel: "Llave Bre-B",
  payKeyCopy: "Copiar llave",
  payKeyCopied: "Llave copiada.",
  payQrHint: "Escanea con tu app del banco",
  payDeclare: "Ya pagué",
  payDeclareSub: "Referencia o últimos dígitos (opcional)",
  payDeclareCta: "Reportar mi pago",
  payDeclared:
    "Gracias. Tu acceso ya está activo y un administrador confirmará el pago.",
  payHistory: "Historial",
  payHistoryEmpty: "Todavía no has reportado pagos.",
  payPending: "En revisión",
  payConfirmed: "Confirmado",
  payRejected: "Rechazado",
  payPeriod: (a: string, b: string) => a + " → " + b,
  paySuspendedBody:
    "Reporta tu pago para volver a tus unidades. Tu progreso, tu XP y tu racha están guardados.",
  payNoKey:
    "El administrador todavía no configuró la llave Bre-B. Escríbele para pagar.",
  payBanner: (n: number) =>
    n <= 0 ? "Tu pago está vencido" : "Tu pago vence en " + n + " días",
  payBannerCta: "Pagar",
} as const;

export const EN: Translated = {
  signOut: "Sign out",
  signinChip: "6 words a day",
  signinTitle: "English you actually use, with your team",
  signinSub:
    "Six words per unit, with audio and practice. Sign in with your email to keep your streak and your spot on the monthly board.",
  signinLabel: "Work email",
  signinCta: "Sign in",
  signinPw: "Password",
  signinForgot: "Forgot your password?",
  pwShow: "Show",
  pwHide: "Hide",
  forgotToast: "We sent you a link to reset your password.",
  signinNote: "Use your organization email to appear on the monthly board.",
  signinLegal: "By signing in you accept the terms and the privacy notice.",
  signinBadCreds: "Wrong email or password.",
  signinInactive: "Your account is deactivated. Talk to your administrator.",
  signinMissing: "Enter your email and password.",

  newPwTitle: "Create your password",
  newPwSub: "Your starting password is your email. Pick a new one to continue.",
  newPwLabel: "New password",
  newPwConfirm: "Confirm password",
  newPwCta: "Save and continue",
  newPwShort: "Use at least 8 characters.",
  newPwMismatch: "The passwords do not match.",
  newPwSameAsEmail: "Your password cannot be your email.",
  twoFaTitle: "Verify it's you",
  twoFaSub: "We emailed you a 6-digit code. It expires in 10 minutes.",
  twoFaLabel: "Code",
  twoFaCta: "Verify",
  twoFaBad: "Wrong or expired code.",
  twoFaResend: "Send another code",
  twoFaSent: "We sent you a new code.",
  resetTitle: "New password",
  resetSub: "Pick a password to sign in.",
  resetDone: "All set. You can sign in now.",
  resetBadLink: "This link expired. Request another from the sign-in screen.",

  code: "EN",
  greet: (name) => "Hi, " + name,
  level: (n) => "Level " + n,
  xpNext: (n, lvl) => n + " XP to level " + lvl,
  areasTitle: "Vocabulary areas",
  areasSub: (n) => (n === 1 ? "1 area open" : n + " areas open"),
  blank: "",
  boardTitle: (month) => "Rockstars · " + month,
  boardTop: "Top this month",
  boardRank: (rank, total, org) =>
    "Rank " + rank + " of " + total + " at " + org,
  boardGap: (xp) => xp + " XP to the podium",
  boardLeading: "You're first this month",
  colPeer: "Teammate",
  boardNote:
    "Resets on the 1st of each month. Only units passed with 70% or more count.",
  boardEmpty: "No XP yet this month. Pass a unit to show up here.",
  boardViewAll: "See the full board",

  profile: "Profile",
  profileMeta: (lvl, xp, streak) =>
    "Level " + lvl + " · " + xp + " XP · " + streak + "-day streak",
  thisWeek: "This week",
  streakTitle: (n) => n + "-day streak",
  badgesTitle: "Area badges",
  xpNote:
    "Passing a unit with 70% or more earns XP based on its difficulty and your score. Retrying and beating your record pays the difference; a lower score never takes anything away.",
  tabs: ["Path", "Board", "Payments", "Profile"],
  week: ["M", "T", "W", "T", "F", "S", "S"],

  lockedUnit: (n) => "Pass unit " + n + " with 70% or more to open this one.",
  areaWord: "Area",
  unit: "Unit",
  intro: "Intro",
  words: "words",
  unitsOf: (d, tt) => d + " of " + tt + " units",
  areaComplete: "Area complete",
  startHere: "Start whenever you like",
  unitOpen: (n) => "Unit " + n + " in progress",
  lockedSub: "Opens when you pass the previous one",
  ctaReview: "Review and retry",
  ctaStart: "Start the intro",
  tagCurrent: "In progress",
  tagLocked: "Locked",
  areasEmpty: "Your organization has no visible areas yet. Check back soon.",

  card: "Card",
  flipShow: "Tap to see the definition",
  flipBack: "Tap to flip back",
  pron: "Pronunciation · American IPA",
  stress: "stress on",
  listen: "Listen",
  defTitle: "Definition",
  exTitle: "English example",
  paraKicker: "Topic paragraph",
  chipsNote: (n) => "All " + n + " unit words appear in the paragraph",
  paraPlay: "Play the paragraph",
  paraStop: "Stop",
  videoKicker: "AI avatar · reads the paragraph",
  videoPlaceholder: "Video placeholder · speaking avatar 4:5",
  videoSoon: "The AI avatar is coming in a future version.",
  play: "Play",
  pause: "Pause",
  resume: "Resume",
  slow: "0.75× slow",
  slowOn: "0.75× on",
  need70: "You need 70% to unlock",
  practice: "Practice",
  ttsUnsupported: "This browser cannot read out loud.",

  tapRepeat: "Tap to repeat",
  del: "delete",
  check: "Check",
  cont: "Continue",
  seeResult: "See result",
  correct: "Correct!",
  almost: (w) => "Almost — it's “" + w + "”",
  accuracy: "accuracy",
  hits: "correct",
  attempt: "attempt",
  ordinal: "",
  kickerBlank: "Fill in the blank",
  kickerIpa: "Match word to IPA",
  kickerAudio: "Type what you hear",
  practiceEmpty: "This unit has no practice yet.",

  passTitle: "Unit passed!",
  failTitle: "So close",
  passNote: (xp) =>
    xp > 0
      ? "You beat 70%. You earned " + xp + " XP and moved up this month's board."
      : "You beat 70%. You already had this unit's XP — beat your record to earn more.",
  failNote:
    "You need 70% to unlock. Review the marked words and try again — your best score is kept.",
  unlockedX: (x) => "Unlocked: " + x,
  stillLocked: (x) => "Still locked: " + x,
  areaNotDone: "Area not finished",
  areaNotDoneNote: "Pass this unit with 70% to complete the area",
  lockNote: "Opens when you reach 70% in this unit",
  allDone: (a) => "You finished every unit in " + a,
  goUnit: (n) => "Go to unit " + n,
  backArea: "Back to area",
  backPath: "Back to the path",
  q1: "“",
  q2: "”",
  reviewCards: "Review the cards",
  retry: "Retry the practice",
  reviewFirst: "Review before retrying",
  levelUp: (n) => "You reached level " + n + "!",

  xpIntroTitle: "You earned your first XP!",
  xpIntroBody:
    "XP measures what you learn. Passing a unit earns XP based on its difficulty and your score, and beating your record pays the difference.",
  xpIntroStreak: "Practise day after day and your streak adds extra XP.",
  xpIntroBoard: "Every month you compete with your organization on the board.",
  xpIntroCta: "Got it",
  xpIntroEarned: (xp) => "+" + xp + " XP",
  levelUpTitle: (n) => "Level " + n + "!",
  levelUpBody: (xp) => "You have " + xp + " XP. Each level asks a little more than the last.",
  levelUpNext: (xp, n) => xp + " XP to level " + n + ".",
  levelUpCta: "Continue",
  tapHint: "Tap an area to start",
  newBadge: (n) => (n === 1 ? "You earned a new badge" : "You earned " + n + " new badges"),

  introTabs: ["Cards", "Reading", "Avatar"],
  badgesView: "Badges",
  badgesSub: "Collect them by passing units",
  earnedWord: "earned",
  earnedTag: "Earned",
  meSuffix: " (you)",
  seeBadges: "See badges",
  locked: "Still to earn",
  bd1: "First unit",
  bd1m: "Pass your first unit",
  bd2: "Streak 10",
  bd2m: "10-day streak",
  bd3: "Area complete",
  bd3m: "Pass every unit in an area",
  bd4: "Sharp ear",
  bd4m: "50 correct dictations",
  bd5: "Vocabulary 100",
  bd5m: "Learn 100 words",
  bd6: "Flawless",
  bd6m: "One practice at 100%",

  payments: "Payments",
  paymentsTitle: "Your subscription",
  paymentsSub: "Pay with Bre-B from your bank app, then tell us here.",
  payAmount: "Monthly fee",
  payNextDue: "Next payment",
  payPaidThrough: (d) => "Access active through " + d,
  payStatusActive: "Up to date",
  payStatusTrial: "Trial period",
  payStatusDueSoon: (n) =>
    n === 0 ? "Due today" : n === 1 ? "Due tomorrow" : "Due in " + n + " days",
  payStatusPastDue: (n) => "Payment " + n + (n === 1 ? " day" : " days") + " overdue",
  payStatusSuspended: "Access suspended for non-payment",
  payStatusOverride: "Access granted by an administrator",
  payStatusDisabled: "Account deactivated by an administrator",
  payKeyLabel: "Bre-B key",
  payKeyCopy: "Copy key",
  payKeyCopied: "Key copied.",
  payQrHint: "Scan with your bank app",
  payDeclare: "I paid",
  payDeclareSub: "Reference or last digits (optional)",
  payDeclareCta: "Report my payment",
  payDeclared:
    "Thanks. Your access is active and an administrator will confirm the payment.",
  payHistory: "History",
  payHistoryEmpty: "You have not reported any payments yet.",
  payPending: "Under review",
  payConfirmed: "Confirmed",
  payRejected: "Rejected",
  payPeriod: (a, b) => a + " → " + b,
  paySuspendedBody:
    "Report your payment to get back to your units. Your progress, XP and streak are saved.",
  payNoKey:
    "Your administrator has not set the Bre-B key yet. Message them to pay.",
  payBanner: (n) => (n <= 0 ? "Your payment is overdue" : "Your payment is due in " + n + " days"),
  payBannerCta: "Pay",
};

/** Same shape as ES, but with the readonly/literal narrowing relaxed. */
export type Translated = {
  [K in keyof typeof ES]: (typeof ES)[K] extends (...a: infer A) => infer R
    ? (...a: A) => R
    : (typeof ES)[K] extends readonly string[]
      ? string[]
      : string;
};

export const DICT: Record<Lang, Translated> = {
  es: ES as unknown as Translated,
  en: EN,
};

export function t(lang: Lang): Translated {
  return DICT[lang] ?? DICT.es;
}

export function isLang(v: unknown): v is Lang {
  return v === "es" || v === "en";
}

/** Month label for the leaderboard header, in the reader's language. */
export function monthLabel(date: Date, lang: Lang): string {
  const raw = new Intl.DateTimeFormat(lang === "es" ? "es-CO" : "en-US", {
    month: lang === "es" ? "long" : "short",
    timeZone: "America/Bogota",
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatMoney(amount: number, currency: string, lang: Lang): string {
  return new Intl.NumberFormat(lang === "es" ? "es-CO" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "es" ? "es-CO" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(date);
}
