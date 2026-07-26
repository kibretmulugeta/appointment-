import { useState, useEffect } from 'react';
import { MapPin, Search, ExternalLink, Check, Navigation } from 'lucide-react';
import api from '../../services/api';

export default function LocationPicker({ location, onChange }) {
  const [query, setQuery] = useState(location?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (query.length >= 2) {
      const delay = setTimeout(fetchSuggestions, 300);
      return () => clearTimeout(delay);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/maps/search?q=${encodeURIComponent(query)}`);
      setSuggestions(data || []);
      setShowDropdown(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = (place) => {
    onChange({
      name: place.name,
      address: place.address || '',
      latitude: place.latitude || 8.9953,
      longitude: place.longitude || 38.7845,
      place_id: place.place_id || '',
      google_maps_url: place.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`
    });
    setQuery(place.name);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-3 relative">
      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
        Appointment Location (Google Maps)
      </label>

      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search location (e.g. Starbucks Bole Road)"
            className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {loading && (
            <div className="absolute right-3.5 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.place_id || item.name}
                type="button"
                onClick={() => handleSelectPlace(item)}
                className="w-full text-left p-3 hover:bg-slate-800/80 transition-colors border-b border-slate-800/50 flex items-start gap-3 group"
              >
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.address}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Location Card & Directions Preview */}
      {location?.name && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                {location.name}
                <Check className="w-4 h-4 text-emerald-400" />
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">{location.address || 'Location Selected'}</p>
            </div>
          </div>

          {location.google_maps_url && (
            <a
              href={location.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2 rounded-lg border border-indigo-500/20 transition-colors shrink-0"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
