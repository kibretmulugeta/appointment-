import { useState, useEffect } from 'react';
import { Search, UserPlus, Users, Mail, Phone, RefreshCw, Check, Plus, X } from 'lucide-react';
import api from '../services/api';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', notes: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/contacts');
      setContacts(data || []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contacts', newContact);
      setShowAddModal(false);
      setNewContact({ name: '', email: '', phone: '', notes: '' });
      fetchContacts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add contact');
    }
  };

  const handleImportGoogleContacts = async () => {
    setImportLoading(true);
    setMsg('');
    try {
      const { data } = await api.get('/contacts/google');
      setMsg(`Imported ${data.imported_count} new contacts from Google!`);
      fetchContacts();
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Please log in with Google to enable Google Contacts sync');
    } finally {
      setImportLoading(false);
    }
  };

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Contacts</h1>
          <p className="text-xs text-slate-400 mt-1">Manage your appointment participants and sync Google Contacts</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleImportGoogleContacts}
            disabled={importLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${importLoading ? 'animate-spin' : ''}`} />
            <span>Import Google Contacts</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-xs font-semibold text-indigo-300">
          {msg}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts by name, email, or phone..."
          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Contacts List Grid */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
          Loading contacts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
          No contacts found. Add a contact or import your Google Contacts!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition-all space-y-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}&background=6366f1&color=fff`}
                  alt={c.name}
                  className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-700"
                />
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    {c.name}
                    {c.has_account && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                        Scheduler User
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-500" />
                    {c.email}
                  </div>
                </div>
              </div>

              {c.phone && (
                <div className="text-xs text-slate-300 flex items-center gap-1.5 pt-2 border-t border-slate-800">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{c.phone}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleAddContact}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Add New Contact</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="john@example.com"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Phone Number (for SMS)</label>
              <input
                type="tel"
                placeholder="+1 555 123 4567"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500"
              >
                Save Contact
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
