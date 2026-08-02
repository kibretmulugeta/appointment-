import { useState, useEffect } from 'react';
import { 
  BookMarked, Plus, CheckCircle, Clock, BookOpen, 
  Trash2, Bell, Sparkles, MapPin, Hash 
} from 'lucide-react';
import { 
  getBooks, createBook, deleteBook, 
  getReadingTasks, createReadingTask, toggleReadingTask, deleteReadingTask 
} from '../services/api';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [readingTasks, setReadingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: 'Fiction',
    total_pages: 300,
    cover_url: '',
    library_location: ''
  });

  const [taskForm, setTaskForm] = useState({
    book_id: '',
    book_title: '',
    target_chapter: '',
    start_page: 1,
    end_page: 30,
    scheduled_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    reminder_minutes_before: 15,
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksRes, tasksRes] = await Promise.all([
        getBooks(),
        getReadingTasks()
      ]);
      setBooks(booksRes.data);
      setReadingTasks(tasksRes.data);
    } catch (err) {
      console.error('Failed to load books/tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBook = async (e) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.author) return;
    try {
      await createBook(bookForm);
      setIsBookModalOpen(false);
      setBookForm({
        title: '',
        author: '',
        isbn: '',
        genre: 'Fiction',
        total_pages: 300,
        cover_url: '',
        library_location: ''
      });
      loadData();
    } catch (err) {
      alert('Failed to add book');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.book_title || !taskForm.scheduled_time) return;
    try {
      await createReadingTask(taskForm);
      setIsTaskModalOpen(false);
      setTaskForm({
        book_id: '',
        book_title: '',
        target_chapter: '',
        start_page: 1,
        end_page: 30,
        scheduled_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        reminder_minutes_before: 15,
        notes: ''
      });
      loadData();
    } catch (err) {
      alert('Failed to schedule reading reminder');
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      await toggleReadingTask(taskId);
      loadData();
    } catch (err) {
      alert('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteReadingTask(taskId);
      loadData();
    } catch (err) {
      alert('Failed to delete task');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
      await deleteBook(bookId);
      loadData();
    } catch (err) {
      alert('Failed to delete book');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookMarked className="w-7 h-7 text-indigo-400" />
            My Books & Reading Reminders
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your personal library, set reading schedules, and get chapter completion alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBookModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> Add Book to Library
          </button>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all text-sm"
          >
            <Bell className="w-4 h-4" /> Set Reading Reminder
          </button>
        </div>
      </div>

      {/* Reading Tasks Reminders Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" /> Upcoming Reading Reminders
          </h2>
          <span className="text-xs text-slate-400 font-semibold bg-slate-800 px-3 py-1 rounded-full">
            {readingTasks.filter(t => t.status === 'pending').length} Pending Tasks
          </span>
        </div>

        {readingTasks.length === 0 ? (
          <p className="text-slate-500 text-xs py-4 text-center">No reading reminders scheduled yet. Click "Set Reading Reminder" above!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {readingTasks.map(task => (
              <div 
                key={task.id}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  task.status === 'completed'
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-950 border-slate-800 hover:border-indigo-500/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-white'}`}>
                      {task.book_title}
                    </span>
                    {task.target_chapter && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                        {task.target_chapter}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-400" /> {new Date(task.scheduled_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                    {(task.start_page > 0 || task.end_page > 0) && (
                      <span>Pages {task.start_page}-{task.end_page}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className={`p-2 rounded-lg transition-all ${
                      task.status === 'completed' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title={task.status === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Catalog Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" /> Books Catalog & Inventory
        </h2>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading books...</div>
        ) : books.length === 0 ? (
          <div className="py-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
            <BookMarked className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 font-semibold text-sm">Your Library is Empty</p>
            <p className="text-slate-500 text-xs">Add books to track your collection and set reading targets.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {books.map(book => (
              <div 
                key={book.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="aspect-[3/4] w-full bg-slate-950 rounded-xl overflow-hidden mb-3 relative border border-slate-800">
                    <img 
                      src={book.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300'} 
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md text-indigo-400 border border-slate-700">
                      {book.genre || 'General'}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm line-clamp-1">{book.title}</h3>
                  <p className="text-slate-400 text-xs mb-2">by {book.author}</p>

                  <div className="space-y-1 text-[11px] text-slate-500">
                    {book.total_pages > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-400" /> {book.total_pages} Pages
                      </div>
                    )}
                    {book.library_location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> {book.library_location}
                      </div>
                    )}
                    {book.isbn && (
                      <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-slate-400" /> ISBN: {book.isbn}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    book.status === 'borrowed' 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {book.status === 'borrowed' ? 'Borrowed Out' : 'Available'}
                  </span>

                  <button
                    onClick={() => handleDeleteBook(book.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Book Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" /> Add New Book
            </h2>
            <form onSubmit={handleCreateBook} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={bookForm.title}
                  onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
                  placeholder="e.g. Design Patterns, Dune"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Author *</label>
                <input
                  type="text"
                  required
                  value={bookForm.author}
                  onChange={e => setBookForm({ ...bookForm, author: e.target.value })}
                  placeholder="e.g. Erich Gamma, Frank Herbert"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Genre</label>
                  <input
                    type="text"
                    value={bookForm.genre}
                    onChange={e => setBookForm({ ...bookForm, genre: e.target.value })}
                    placeholder="Fiction, Tech, Science"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Total Pages</label>
                  <input
                    type="number"
                    value={bookForm.total_pages}
                    onChange={e => setBookForm({ ...bookForm, total_pages: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Library Location / Shelf</label>
                <input
                  type="text"
                  value={bookForm.library_location}
                  onChange={e => setBookForm({ ...bookForm, library_location: e.target.value })}
                  placeholder="e.g. Main Shelf A-3, Central Library"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={bookForm.cover_url}
                  onChange={e => setBookForm({ ...bookForm, cover_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-all text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all text-xs"
                >
                  Add Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Reading Reminder Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" /> Schedule Reading Reminder
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  value={taskForm.book_title}
                  onChange={e => setTaskForm({ ...taskForm, book_title: e.target.value })}
                  placeholder="e.g. Clean Code"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Chapter / Section</label>
                <input
                  type="text"
                  value={taskForm.target_chapter}
                  onChange={e => setTaskForm({ ...taskForm, target_chapter: e.target.value })}
                  placeholder="e.g. Chapter 4: Meaningful Names"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Page</label>
                  <input
                    type="number"
                    value={taskForm.start_page}
                    onChange={e => setTaskForm({ ...taskForm, start_page: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Page</label>
                  <input
                    type="number"
                    value={taskForm.end_page}
                    onChange={e => setTaskForm({ ...taskForm, end_page: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={taskForm.scheduled_time}
                  onChange={e => setTaskForm({ ...taskForm, scheduled_time: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-all text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all text-xs"
                >
                  Schedule Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
