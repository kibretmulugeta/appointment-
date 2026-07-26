import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Bell, Plus, LogOut, User, CheckCircle2, MapPin } from 'lucide-react';
import api from '../services/api';

export default function Navbar({ onOpenCreateModal }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.read).length);
    } catch {
      // Ignore background errors
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
              Scheduler
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20">
              Pro
            </span>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {user && (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Appointment</span>
            </button>
          )}

          {/* Notification Bell Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center animate-pulse shadow-md shadow-rose-500/50">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-white text-sm">Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-sm">No notifications yet</div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setShowNotifications(false);
                            if (n.appointment_id) navigate(`/appointments/${n.appointment_id}`);
                          }}
                          className={`p-3.5 hover:bg-slate-800/50 transition-colors cursor-pointer flex gap-3 items-start ${
                            !n.read ? 'bg-indigo-500/5 border-l-2 border-indigo-500' : ''
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-slate-800 text-indigo-400 mt-0.5 shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{n.title}</p>
                            <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="block text-center p-3 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-slate-800/30 border-t border-slate-800"
                  >
                    View Notification Center
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* User Profile */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <Link to="/profile" className="flex items-center gap-2 group">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-indigo-500/30 group-hover:border-indigo-400 transition-all"
                  referrerPolicy="no-referrer"
                />
                <span className="hidden md:inline-block text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                  {user.name}
                </span>
              </Link>
              <button
                onClick={logout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl shadow-md transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
