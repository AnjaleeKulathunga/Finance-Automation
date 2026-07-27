export const msalConfig = {
  auth: {
    clientId: "b0293705-e67f-442f-aa4c-54e15db1e9d4",
    authority: "https://login.microsoftonline.com/534253fc-dfb6-462f-b5ca-cbe81939f5ee",
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
