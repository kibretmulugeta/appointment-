import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Mail, Lock, AlertCircle, ArrowRight, UserPlus, Users, X, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { login, savedAccounts, switchAccount, removeSavedAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'add' || location.state?.addAccount) {
      setShowAddForm(true);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSavedAccount = async (account) => {
    setError('');
    setLoading(true);
    try {
      await switchAccount(account);
      navigate('/');
    } catch {
      setError('Session expired for this account. Please log in again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || '/api';
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleGithubLogin = () => {
    const backendUrl = import.meta.env.VITE_API_URL || '/api';
    window.location.href = `${backendUrl}/auth/github`;
  };

  const hasSavedAccounts = savedAccounts && savedAccounts.length > 0;
  const isAccountSelectionView = hasSavedAccounts && !showAddForm;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {isAccountSelectionView ? 'Select an Account' : showAddForm ? 'Add New Account' : 'Welcome Back'}
          </h1>
          <p className="text-xs text-slate-400">
            {isAccountSelectionView
              ? 'Choose a saved profile or add a new account to continue'
              : 'Sign in to your Scheduler account to manage appointments'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Saved Accounts View */}
        {isAccountSelectionView ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Saved Accounts ({savedAccounts.length})
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {savedAccounts.map((account) => (
                <div
                  key={account.email}
                  className="flex items-center justify-between p-3.5 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl transition-all cursor-pointer group"
                  onClick={() => handleSelectSavedAccount(account)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={account.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name)}&background=6366f1&color=fff`}
                      alt={account.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">{account.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{account.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedAccount(account.email);
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove Account"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Account Section Button */}
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-4"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Another Account</span>
            </button>
          </div>
        ) : (
          <>
            {hasSavedAccounts && (
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-950/80 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 text-xs font-bold rounded-xl border border-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Choose Saved Account ({savedAccounts.length})</span>
              </button>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleGoogleLogin}
                type="button"
                className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>

              <button
                onClick={handleGithubLogin}
                type="button"
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-md transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <span>Sign in with GitHub</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full"></div>
              <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 absolute">Or Email</span>
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        )}

        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-bold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}


