const mongoose = require('mongoose');

/**
 * Enhanced Task Schema with improved validation and indexing
 */
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [1, 'Task title must be at least 1 character long'],
    maxlength: [500, 'Task title cannot exceed 500 characters'],
    validate: {
      validator: function(value) {
        // Ensure title is not just whitespace
        return value && value.trim().length > 0;
      },
      message: 'Task title cannot be empty or just whitespace'
    }
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Task description cannot exceed 2000 characters'],
    default: ''
  },
  
  completed: {
    type: Boolean,
    default: false,
    index: true // Index for efficient filtering by completion status
  },
  
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Priority must be one of: low, medium, high, urgent'
    },
    default: 'medium',
    index: true
  },
  
  dueDate: {
    type: Date,
    validate: {
      validator: function(value) {
        // If dueDate is provided, it should be in the future
        return !value || value > new Date();
      },
      message: 'Due date must be in the future'
    },
    index: true
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  completedAt: {
    type: Date,
    default: null
  },
  
  // Soft delete functionality
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  
  // Transform output to remove sensitive fields and format dates
  toJSON: {
    transform: function(doc, ret) {
      // Remove internal fields from JSON output
      delete ret.__v;
      delete ret.isDeleted;
      delete ret.deletedAt;
      
      // Format dates
      if (ret.createdAt) {
        ret.createdAt = ret.createdAt.toISOString();
      }
      if (ret.updatedAt) {
        ret.updatedAt = ret.updatedAt.toISOString();
      }
      if (ret.dueDate) {
        ret.dueDate = ret.dueDate.toISOString();
      }
      if (ret.completedAt) {
        ret.completedAt = ret.completedAt.toISOString();
      }
      
      return ret;
    }
  },
  
  toObject: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Indexes for better query performance
 */
// Compound index for common queries
taskSchema.index({ completed: 1, createdAt: -1 });
taskSchema.index({ priority: 1, dueDate: 1 });
taskSchema.index({ isDeleted: 1, createdAt: -1 });

// Text index for search functionality
taskSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
}, {
  weights: {
    title: 10,
    description: 5,
    tags: 1
  },
  name: 'task_text_index'
});

/**
 * Pre-save middleware
 */
taskSchema.pre('save', function(next) {
  // Set completedAt when task is marked as completed
  if (this.isModified('completed')) {
    if (this.completed && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!this.completed) {
      this.completedAt = null;
    }
  }
  
  // Remove empty tags
  if (this.tags) {
    this.tags = this.tags.filter(tag => tag && tag.trim().length > 0);
  }
  
  next();
});

/**
 * Pre-update middleware
 */
taskSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate();
  
  // Handle completion status changes in updates
  if (update.$set && update.$set.completed !== undefined) {
    if (update.$set.completed) {
      update.$set.completedAt = new Date();
    } else {
      update.$set.completedAt = null;
    }
  }
  
  next();
});

/**
 * Static methods
 */
taskSchema.statics.findActive = function() {
  return this.find({ isDeleted: { $ne: true } });
};

taskSchema.statics.findCompleted = function() {
  return this.find({ completed: true, isDeleted: { $ne: true } });
};

taskSchema.statics.findPending = function() {
  return this.find({ completed: false, isDeleted: { $ne: true } });
};

taskSchema.statics.findByPriority = function(priority) {
  return this.find({ priority, isDeleted: { $ne: true } });
};

taskSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    completed: false,
    isDeleted: { $ne: true }
  });
};

taskSchema.statics.searchTasks = function(searchTerm) {
  return this.find({
    $text: { $search: searchTerm },
    isDeleted: { $ne: true }
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

/**
 * Instance methods
 */
taskSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

taskSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  return this.save();
};

taskSchema.methods.toggleCompletion = function() {
  this.completed = !this.completed;
  return this.save();
};

taskSchema.methods.checkIfOverdue = function() {
  return this.dueDate && this.dueDate < new Date() && !this.completed;
};

/**
 * Virtual properties
 */
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && !this.completed;
});

taskSchema.virtual('timeUntilDue').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const timeDiff = this.dueDate.getTime() - now.getTime();
  return timeDiff > 0 ? timeDiff : 0;
});

taskSchema.virtual('daysSinceCreated').get(function() {
  const now = new Date();
  const timeDiff = now.getTime() - this.createdAt.getTime();
  return Math.floor(timeDiff / (1000 * 3600 * 24));
});

// Ensure virtual fields are serialized
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

/**
 * Error handling for validation
 */
taskSchema.post('save', function(error, doc, next) {
  if (error.name === 'ValidationError') {
    const errors = {};
    for (const field in error.errors) {
      errors[field] = error.errors[field].message;
    }
    const customError = new Error('Validation failed');
    customError.name = 'ValidationError';
    customError.errors = errors;
    customError.statusCode = 400;
    next(customError);
  } else {
    next(error);
  }
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
