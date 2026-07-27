import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState([]);

  useEffect(() => {
    loadSavedAccounts();
    checkUser();
  }, []);

  const loadSavedAccounts = () => {
    try {
      const stored = localStorage.getItem('scheduler_saved_accounts');
      if (stored) {
        setSavedAccounts(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load saved accounts', err);
    }
  };

  const persistSavedAccount = (userData, token) => {
    if (!userData || !token) return;
    try {
      const stored = localStorage.getItem('scheduler_saved_accounts');
      let accounts = stored ? JSON.parse(stored) : [];
      accounts = accounts.filter((acc) => acc.email !== userData.email && acc.id !== userData.id);
      const newAcc = {
        id: userData.id || userData._id,
        name: userData.name || userData.displayName || 'User',
        email: userData.email,
        avatar: userData.avatar || userData.avatarUrl || '',
        token: token,
      };
      accounts.unshift(newAcc);
      localStorage.setItem('scheduler_saved_accounts', JSON.stringify(accounts));
      setSavedAccounts(accounts);
    } catch (err) {
      console.error('Failed to persist saved account', err);
    }
  };

  const removeSavedAccount = (email) => {
    try {
      const updated = savedAccounts.filter((acc) => acc.email !== email);
      localStorage.setItem('scheduler_saved_accounts', JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch (err) {
      console.error('Failed to remove saved account', err);
    }
  };

  const switchAccount = async (account) => {
    if (!account || !account.token) return;
    setLoading(true);
    localStorage.setItem('token', account.token);
    await checkUser();
  };

  const checkUser = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        localStorage.setItem('token', urlToken);
      }

      const currentToken = localStorage.getItem('token');
      const { data } = await api.get('/auth/me');
      setUser(data);
      if (currentToken && data) {
        persistSavedAccount(data, currentToken);
      }

      if (window.location.search.includes('oauth=success')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    const userData = data.user || data;
    setUser(userData);
    if (data.token && userData) {
      persistSavedAccount(userData, data.token);
    }
    return data;
  };

  const register = async (name, email, password, phoneNumber = '') => {
    const { data } = await api.post('/auth/register', { name, email, password, phoneNumber });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    const userData = data.user || data;
    setUser(userData);
    if (data.token && userData) {
      persistSavedAccount(userData, data.token);
    }
    return data;
  };

  const updateProfile = async (profileData) => {
    const { data } = await api.put('/users/me', profileData);
    setUser(data);
    const token = localStorage.getItem('token');
    if (token && data) {
      persistSavedAccount(data, token);
    }
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout request errors
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        savedAccounts,
        switchAccount,
        removeSavedAccount,
        login,
        register,
        updateProfile,
        logout,
        checkUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

