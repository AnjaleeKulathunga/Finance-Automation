import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authLogin, authRegister, authLogout, authMe } from "../services/api";

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
  }, [fetchUser]);

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

  const register = async (fullName, email, password, confirmPassword) => {
    setLoading(true);
    try {
      return await authRegister(fullName, email, password, confirmPassword);
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
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser: fetchUser }}>
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
