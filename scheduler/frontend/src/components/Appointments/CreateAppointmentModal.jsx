import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Clock, MapPin, Users, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import LocationPicker from '../Maps/LocationPicker';
import ContactPicker from '../Contacts/ContactPicker';
import api from '../../services/api';

const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

const getInitialTimes = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  now.setMinutes(minutes >= 30 ? 60 : 30, 0, 0); // Round up to next 30 mins

  const dateStr = now.toISOString().split('T')[0];
  const startStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const end = new Date(now.getTime() + 60 * 60 * 1000);
  const endStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

  return { date: dateStr, startTime: startStr, endTime: endStr };
};

export default function CreateAppointmentModal({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    location: {
      name: '',
      address: '',
      latitude: null,
      longitude: null,
      place_id: '',
      google_maps_url: ''
    },
    participants: []
  });

  useEffect(() => {
    if (isOpen) {
      const times = getInitialTimes();
      setFormData({
        title: '',
        description: '',
        date: times.date,
        startTime: times.startTime,
        endTime: times.endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        location: { name: '', address: '', latitude: null, longitude: null, place_id: '', google_maps_url: '' },
        participants: []
      });
      setStep(1);
      setError('');
      setWarning('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setWarning('');

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      if (endDateTime <= startDateTime) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        timezone: formData.timezone,
        location: formData.location.name ? formData.location : { name: 'Online / TBD', address: '', google_maps_url: '' },
        participants: formData.participants
      };

      const { data } = await api.post('/appointments', payload);
      if (data.warning) {
        setWarning(data.warning);
      }

      if (onSuccess) onSuccess(data);
      onClose();
      navigate(`/appointments/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Create New Appointment
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Step {step} of 4</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-indigo-600 h-1 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Appointment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Meeting with Coworker"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Discuss new project architecture and roadmap..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      Start Time
                    </label>
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {formatTime12h(formData.startTime)}
                    </span>
                  </div>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase">
                      End Time
                    </label>
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {formatTime12h(formData.endTime)}
                    </span>
                  </div>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Location */}
          {step === 3 && (
            <div>
              <LocationPicker
                location={formData.location}
                onChange={(loc) => setFormData({ ...formData, location: loc })}
              />
            </div>
          )}

          {/* STEP 4: Invite Contacts */}
          {step === 4 && (
            <div>
              <ContactPicker
                selectedParticipants={formData.participants}
                onChange={(pts) => setFormData({ ...formData, participants: pts })}
              />
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-6 border-t border-slate-800 flex items-center justify-between bg-slate-800/40">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && !formData.title.trim()) {
                  setError('Please enter an appointment title');
                  return;
                }
                setError('');
                setStep(step + 1);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Creating...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
