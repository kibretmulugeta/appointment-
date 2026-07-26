import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trash2,
  ArrowLeft,
  Navigation,
  Check,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../services/api';

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/appointments/${id}`);
      setAppointment(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (choice) => {
    setActionLoading(true);
    try {
      await api.post(`/appointments/${id}/${choice}`);
      fetchAppointment();
    } catch (err) {
      alert(err.response?.data?.detail || 'RSVP error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this appointment? Notifications will be sent to all participants.')) return;
    setActionLoading(true);
    try {
      await api.post(`/appointments/${id}/cancel`);
      fetchAppointment();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error cancelling appointment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this appointment completely?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      navigate('/appointments');
    } catch {
      alert('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
        Loading appointment details...
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4">
        <div className="text-rose-400 text-sm font-semibold">{error || 'Appointment not found'}</div>
        <button
          onClick={() => navigate('/appointments')}
          className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700"
        >
          Back to Appointments
        </button>
      </div>
    );
  }

  const isOrganizer = appointment.organizer_id === user?.id;
  const currentParticipant = appointment.participants?.find((p) => p.email?.toLowerCase() === user?.email?.toLowerCase());

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Main Appointment Detail Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{appointment.title}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                  appointment.status === 'confirmed'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : appointment.status === 'pending'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {appointment.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Organized by <span className="text-indigo-400 font-semibold">{appointment.organizer_name || appointment.organizer_email}</span>
            </p>
          </div>

          {/* Action Buttons for RSVP / Cancel */}
          <div className="flex items-center gap-2">
            {isOrganizer && appointment.status !== 'cancelled' && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition-colors"
              >
                Cancel Appointment
              </button>
            )}
            {isOrganizer && (
              <button
                onClick={handleDelete}
                className="p-2.5 bg-slate-800 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                title="Delete Appointment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Date, Time & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Date</span>
                <span className="text-sm font-bold text-white">
                  {format(parseISO(appointment.start_time), 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Time ({appointment.timezone || 'UTC'})</span>
                <span className="text-sm font-bold text-white">
                  {format(parseISO(appointment.start_time), 'hh:mm a')} - {format(parseISO(appointment.end_time), 'hh:mm a')}
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block font-medium mb-1">Notes / Description</span>
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-xs text-slate-300 min-h-[90px]">
              {appointment.description || 'No additional notes specified for this appointment.'}
            </div>
          </div>
        </div>

        {/* Google Maps Location Section */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">{appointment.location?.name || 'Location TBD'}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{appointment.location?.address || 'No physical address provided'}</p>
              </div>
            </div>

            {appointment.location?.google_maps_url && (
              <a
                href={appointment.location.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all shrink-0"
              >
                <Navigation className="w-4 h-4" />
                <span>Open in Google Maps & Directions</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Participants Table & RSVP Status */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Participants & RSVP Status ({appointment.participants?.length || 0})
          </h3>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800">
            {appointment.participants?.map((p) => (
              <div key={p.email} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=6366f1&color=fff`}
                    alt={p.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div>
                    <div className="font-semibold text-sm text-white flex items-center gap-2">
                      {p.name}
                      {p.email === appointment.organizer_email && (
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">
                          Organizer
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{p.email}</div>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${
                    p.status === 'accepted'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : p.status === 'declined'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RSVP Bar for Invited Participant */}
        {!isOrganizer && appointment.status !== 'cancelled' && (
          <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-4">
            <h4 className="font-bold text-white text-sm">Respond to this Invitation</h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleRSVP('accept')}
                disabled={actionLoading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Accept
              </button>
              <button
                onClick={() => handleRSVP('tentative')}
                disabled={actionLoading}
                className="flex-1 py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-xs font-bold rounded-xl border border-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-4 h-4" /> Maybe
              </button>
              <button
                onClick={() => handleRSVP('decline')}
                disabled={actionLoading}
                className="flex-1 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
