import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Books API
export const getBooks = (params) => api.get('/books', { params });
export const createBook = (data) => api.post('/books', data);
export const updateBook = (id, data) => api.put(`/books/${id}`, data);
export const deleteBook = (id) => api.delete(`/books/${id}`);

// Rentals API
export const getRentals = (params) => api.get('/rentals', { params });
export const borrowBook = (data) => api.post('/rentals/borrow', data);
export const returnBook = (id) => api.post(`/rentals/${id}/return`);
export const extendRental = (id, days = 7) => api.post(`/rentals/${id}/extend?days=${days}`);

// Reading Tasks API
export const getReadingTasks = (params) => api.get('/reading-tasks', { params });
export const createReadingTask = (data) => api.post('/reading-tasks', data);
export const toggleReadingTask = (id) => api.patch(`/reading-tasks/${id}/toggle`);
export const deleteReadingTask = (id) => api.delete(`/reading-tasks/${id}`);

export default api;
