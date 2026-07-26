import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X, Users, Mail, Phone } from 'lucide-react';
import api from '../../services/api';

export default function ContactPicker({ selectedParticipants = [], onChange }) {
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [query]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/contacts/search?q=${encodeURIComponent(query)}`);
      setContacts(data || []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParticipant = (contact) => {
    const isSelected = selectedParticipants.some((p) => p.email.toLowerCase() === contact.email.toLowerCase());
    if (isSelected) {
      onChange(selectedParticipants.filter((p) => p.email.toLowerCase() !== contact.email.toLowerCase()));
    } else {
      onChange([
        ...selectedParticipants,
        {
          user_id: contact.user_id || null,
          name: contact.name,
          email: contact.email,
          phone: contact.phone || '',
          status: 'pending'
        }
      ]);
    }
  };

  const handleAddManual = () => {
    if (!manualEmail) return;
    const name = manualName || manualEmail.split('@')[0];
    onChange([
      ...selectedParticipants,
      {
        user_id: null,
        name: name,
        email: manualEmail.toLowerCase(),
        phone: '',
        status: 'pending'
      }
    ]);
    setManualEmail('');
    setManualName('');
    setShowManualForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Select Participants to Invite
        </label>
        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add Email Manually</span>
        </button>
      </div>

      {/* Manual Email Add */}
      {showManualForm && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <input
            type="text"
            placeholder="Participant Name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
          />
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="participant@example.com"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
            />
            <button
              type="button"
              onClick={handleAddManual}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Selected Tags */}
      {selectedParticipants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedParticipants.map((p) => (
            <span
              key={p.email}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-medium"
            >
              <span>{p.name}</span>
              <button
                type="button"
                onClick={() => handleToggleParticipant(p)}
                className="hover:text-rose-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Contact Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts by name, email, or phone..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Contact Search List */}
      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
        {contacts.map((c) => {
          const isSelected = selectedParticipants.some((p) => p.email.toLowerCase() === c.email.toLowerCase());
          return (
            <div
              key={c.id || c.email}
              onClick={() => handleToggleParticipant(c)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-indigo-600/10 border-indigo-500 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}&background=6366f1&color=fff`}
                  alt={c.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
                <div>
                  <div className="font-semibold text-sm text-white flex items-center gap-2">
                    {c.name}
                    {c.has_account && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                        Scheduler User
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {c.email}
                    </span>
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {c.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
