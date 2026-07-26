import { useState, useEffect } from 'react';
import CalendarView from '../components/Calendar/CalendarView';
import { Plus } from 'lucide-react';
import api from '../services/api';

export default function CalendarPage({ onOpenCreateModal }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data || []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Interactive Calendar</h1>
          <p className="text-xs text-slate-400 mt-1">Manage and view all your scheduled appointments</p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
          Loading Calendar...
        </div>
      ) : (
        <CalendarView appointments={appointments} />
      )}
    </div>
  );
}
