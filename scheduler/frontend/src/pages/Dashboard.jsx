import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Compass,
  Navigation,
  ExternalLink,
  BookOpen,
  BookMarked,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO, isToday, isAfter } from 'date-fns';
import api, { getRentals, getReadingTasks } from '../services/api';

export default function Dashboard({ onOpenCreateModal }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [readingTasks, setReadingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    detectLiveLocation();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [apptsRes, rentalsRes, tasksRes] = await Promise.allSettled([
        api.get('/appointments'),
        getRentals(),
        getReadingTasks()
      ]);

      if (apptsRes.status === 'fulfilled') setAppointments(apptsRes.value.data || []);
      if (rentalsRes.status === 'fulfilled') setRentals(rentalsRes.value.data || []);
      if (tasksRes.status === 'fulfilled') setReadingTasks(tasksRes.value.data || []);
    } catch {
      // Ignore
    } flex: {
      setLoading(false);
    }
  };

  const detectLiveLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLiveLocation({
          latitude: lat,
          longitude: lng,
          name: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          google_maps_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRSVP = async (apptId, statusChoice) => {
    try {
      await api.post(`/appointments/${apptId}/${statusChoice}`);
      fetchDashboardData();
    } catch {
      // Ignore
    }
  };

  const todayAppts = appointments.filter((a) => isToday(parseISO(a.start_time)));
  const upcomingAppts = appointments.filter((a) => isAfter(parseISO(a.start_time), new Date()) && !isToday(parseISO(a.start_time)));
  const pendingInvites = appointments.filter((a) => {
    const p = a.participants?.find((pt) => pt.email?.toLowerCase() === user?.email?.toLowerCase());
    return p && p.status === 'pending' && a.organizer_id !== user?.id;
  });

  const activeRentals = rentals.filter(r => r.status !== 'returned');
  const overdueRentals = rentals.filter(r => r.status === 'overdue');
  const dueSoonRentals = rentals.filter(r => r.status === 'due_soon');
  const pendingReadingTasks = readingTasks.filter(t => t.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome Back
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Hello, {user?.name || 'User'}! 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              You have <span className="text-indigo-400 font-bold">{todayAppts.length}</span> appointment{todayAppts.length === 1 ? '' : 's'} today, <span className="text-amber-400 font-bold">{activeRentals.length}</span> active book loan{activeRentals.length === 1 ? '' : 's'}, and <span className="text-rose-400 font-bold">{overdueRentals.length}</span> overdue alert{overdueRentals.length === 1 ? '' : 's'}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/rentals')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-3 rounded-2xl transition-all"
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Book Rentals</span>
            </button>
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Create Appointment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Book Rental Quick Alerts Bar */}
      {(overdueRentals.length > 0 || dueSoonRentals.length > 0) && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 animate-bounce" />
            <div>
              <h3 className="text-sm font-bold text-white">Book Rental Alerts & Reminders</h3>
              <p className="text-xs text-rose-300 mt-0.5">
                {overdueRentals.length > 0 && `${overdueRentals.length} book(s) are OVERDUE for return! `}
                {dueSoonRentals.length > 0 && `${dueSoonRentals.length} book(s) due within 3 days.`}
              </p>
            </div>
          </div>
          <Link
            to="/rentals"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shrink-0"
          >
            Manage Book Rentals
          </Link>
        </div>
      )}

      {/* Live Geolocation Card Banner */}
      {liveLocation && (
        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  📍 Live Location Active
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1">
                GPS: Lat {liveLocation.latitude.toFixed(4)}, Lng {liveLocation.longitude.toFixed(4)}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Detected via browser live geolocation</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={liveLocation.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
            >
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>View Map</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Here</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Appointments */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                Today's Appointments
              </h2>
              <Link to="/calendar" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View Calendar <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
                Loading appointments...
              </div>
            ) : todayAppts.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
                No appointments scheduled for today
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppts.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                    className="p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 transition-all cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-center shrink-0">
                        <Clock className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-bold">{format(parseISO(appt.start_time), 'hh:mm a')}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-indigo-400 transition-colors">
                          {appt.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{appt.description || 'No description'}</p>
                        {appt.location?.name && (
                          <div className="flex items-center gap-1 text-xs text-rose-400 mt-2">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{appt.location.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Appointments */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Upcoming Appointments</h2>
            {upcomingAppts.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
                No upcoming appointments
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppts.slice(0, 5).map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                    className="p-4 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs shrink-0">
                        {format(parseISO(appt.start_time), 'MMM d')}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">{appt.title}</h4>
                        <span className="text-xs text-slate-400">
                          {format(parseISO(appt.start_time), 'hh:mm a')} • {appt.location?.name || 'TBD'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Pending Invitations Widget */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Pending Invitations ({pendingInvites.length})
            </h3>

            {pendingInvites.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No pending invitations</p>
            ) : (
              <div className="space-y-4">
                {pendingInvites.map((appt) => (
                  <div key={appt.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div>
                      <h4 className="font-bold text-white text-sm">{appt.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Organized by <span className="text-indigo-400">{appt.organizer_name || 'Organizer'}</span>
                      </p>
                      <div className="text-xs text-slate-300 mt-2">
                        📅 {format(parseISO(appt.start_time), 'EEE, MMM d')} at {format(parseISO(appt.start_time), 'hh:mm a')}
                      </div>
                      {appt.location?.name && (
                        <div className="text-xs text-slate-400 mt-1">📍 {appt.location.name}</div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRSVP(appt.id, 'accept')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleRSVP(appt.id, 'decline')}
                        className="flex-1 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 border border-rose-500/20"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Book & Schedule Navigation</h3>
            <Link
              to="/rentals"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Book Rentals ({activeRentals.length})</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </Link>

            <Link
              to="/books"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookMarked className="w-4 h-4 text-indigo-400" />
                <span>My Books & Reading Tasks ({pendingReadingTasks.length})</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </Link>

            <Link
              to="/calendar"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-colors"
            >
              <div className="flex items-center gap-3">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <span>Full Calendar View</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </Link>

            <Link
              to="/contacts"
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-sm font-semibold transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Manage Contacts</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
