import React, { createContext, useState, useContext, useEffect } from 'react';
import { getUser, saveUser, clearUser } from './storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const savedUser = await getUser();
    setUser(savedUser);
    setLoading(false);
  };

  const login = async (userData) => {
    const userToSave = { ...userData, isLoggedIn: true };
    await saveUser(userToSave);
    setUser(userToSave);
  };

  const logout = async () => {
    await clearUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
