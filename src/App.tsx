import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO, startOfWeek, addDays, startOfDay, setHours } from 'date-fns';
import { Calendar, Clock, CheckCircle2, XCircle, Plus, Edit, LayoutList, LayoutGrid, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // pixels

function App() {
  const [events, setEvents] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // 'list' or 'week'
  const [currentDate, setCurrentDate] = useState(new Date());

  const [formData, setFormData] = useState({
    title: '',
    duration: 60,
    isManual: false,
    manualStart: '',
    manualEnd: ''
  });
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_URL}/events`);
      setEvents(res.data);
    } catch (e) {
      console.warn("Could not fetch events, check API.")
    }
  };

  const handleDelete = async (id: string, e?: any) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await axios.delete(`${API_URL}/events/${id}`);
      fetchEvents();
    } catch (err) {
      alert("Failed to delete event.");
    }
  };

  const handleSuggest = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/events/suggest`, { duration: Number(formData.duration) });
      setSuggestion(res.data);
    } catch (err) {
      alert('Error fetching suggestion. We might be out of slots.');
    }
    setLoading(false);
  };

  const handleManualSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    const start = new Date(formData.manualStart).getTime();
    const end = new Date(formData.manualEnd).getTime();
    const durationMins = Math.round((end - start) / 60000);

    if (durationMins <= 0) {
      alert("End time must be precisely after start time!");
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API_URL}/events`, {
        title: formData.title,
        duration: durationMins,
        startTime: formData.manualStart,
        endTime: formData.manualEnd,
        status: 'ACCEPTED'
      });
      setShowWizard(false);
      setFormData({ title: '', duration: 60, isManual: false, manualStart: '', manualEnd: '' });
      fetchEvents();
    } catch (err) {
      alert('Error creating custom event');
    }
    setLoading(false);
  };

  const handleDecision = async (accept: boolean) => {
    if (!accept) {
      setSuggestion(null);
      return;
    }
    try {
      await axios.post(`${API_URL}/events`, {
        title: formData.title,
        duration: Number(formData.duration),
        startTime: suggestion.suggestedStart,
        endTime: suggestion.suggestedEnd,
        status: 'ACCEPTED'
      });
      setShowWizard(false);
      setSuggestion(null);
      setFormData({ title: '', duration: 60, isManual: false, manualStart: '', manualEnd: '' });
      fetchEvents();
    } catch (err) {
      alert('Error creating event');
    }
  };

  const openManualSlot = (date: Date, hour: number) => {
    const slotStart = setHours(startOfDay(date), hour);
    const slotEnd = setHours(startOfDay(date), hour + 1); // default 1 hour chunk

    const formatForInput = (d: Date) => {
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    setFormData({
      title: '',
      duration: 60,
      isManual: true,
      manualStart: formatForInput(slotStart),
      manualEnd: formatForInput(slotEnd)
    });
    setSuggestion(null);
    setShowWizard(true);
  };

  // Calendar configuration setup
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Starts Monday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => START_HOUR + i);

  return (
    <div className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto pt-10">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Smart Scheduler</h1>
            <p className="text-gray-400">Intelligently organize your day.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-[#1a2130] p-1 rounded-xl">
              <button
                onClick={() => setViewMode('week')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'week' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                <LayoutList size={20} />
              </button>
            </div>

            <button
              onClick={() => {
                setFormData({ title: '', duration: 60, isManual: false, manualStart: '', manualEnd: '' });
                setShowWizard(true);
              }}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full hover:opacity-90 transition-all font-medium"
            >
              <Plus size={20} /> New Event
            </button>
          </div>
        </div>

        {/* View Layouts */}
        {viewMode === 'list' ? (
          <div>
            {events.length === 0 ? (
              <div className="text-center py-20 bg-gray-900/40 rounded-3xl border border-gray-800">
                <Calendar className="mx-auto text-gray-500 mb-4" size={48} />
                <h3 className="text-xl font-medium text-gray-300">No events scheduled</h3>
                <p className="text-gray-500 mt-2">Create your first event to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {events.map((ev: any) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={ev.id}
                    className="bg-card border border-gray-800 p-6 rounded-2xl flex items-center justify-between shadow-lg"
                  >
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{ev.title}</h3>
                      <div className="flex items-center gap-4 text-gray-400 text-sm">
                        <span className="flex items-center gap-1"><Clock size={16} /> {ev.duration} mins</span>
                        <span>{format(parseISO(ev.startTime), 'MMM d, yyyy h:mm a')} - {format(parseISO(ev.endTime), 'h:mm a')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {ev.status}
                      </div>
                      <button
                        onClick={(e) => handleDelete(ev.id, e)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#151a24]">
              <h2 className="text-xl font-bold text-white">
                {format(weekStart, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">Today</button>
                <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
              </div>
            </div>

            <div className="flex bg-[#1a2130]">
              <div className="w-[80px] flex-shrink-0 flex items-center justify-center border-r border-b border-gray-800 text-gray-500 font-medium text-sm p-4">Time</div>
              <div className="flex-1 grid grid-cols-7">
                {weekDays.map(day => (
                  <div key={day.toString()} className="p-4 text-center border-r border-b border-gray-800 last:border-r-0">
                    <div className="text-gray-400 text-xs uppercase font-bold">{format(day, 'EEE')}</div>
                    <div className={`text-xl font-medium mt-1 ${format(day, 'MM-dd') === format(new Date(), 'MM-dd') ? 'text-primary' : 'text-white'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex relative h-[600px] overflow-y-auto no-scrollbar">
              <div className="w-[80px] flex-shrink-0 border-r border-gray-800 bg-card z-10 sticky left-0 divide-y divide-gray-800/30">
                {hours.map(hour => (
                  <div key={hour} className="h-[60px] flex items-start justify-center pt-2 text-xs text-gray-500">
                    {format(setHours(new Date(), hour), 'h a')}
                  </div>
                ))}
              </div>

              <div className="flex-1 grid grid-cols-7 relative bg-card">
                {/* Columns for days */}
                {weekDays.map(day => (
                  <div key={day.toString()} className="relative border-r border-gray-800/50 last:border-r-0 group/col">
                    {hours.map(hour => (
                      <div
                        key={hour}
                        onClick={() => openManualSlot(day, hour)}
                        className="h-[60px] border-b border-gray-800/20 hover:bg-white/[0.05] cursor-pointer transition-colors relative"
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity">
                          <Plus className="text-gray-500" size={24} />
                        </div>
                      </div>
                    ))}

                    {/* Render Events */}
                    {events.map((ev: any) => {
                      const start = parseISO(ev.startTime);
                      const end = parseISO(ev.endTime);

                      // Check if event falls on this date
                      if (format(start, 'yyyy-MM-dd') !== format(day, 'yyyy-MM-dd')) return null;

                      const startTotalMins = start.getHours() * 60 + start.getMinutes();
                      const gridStartMins = START_HOUR * 60;
                      if (startTotalMins < gridStartMins) return null; // Pre-8AM events excluded for now

                      const topPixel = ((startTotalMins - gridStartMins) / 60) * HOUR_HEIGHT;
                      const heightPixel = (ev.duration / 60) * HOUR_HEIGHT;

                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={ev.id}
                          className="absolute inset-x-1 bg-primary border hover:border-primary-foreground border-primary text-black bg-opacity-90 overflow-hidden shadow-lg z-20 transition-all flex flex-col justify-between group/item"
                          style={{ top: `${topPixel}px`, height: `${heightPixel}px`, borderRadius: '6px' }}
                        >
                          <div className="p-2 truncate block w-full relative">
                            <div className="font-bold text-xs truncate text-primary-foreground leading-tight pr-6">{ev.title}</div>
                            <div className="text-[10px] text-primary-foreground opacity-90 truncate">{format(start, 'h:mm')} - {format(end, 'h:mm a')}</div>
                            <button
                              onClick={(e) => handleDelete(ev.id, e)}
                              title="Delete Event"
                              className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 hover:bg-red-500 group-hover/item:opacity-100 transition-all cursor-pointer z-30"
                            >
                              <Trash2 size={12} strokeWidth={3} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wizard Form */}
        <AnimatePresence>
          {showWizard && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card w-full max-w-lg border border-gray-700 rounded-3xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
              >
                <button onClick={() => { setShowWizard(false); setSuggestion(null) }} className="absolute top-6 right-6 text-gray-500 hover:text-white">
                  <XCircle size={24} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6">Schedule New Event</h2>

                <div className="flex gap-2 mb-6 bg-[#1a2130] p-1 rounded-xl">
                  <button
                    onClick={() => setFormData({ ...formData, isManual: false })}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${!formData.isManual ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    Auto-Suggest
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, isManual: true })}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium rounded-lg transition-colors ${formData.isManual ? 'bg-gray-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    <Edit size={16} /> Manual Time
                  </button>
                </div>

                {!suggestion ? (
                  <form onSubmit={formData.isManual ? handleManualSubmit : handleSuggest} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Event Title</label>
                      <input
                        required
                        className="w-full bg-[#151a24] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="e.g. Project Sync"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>

                    {!formData.isManual ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Duration (minutes)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="w-full bg-[#151a24] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                          <input
                            type="datetime-local"
                            required
                            className="w-full bg-[#151a24] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                            value={formData.manualStart}
                            onChange={(e) => setFormData({ ...formData, manualStart: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                          <input
                            type="datetime-local"
                            required
                            className="w-full bg-[#151a24] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                            value={formData.manualEnd}
                            onChange={(e) => setFormData({ ...formData, manualEnd: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      disabled={loading}
                      type="submit"
                      className="w-full bg-primary text-white py-4 rounded-xl font-bold mt-4 hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {loading ? 'Processing...' : (formData.isManual ? 'Create Custom Event' : 'Find Free Time')}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-primary/10 border border-primary/30 p-6 rounded-2xl text-center">
                      <p className="text-primary font-medium mb-2">Suggested Time Slot Found</p>
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {format(parseISO(suggestion.suggestedStart), 'EEEE, MMM d')}
                      </h3>
                      <p className="text-xl text-gray-300">
                        {format(parseISO(suggestion.suggestedStart), 'h:mm a')} - {format(parseISO(suggestion.suggestedEnd), 'h:mm a')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleDecision(false)}
                        className="flex items-center justify-center gap-2 border border-gray-700 hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition-colors"
                      >
                        <XCircle size={20} /> Reject Time
                      </button>
                      <button
                        onClick={() => handleDecision(true)}
                        className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-colors"
                      >
                        <CheckCircle2 size={20} /> Accept & Save
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
