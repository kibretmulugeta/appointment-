import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../services/api';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-400" />
            Notification Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">In-app notifications for appointment invitations, RSVPs, and reminders</p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
          You have no notifications at this time.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                handleMarkRead(n.id);
                if (n.appointment_id) navigate(`/appointments/${n.appointment_id}`);
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                !n.read
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                  : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white text-sm">{n.title}</h3>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {n.created_at ? format(parseISO(n.created_at), 'MMM d, hh:mm a') : 'Just now'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
