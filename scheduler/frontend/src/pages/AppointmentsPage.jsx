import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, Clock, MapPin, Users, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../services/api';

export default function AppointmentsPage({ onOpenCreateModal }) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [filterStatus]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus !== 'all' ? `?status_filter=${filterStatus}` : '';
      const { data } = await api.get(`/appointments${statusParam}`);
      setAppointments(data || []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = appointments.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    (a.location?.name && a.location.name.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Appointments</h1>
          <p className="text-xs text-slate-400 mt-1">View, manage, and track all appointment invitations</p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Appointment</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search appointments..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', 'confirmed', 'pending', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                filterStatus === status
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List Grid */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
          Loading appointments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
          No appointments found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((appt) => (
            <div
              key={appt.id}
              onClick={() => navigate(`/appointments/${appt.id}`)}
              className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-5 transition-all cursor-pointer space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-bold text-white text-base hover:text-indigo-400 transition-colors">
                    {appt.title}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border shrink-0 ${
                      appt.status === 'confirmed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : appt.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {appt.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{appt.description || 'No notes provided'}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{format(parseISO(appt.start_time), 'EEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    {format(parseISO(appt.start_time), 'hh:mm a')} - {format(parseISO(appt.end_time), 'hh:mm a')}
                  </span>
                </div>
                {appt.location?.name && (
                  <div className="flex items-center gap-2 text-rose-400 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{appt.location.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
