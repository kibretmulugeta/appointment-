const Task = require('../models/Task');

// @desc    Get all tasks for logged in user
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { search, category, priority, status, sortBy } = req.query;

    const query = { userId: req.user._id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (priority && priority !== 'All') {
      query.priority = priority;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === 'dueDate') {
      sortOption = { dueDate: 1 };
    } else if (sortBy === 'priority') {
      sortOption = { priority: -1 };
    } else if (sortBy === 'title') {
      sortOption = { title: 1 };
    }

    const tasks = await Task.find(query).sort(sortOption);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const { title, description, priority, category, dueDate, dueTime, reminderOffset } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Calculate reminder time if offset provided (e.g. 15 mins before due date)
    let reminderTime = null;
    if (dueDate && reminderOffset !== undefined && reminderOffset !== null) {
      const dueDateTime = new Date(`${dueDate}T${dueTime || '09:00'}:00`);
      reminderTime = new Date(dueDateTime.getTime() - Number(reminderOffset) * 60 * 1000);
    }

    const task = await Task.create({
      userId: req.user._id,
      title,
      description,
      priority: priority || 'Medium',
      category: category || 'General',
      dueDate: dueDate ? new Date(dueDate) : null,
      dueTime: dueTime || null,
      reminderTime,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { title, description, status, priority, category, dueDate, dueTime, reminderOffset } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) {
      task.status = status;
      if (status === 'Completed') {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }
    }
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (dueTime !== undefined) task.dueTime = dueTime;

    if (task.dueDate && reminderOffset !== undefined && reminderOffset !== null) {
      const dateStr = dueDate || task.dueDate.toISOString().split('T')[0];
      const timeStr = dueTime || task.dueTime || '09:00';
      const dueDateTime = new Date(`${dateStr}T${timeStr}:00`);
      task.reminderTime = new Date(dueDateTime.getTime() - Number(reminderOffset) * 60 * 1000);
      task.reminderSent = false;
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle complete status
// @route   PATCH /api/tasks/:id/complete
// @access  Private
const toggleTaskComplete = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status === 'Completed') {
      task.status = 'Pending';
      task.completedAt = null;
    } else {
      task.status = 'Completed';
      task.completedAt = new Date();
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
};
