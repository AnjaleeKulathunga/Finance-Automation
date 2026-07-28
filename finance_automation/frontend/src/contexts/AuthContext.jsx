import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  authLogin,
  authRegister,
  authLogout,
  authMe,
  getMicrosoftLoginUrl,
} from "../services/api";


const AuthContext = createContext(null);

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
    fetchUser();
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

  /**
   * Microsoft PKCE SSO — Option B
   * Fetches the auth URL from the backend and redirects the browser.
   * Microsoft will redirect back to http://localhost:3000/auth/callback?code=&state=
   * which is handled by <AuthCallback />.
   */
  const loginWithMicrosoft = async () => {
    const { auth_url } = await getMicrosoftLoginUrl();
    window.location.href = auth_url;
  };

  /**
   * Called by AuthCallback after the backend returns the local JWT.
   * Stores the token and user in context/localStorage.
   */
  const finalizeLogin = (accessToken, userData) => {
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    setUser(userData);
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
        finalizeLogin,
        register,
        logout,
        refreshUser: fetchUser,
        // Always true — SSO is now server-driven, no frontend config needed
        isAzureAdConfigured: true,
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
