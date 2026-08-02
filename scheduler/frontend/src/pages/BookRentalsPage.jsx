import { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Clock, AlertTriangle, CheckCircle2, 
  Calendar, RotateCcw, User, Mail, Phone, BookCheck, ShieldAlert 
} from 'lucide-react';
import { getRentals, borrowBook, returnBook, extendRental, getBooks } from '../services/api';

export default function BookRentalsPage() {
  const [rentals, setRentals] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, due_soon, overdue, returned
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    book_id: '',
    book_title: '',
    borrower_name: '',
    borrower_email: '',
    borrower_phone: '',
    borrow_date: new Date().toISOString().slice(0, 16),
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [rentalsRes, booksRes] = await Promise.all([
        getRentals(),
        getBooks()
      ]);
      setRentals(rentalsRes.data);
      setBooks(booksRes.data);
    } catch (err) {
      console.error('Failed to load rentals data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectBook = (e) => {
    const bookId = e.target.value;
    const selectedBook = books.find(b => b.id === bookId);
    setFormData(prev => ({
      ...prev,
      book_id: bookId,
      book_title: selectedBook ? selectedBook.title : prev.book_title
    }));
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!formData.book_title || !formData.borrower_name || !formData.due_date) return;
    try {
      setSubmitting(true);
      await borrowBook(formData);
      setIsModalOpen(false);
      setFormData({
        book_id: '',
        book_title: '',
        borrower_name: '',
        borrower_email: '',
        borrower_phone: '',
        borrow_date: new Date().toISOString().slice(0, 16),
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
        notes: ''
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to record borrowing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (rentalId) => {
    if (!confirm('Mark this book rental as returned?')) return;
    try {
      await returnBook(rentalId);
      loadData();
    } catch (err) {
      alert('Failed to mark as returned');
    }
  };

  const handleExtend = async (rentalId) => {
    try {
      await extendRental(rentalId, 7);
      loadData();
    } catch (err) {
      alert('Failed to extend rental');
    }
  };

  const filteredRentals = rentals.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'active') return r.status !== 'returned';
    return r.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" /> Overdue
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Due Soon
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BookOpen className="w-3.5 h-3.5" /> Borrowed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-400" />
            Book Rental Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track book loans, borrower reminders, due dates, and return alerts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> Log Book Checkout
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'all', label: 'All Rentals' },
          { id: 'active', label: 'Active Loans' },
          { id: 'due_soon', label: 'Due Soon (3 Days)' },
          { id: 'overdue', label: 'Overdue Alerts' },
          { id: 'returned', label: 'Returned History' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              filter === tab.id
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rentals List */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading rentals...</div>
      ) : filteredRentals.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-slate-300 font-semibold">No Book Rentals Found</h3>
          <p className="text-slate-500 text-xs mt-1">Log a new book checkout to start tracking return reminders.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRentals.map(rental => (
            <div 
              key={rental.id} 
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between transition-all shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-bold text-white text-base line-clamp-1">{rental.book_title}</h3>
                  {getStatusBadge(rental.status)}
                </div>

                <div className="space-y-2 text-xs text-slate-400 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Borrower: <strong className="text-slate-200">{rental.borrower_name}</strong></span>
                  </div>
                  {rental.borrower_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{rental.borrower_email}</span>
                    </div>
                  )}
                  {rental.borrower_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{rental.borrower_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Borrowed: {new Date(rental.borrow_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Due Date: <strong className={rental.status === 'overdue' ? 'text-rose-400 font-bold' : 'text-slate-200'}>{new Date(rental.due_date).toLocaleDateString()}</strong></span>
                  </div>
                  {rental.notes && (
                    <p className="italic text-slate-500 mt-1">"{rental.notes}"</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {rental.status !== 'returned' && (
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleReturn(rental.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-medium text-xs border border-emerald-500/30 transition-all"
                  >
                    <BookCheck className="w-3.5 h-3.5" /> Return Book
                  </button>
                  <button
                    onClick={() => handleExtend(rental.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all"
                    title="Extend loan by +7 days"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> +7 Days
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Borrow Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" /> Log New Book Borrowing
            </h2>
            <form onSubmit={handleBorrowSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Book from Catalog (Optional)</label>
                <select
                  onChange={handleSelectBook}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose existing book or type title --</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title} ({b.author})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={formData.book_title}
                  onChange={e => setFormData({ ...formData, book_title: e.target.value })}
                  placeholder="e.g. Clean Code, To Kill a Mockingbird"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Borrower Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.borrower_name}
                    onChange={e => setFormData({ ...formData, borrower_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Borrower Email</label>
                  <input
                    type="email"
                    value={formData.borrower_email}
                    onChange={e => setFormData({ ...formData, borrower_email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Borrow Date</label>
                  <input
                    type="datetime-local"
                    value={formData.borrow_date}
                    onChange={e => setFormData({ ...formData, borrow_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Return Due Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes / Condition</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Hardcover edition, borrowed from City Library"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-all text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all text-xs"
                >
                  {submitting ? 'Saving...' : 'Save & Set Reminders'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
