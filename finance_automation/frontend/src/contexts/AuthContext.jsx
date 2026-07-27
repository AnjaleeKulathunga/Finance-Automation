import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { authLogin, authRegister, authLogout, authMe, authAzureLogin } from "../services/api";
import { msalConfig, azureLoginScopes, isAzureAdConfigured } from "../config/azureConfig";

const AuthContext = createContext(null);

let msalInstance = null;
if (isAzureAdConfigured()) {
  msalInstance = new PublicClientApplication(msalConfig);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      if (token) {
        const userData = await authMe();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Session expired or invalid token:", err);
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const initMsal = async () => {
      if (msalInstance) {
        await msalInstance.initialize();
        msalInstance
          .handleRedirectPromise()
          .then(async (response) => {
            if (response) {
              const idToken = response.idToken;
              try {
                setLoading(true);
                const data = await authAzureLogin(idToken);
                localStorage.setItem("token", data.access_token);
                setToken(data.access_token);
                setUser(data.user);
                return data.user;
              } catch (err) {
                console.error("Azure login failed:", err);
                throw err;
              } finally {
                setLoading(false);
              }
            }
          })
          .catch((err) => {
            console.error("MSAL redirect handle error:", err);
          })
          .finally(() => {
            fetchUser();
          });
      } else {
        fetchUser();
      }
    };
    initMsal();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await authLogin(email, password);
      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithMicrosoft = async () => {
    if (!msalInstance) {
      throw new Error("Azure AD is not configured.");
    }
    await msalInstance.initialize();
    await msalInstance.loginRedirect(azureLoginScopes);
  };

  const register = async (fullName, email, password, confirmPassword, role) => {
    setLoading(true);
    try {
      return await authRegister(fullName, email, password, confirmPassword, role);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authLogout();
    } catch (err) {
      console.error("Failed to call logout api:", err);
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithMicrosoft,
        register,
        logout,
        refreshUser: fetchUser,
        isAzureAdConfigured: isAzureAdConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
