import { redirect } from "next/navigation";

import {
  buildAdminLoginRedirect,
  isAdminAuthenticated,
  isAdminAuthConfigured,
  sanitizeAdminRedirectTarget,
  signInAdmin,
} from "@/lib/workquiz/admin-auth";

export const dynamic = "force-dynamic";

function errorMessage(error?: string) {
  switch (error) {
    case "config":
      return "Admin auth is not configured yet. Add the username and password env vars first.";
    case "invalid":
      return "That username or password did not match.";
    default:
      return null;
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeAdminRedirectTarget(params.next);

  if (isAdminAuthConfigured() && (await isAdminAuthenticated())) {
    redirect(next);
  }

  async function loginAction(formData: FormData) {
    "use server";

    const target = sanitizeAdminRedirectTarget(String(formData.get("next") ?? ""));
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const result = await signInAdmin(username, password);

    if (!result.ok) {
      redirect(buildAdminLoginRedirect(target, result.reason));
    }

    redirect(target);
  }

  const configured = isAdminAuthConfigured();
  const message = errorMessage(params.error);

  return (
    <main className="shell admin-login-shell">
      <section className="panel admin-login-card stack-lg">
        <div className="stack-sm">
          <span className="eyebrow">Admin Portal</span>
          <h1>Sign in to manage brackets.</h1>
          <p className="muted">
            This gate protects setup, admin links, and bracket management APIs now that the portal
            is public-facing.
          </p>
        </div>

        {message ? <p className="error-text">{message}</p> : null}

        {configured ? (
          <form action={loginAction} className="stack-lg">
            <input name="next" type="hidden" value={next} />

            <label className="field">
              <span>Username</span>
              <input autoComplete="username" name="username" required />
            </label>

            <label className="field">
              <span>Password</span>
              <input autoComplete="current-password" name="password" required type="password" />
            </label>

            <button className="primary-button" type="submit">
              Sign in
            </button>
          </form>
        ) : (
          <div className="stack-sm">
            <p className="muted">
              Add these Railway variables, then reload this page:
            </p>
            <div className="admin-login-env-list">
              <code>WORKQUIZ_ADMIN_USERNAME</code>
              <code>WORKQUIZ_ADMIN_PASSWORD</code>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}
