/**
 * Microsoft SSO is now handled server-side via Authorization Code Flow with PKCE.
 * The @azure/msal-browser library is no longer used.
 *
 * The "Sign in with Microsoft" button calls GET /api/auth/microsoft/login on the
 * backend, which returns the Microsoft auth URL. The browser is then redirected
 * there directly. On return, /auth/callback posts to /api/auth/microsoft/finish.
 *
 * To disable the SSO button set: REACT_APP_MICROSOFT_SSO_ENABLED=false in .env
 */
export const isMicrosoftSsoEnabled = () => {
  const flag = process.env.REACT_APP_MICROSOFT_SSO_ENABLED;
  // Enabled by default unless explicitly set to "false"
  return flag !== "false";
};

// Legacy export kept so existing imports don't break during transition
export const isAzureAdConfigured = isMicrosoftSsoEnabled;
