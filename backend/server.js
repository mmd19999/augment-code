const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import improved database configuration and models
const databaseManager = require('./config/database');
const Task = require('./models/Task');
const DatabaseUtils = require('./utils/database');

// Import routes
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup database connection with event listeners
databaseManager.setupEventListeners();

// Connect to MongoDB with improved configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager';
databaseManager.connect(MONGODB_URI);

// Routes
app.use('/health', healthRoutes);

// GET /tasks - Fetch all tasks with improved querying
app.get('/tasks', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      completed,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filters
    const filters = DatabaseUtils.buildFilterOptions({
      completed,
      priority,
      search
    });

    // Build sort options
    const sort = DatabaseUtils.buildSortOptions(sortBy, sortOrder);

    // Execute paginated query
    const result = await DatabaseUtils.executePaginatedQuery(Task, filters, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    const dbError = DatabaseUtils.handleDatabaseError(error);
    res.status(dbError.statusCode).json({
      error: dbError.message,
      type: dbError.type,
      ...(dbError.errors && { errors: dbError.errors })
    });
  }
});

// POST /tasks - Create a new task with enhanced validation
app.post('/tasks', async (req, res) => {
  try {
    const { title, description, priority, dueDate, tags } = req.body;

    // Basic validation is now handled by the model
    const taskData = {
      title,
      ...(description && { description }),
      ...(priority && { priority }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(tags && { tags: Array.isArray(tags) ? tags : [tags] })
    };

    const newTask = new Task(taskData);
    const savedTask = await newTask.save();

    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    const dbError = DatabaseUtils.handleDatabaseError(error);
    res.status(dbError.statusCode).json({
      error: dbError.message,
      type: dbError.type,
      ...(dbError.errors && { errors: dbError.errors })
    });
  }
});

// PUT /tasks/:id - Update a task with enhanced validation
app.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!DatabaseUtils.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }

    const { completed, title, description, priority, dueDate, tags } = req.body;

    const updateData = {};
    if (completed !== undefined) updateData.completed = completed;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [tags];

    const updatedTask = await Task.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    const dbError = DatabaseUtils.handleDatabaseError(error);
    res.status(dbError.statusCode).json({
      error: dbError.message,
      type: dbError.type,
      ...(dbError.errors && { errors: dbError.errors })
    });
  }
});

// DELETE /tasks/:id - Soft delete a task
app.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    // Validate ObjectId
    if (!DatabaseUtils.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }

    let deletedTask;

    if (permanent === 'true') {
      // Permanent deletion (only in development)
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Permanent deletion not allowed in production' });
      }
      deletedTask = await Task.findByIdAndDelete(id);
    } else {
      // Soft delete
      deletedTask = await Task.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
    }

    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      message: permanent === 'true' ? 'Task permanently deleted' : 'Task deleted successfully',
      task: deletedTask
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    const dbError = DatabaseUtils.handleDatabaseError(error);
    res.status(dbError.statusCode).json({
      error: dbError.message,
      type: dbError.type
    });
  }
});

// Additional task endpoints

// GET /tasks/:id - Get a specific task
app.get('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!DatabaseUtils.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }

    const task = await Task.findOne({ _id: id, isDeleted: { $ne: true } });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    const dbError = DatabaseUtils.handleDatabaseError(error);
    res.status(dbError.statusCode).json({
      error: dbError.message,
      type: dbError.type
    });
  }
});

// POST /tasks/bulk - Bulk operations
app.post('/tasks/bulk', async (req, res) => {
  try {
    const { operation, tasks, filters } = req.body;

    if (!operation || !['create', 'update', 'delete'].includes(operation)) {
      return res.status(400).json({ error: 'Invalid or missing operation' });
    }

    let result;

    switch (operation) {
      case 'create':
        if (!Array.isArray(tasks) || tasks.length === 0) {
          return res.status(400).json({ error: 'Tasks array is required for bulk create' });
        }

        const bulkCreateOps = tasks.map(task => ({
          insertOne: { document: task }
        }));

        result = await DatabaseUtils.executeBulkWrite(Task, bulkCreateOps);
        break;

      case 'update':
        if (!filters || !filters.update) {
          return res.status(400).json({ error: 'Update filters are required' });
        }

        const updateResult = await Task.updateMany(
          DatabaseUtils.buildFilterOptions(filters.where || {}),
          filters.update
        );

        result = {
          success: true,
          modifiedCount: updateResult.modifiedCount,
          matchedCount: updateResult.matchedCount
        };
        break;

      case 'delete':
        if (!filters) {
          return res.status(400).json({ error: 'Delete filters are required' });
        }

        const deleteResult = await Task.updateMany(
          DatabaseUtils.buildFilterOptions(filters),
          { isDeleted: true, deletedAt: new Date() }
        );

        result = {
          success: true,
          deletedCount: deleteResult.modifiedCount
        };
        break;
    }

    res.json(result);
  } catch (error) {
    console.error('Error in bulk operation:', error);
    const dbError = DatabaseUtils.handleDatabaseError(error);
    res.status(dbError.statusCode).json({
      error: dbError.message,
      type: dbError.type
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid data format',
      details: err.message
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
