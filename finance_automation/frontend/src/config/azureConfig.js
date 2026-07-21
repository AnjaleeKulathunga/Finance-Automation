export const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID_HERE",
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID_HERE",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const azureLoginScopes = {
  scopes: ["openid", "profile", "email"],
};

export const isAzureAdConfigured = () => {
  const { clientId } = msalConfig.auth;
  return clientId && clientId !== "YOUR_CLIENT_ID_HERE";
};
