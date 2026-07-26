import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
  subDays,
  parseISO
} from 'date-fns';

export default function CalendarView({ appointments = [], onSelectAppointment }) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day, agenda

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const getAppointmentsForDay = (day) => {
    return appointments.filter((appt) => {
      const apptDate = parseISO(appt.start_time);
      return isSameDay(apptDate, day);
    });
  };

  // Status Color Badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
      case 'accepted':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'declined':
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  // Render Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-px bg-slate-800 rounded-2xl overflow-hidden border border-slate-800">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="bg-slate-900/90 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            {d}
          </div>
        ))}

        {days.map((day) => {
          const dayAppts = getAppointmentsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toString()}
              className={`min-h-[110px] p-2 bg-slate-900/40 hover:bg-slate-900/80 transition-colors ${
                !isCurrentMonth ? 'opacity-40 bg-slate-950/40' : ''
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/40' : 'text-slate-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayAppts.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md">
                    {dayAppts.length}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {dayAppts.slice(0, 3).map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer truncate font-medium transition-transform hover:scale-[1.02] ${getStatusBadge(
                      appt.status
                    )}`}
                  >
                    <div className="font-semibold truncate">{appt.title}</div>
                    <div className="text-[10px] opacity-80">
                      {format(parseISO(appt.start_time), 'hh:mm a')}
                    </div>
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <span className="text-[10px] text-indigo-400 font-medium pl-1 block">
                    +{dayAppts.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => {
          const dayAppts = getAppointmentsForDay(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div key={day.toString()} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 min-h-[350px]">
              <div className="text-center pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs text-slate-400 font-medium block">{format(day, 'EEE')}</span>
                <span
                  className={`text-lg font-bold inline-block mt-1 ${
                    isToday ? 'w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto' : 'text-white'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>

              <div className="space-y-2">
                {dayAppts.map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => navigate(`/appointments/${appt.id}`)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer hover:shadow-lg transition-all ${getStatusBadge(
                      appt.status
                    )}`}
                  >
                    <div className="font-bold text-white mb-1 truncate">{appt.title}</div>
                    <div className="flex items-center gap-1 text-[11px] opacity-80 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(parseISO(appt.start_time), 'hh:mm a')}</span>
                    </div>
                    {appt.location?.name && (
                      <div className="flex items-center gap-1 text-[11px] opacity-80 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{appt.location.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Agenda View
  const renderAgendaView = () => {
    const sorted = [...appointments].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    return (
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            No appointments scheduled
          </div>
        ) : (
          sorted.map((appt) => (
            <div
              key={appt.id}
              onClick={() => navigate(`/appointments/${appt.id}`)}
              className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-4 transition-all cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-4"
            >
              <div className="flex gap-4 items-center">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-center shrink-0 min-w-[70px]">
                  <span className="text-xs font-bold uppercase block">{format(parseISO(appt.start_time), 'MMM')}</span>
                  <span className="text-xl font-extrabold text-white block">{format(parseISO(appt.start_time), 'dd')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base hover:text-indigo-400 transition-colors">
                    {appt.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {format(parseISO(appt.start_time), 'hh:mm a')} - {format(parseISO(appt.end_time), 'hh:mm a')}
                    </span>
                    {appt.location?.name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        {appt.location.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(appt.status)}`}>
                  {appt.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white min-w-[180px] text-center">
            {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}
          </h2>
          <button
            onClick={handleNext}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
          >
            Today
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex p-1 bg-slate-800/80 rounded-xl border border-slate-700/50">
          {['month', 'week', 'agenda'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                viewMode === mode
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid View Output */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'agenda' && renderAgendaView()}
    </div>
  );
}
