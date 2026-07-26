import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Clock, Bell, Check, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    timezone: 'UTC',
    notificationPreferences: {
      email: true,
      sms: false,
      inApp: true
    }
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        timezone: user.timezone || 'UTC',
        notificationPreferences: user.notificationPreferences || { email: true, sms: false, inApp: true }
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await updateProfile(formData);
      setMsg('Profile and notification preferences updated successfully!');
    } catch {
      setMsg('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Profile & Notification Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your account information, phone number, and notification channels</p>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs font-semibold text-emerald-400">
          {msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl backdrop-blur-xl">
        {/* User Card Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff`}
            alt={user?.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/40"
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Provider: {user?.provider || 'local'}
            </span>
          </div>
        </div>

        {/* Basic Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Account Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                Phone Number (Required for SMS)
              </label>
              <input
                type="tel"
                placeholder="+1 555 123 4567"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Time Zone</label>
            <input
              type="text"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            Notification Preferences
          </h3>

          <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-white block">Email Notifications</span>
                <span className="text-xs text-slate-400">Receive invitation alerts & appointment reminders via email</span>
              </div>
              <input
                type="checkbox"
                checked={formData.notificationPreferences.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notificationPreferences: { ...formData.notificationPreferences, email: e.target.checked }
                  })
                }
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* SMS Notifications Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div>
                <span className="text-sm font-bold text-white block">SMS Notifications</span>
                <span className="text-xs text-slate-400">Receive SMS text messages before appointment start times</span>
              </div>
              <input
                type="checkbox"
                checked={formData.notificationPreferences.sms}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notificationPreferences: { ...formData.notificationPreferences, sms: e.target.checked }
                  })
                }
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            {/* In-App Notifications Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div>
                <span className="text-sm font-bold text-white block">In-App Notifications</span>
                <span className="text-xs text-slate-400">Display notification bell badges and in-app alerts</span>
              </div>
              <input
                type="checkbox"
                checked={formData.notificationPreferences.inApp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    notificationPreferences: { ...formData.notificationPreferences, inApp: e.target.checked }
                  })
                }
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
