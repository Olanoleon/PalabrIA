/**
 * Deployment-phase switches.
 *
 * Not secrets, and not user-editable settings — these change how the app
 * behaves as a whole, so they live in the environment rather than the database.
 */

/**
 * Whether an account created with a default password must change it before
 * reaching the app.
 *
 * The PRD requires this: administrators create accounts whose initial password
 * is the user's own email address, which must not survive first sign-in. It is
 * switched off for the initial phase at the owner's request.
 *
 * While it is off, every account created by an administrator keeps its default
 * password indefinitely — for learners that is their own email address, so
 * anyone who knows a learner's address can sign in as them. Set
 * ENFORCE_PASSWORD_CHANGE=true to restore the intended behaviour; accounts are
 * still flagged in the database, so turning it on takes effect immediately and
 * retroactively, with no migration.
 */
export const ENFORCE_PASSWORD_CHANGE =
  process.env.ENFORCE_PASSWORD_CHANGE === "true";
