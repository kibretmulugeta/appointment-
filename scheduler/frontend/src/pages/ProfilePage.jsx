import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Clock, Bell, Check, Save, Send, MessageSquare, AlertCircle, Key } from 'lucide-react';
import api from '../services/api';

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
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [testSmsStatus, setTestSmsStatus] = useState(null);

  // Twilio Gateway Config State
  const [showSmsConfig, setShowSmsConfig] = useState(false);
  const [savingSmsConfig, setSavingSmsConfig] = useState(false);
  const [smsConfigMsg, setSmsConfigMsg] = useState('');
  const [smsConfigForm, setSmsConfigForm] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: ''
  });

  // SMTP Email Gateway Config State
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);
  const [emailConfigMsg, setEmailConfigMsg] = useState('');
  const [emailConfigForm, setEmailConfigForm] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    user: '',
    pass: '',
    fromEmail: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
        timezone: user.timezone || 'UTC',
        notificationPreferences: user.notificationPreferences || { email: true, sms: false, inApp: true }
      });
    }
    fetchSmsConfig();
    fetchEmailConfig();
  }, [user]);

  const fetchSmsConfig = async () => {
    try {
      const { data } = await api.get('/notifications/sms-config');
      if (data) {
        setSmsConfigForm({
          accountSid: data.accountSid || '',
          authToken: '',
          phoneNumber: data.phoneNumber || ''
        });
      }
    } catch {
      // Ignore background errors
    }
  };

  const fetchEmailConfig = async () => {
    try {
      const { data } = await api.get('/notifications/email-config');
      if (data) {
        setEmailConfigForm({
          host: data.host || 'smtp.gmail.com',
          port: data.port || 587,
          user: data.user || '',
          pass: '',
          fromEmail: data.user || ''
        });
      }
    } catch {
      // Ignore background errors
    }
  };

  const handleSaveEmailConfig = async () => {
    setSavingEmailConfig(true);
    setEmailConfigMsg('');
    try {
      const { data } = await api.post('/notifications/email-config', emailConfigForm);
      setEmailConfigMsg(data.message || 'SMTP Email configuration saved!');
      fetchEmailConfig();
    } catch (err) {
      setEmailConfigMsg(err.response?.data?.detail || 'Failed to save Email configuration.');
    } finally {
      setSavingEmailConfig(false);
    }
  };


  const handleSaveSmsConfig = async () => {
    setSavingSmsConfig(true);
    setSmsConfigMsg('');
    try {
      const { data } = await api.post('/notifications/sms-config', smsConfigForm);
      setSmsConfigMsg(data.message || 'Twilio SMS configuration saved!');
      fetchSmsConfig();
    } catch (err) {
      setSmsConfigMsg(err.response?.data?.detail || 'Failed to save Twilio configuration.');
    } finally {
      setSavingSmsConfig(false);
    }
  };


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

  const handleTestEmail = async () => {
    setTestEmailLoading(true);
    setTestEmailStatus(null);
    try {
      const { data } = await api.post('/notifications/test-email');
      setTestEmailStatus(data);
    } catch (err) {
      setTestEmailStatus({
        success: false,
        message: err.response?.data?.detail || 'Failed to send test email.'
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleTestSms = async () => {
    setTestSmsLoading(true);
    setTestSmsStatus(null);
    try {
      const { data } = await api.post('/notifications/test-sms', { phoneNumber: formData.phoneNumber });
      setTestSmsStatus(data);
    } catch (err) {
      setTestSmsStatus({
        success: false,
        message: err.response?.data?.detail || 'Failed to send test SMS.'
      });
    } finally {
      setTestSmsLoading(false);
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
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=6366f1&color=fff`}
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

        {/* Notification Preferences & Live Testing */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            Notification Preferences & Delivery Testing
          </h3>

          <div className="space-y-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
            {/* Email Notifications Toggle & Test */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    Email Notifications
                  </span>
                  <span className="text-xs text-slate-400">Receive invitation alerts & appointment reminders via email</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={testEmailLoading}
                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>{testEmailLoading ? 'Testing...' : 'Test Email'}</span>
                  </button>
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
              </div>

              {testEmailStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium border space-y-1 ${
                  testEmailStatus.success
                    ? testEmailStatus.provider === 'smtp' || testEmailStatus.provider === 'resend'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {testEmailStatus.success
                        ? testEmailStatus.provider === 'smtp' || testEmailStatus.provider === 'resend'
                          ? '✅ Live Email Delivered'
                          : 'ℹ️ Email Simulation Active'
                        : '⚠️ Email Delivery Error'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{testEmailStatus.message}</p>
                </div>
              )}

              {/* Email Gateway Credentials UI */}
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowEmailConfig(!showEmailConfig)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{showEmailConfig ? 'Hide Email Gateway Credentials' : '⚙️ Configure Live Email Gateway (SMTP / Gmail)'}</span>
                </button>

                {showEmailConfig && (
                  <div className="mt-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">SMTP Email Server Settings</span>
                      <span className="text-[10px] text-slate-400">e.g. Gmail, Outlook, Resend</span>
                    </div>

                    {emailConfigMsg && (
                      <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 font-medium">
                        {emailConfigMsg}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SMTP Host</label>
                          <input
                            type="text"
                            placeholder="smtp.gmail.com"
                            value={emailConfigForm.host}
                            onChange={(e) => setEmailConfigForm({ ...emailConfigForm, host: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Port</label>
                          <input
                            type="number"
                            placeholder="587"
                            value={emailConfigForm.port}
                            onChange={(e) => setEmailConfigForm({ ...emailConfigForm, port: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SMTP Username / Email</label>
                        <input
                          type="email"
                          placeholder="your_email@gmail.com"
                          value={emailConfigForm.user}
                          onChange={(e) => setEmailConfigForm({ ...emailConfigForm, user: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SMTP Password / App Password</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••"
                          value={emailConfigForm.pass}
                          onChange={(e) => setEmailConfigForm({ ...emailConfigForm, pass: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveEmailConfig}
                        disabled={savingEmailConfig}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingEmailConfig ? 'Saving Email Config...' : 'Save Email Gateway Credentials'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* SMS Notifications Toggle & Test */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    SMS Notifications
                  </span>
                  <span className="text-xs text-slate-400">Receive SMS text messages before appointment start times</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestSms}
                    disabled={testSmsLoading}
                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>{testSmsLoading ? 'Testing...' : 'Test SMS'}</span>
                  </button>
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
              </div>

              {testSmsStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium border space-y-1 ${
                  testSmsStatus.success
                    ? testSmsStatus.provider === 'twilio'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {testSmsStatus.success
                        ? testSmsStatus.provider === 'twilio'
                          ? '✅ Live Twilio SMS Sent'
                          : 'ℹ️ SMS Simulation Active'
                        : '⚠️ Twilio SMS Error'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{testSmsStatus.message}</p>
                </div>
              )}

              {/* Twilio Credentials Configuration UI */}
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowSmsConfig(!showSmsConfig)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{showSmsConfig ? 'Hide Twilio Gateway Credentials' : '⚙️ Configure Live Twilio SMS Gateway'}</span>
                </button>

                {showSmsConfig && (
                  <div className="mt-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Twilio Gateway API Keys</span>
                      <span className="text-[10px] text-slate-400">Get free keys at twilio.com</span>
                    </div>

                    {smsConfigMsg && (
                      <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 font-medium">
                        {smsConfigMsg}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Twilio Account SID</label>
                        <input
                          type="text"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={smsConfigForm.accountSid}
                          onChange={(e) => setSmsConfigForm({ ...smsConfigForm, accountSid: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Twilio Auth Token</label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••••••••••••••••••"
                          value={smsConfigForm.authToken}
                          onChange={(e) => setSmsConfigForm({ ...smsConfigForm, authToken: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Twilio Sender Phone Number</label>
                        <input
                          type="tel"
                          placeholder="+18881234567"
                          value={smsConfigForm.phoneNumber}
                          onChange={(e) => setSmsConfigForm({ ...smsConfigForm, phoneNumber: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveSmsConfig}
                        disabled={savingSmsConfig}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingSmsConfig ? 'Saving API Keys...' : 'Save Twilio Credentials'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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

