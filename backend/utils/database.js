const mongoose = require('mongoose');

/**
 * Database utility functions
 */
class DatabaseUtils {
  /**
   * Validate MongoDB ObjectId
   */
  static isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Convert string to ObjectId
   */
  static toObjectId(id) {
    if (!this.isValidObjectId(id)) {
      throw new Error('Invalid ObjectId format');
    }
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Handle database errors and return standardized error response
   */
  static handleDatabaseError(error) {
    console.error('Database Error:', error);

    // Validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return {
        type: 'validation',
        message: 'Validation failed',
        errors,
        statusCode: 400
      };
    }

    // Duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return {
        type: 'duplicate',
        message: `${field} already exists`,
        field,
        statusCode: 409
      };
    }

    // Cast error (invalid ObjectId)
    if (error.name === 'CastError') {
      return {
        type: 'cast',
        message: 'Invalid ID format',
        field: error.path,
        statusCode: 400
      };
    }

    // Connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return {
        type: 'connection',
        message: 'Database connection error',
        statusCode: 503
      };
    }

    // Default error
    return {
      type: 'unknown',
      message: 'Database operation failed',
      statusCode: 500
    };
  }

  /**
   * Build pagination options
   */
  static buildPaginationOptions(page = 1, limit = 10, maxLimit = 100) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    return {
      page: pageNum,
      limit: limitNum,
      skip
    };
  }

  /**
   * Build sort options from query string
   */
  static buildSortOptions(sortBy = 'createdAt', sortOrder = 'desc') {
    const validSortOrders = ['asc', 'desc', '1', '-1'];
    const order = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';
    
    // Convert to mongoose sort format
    const sortValue = (order === 'asc' || order === '1') ? 1 : -1;
    
    return { [sortBy]: sortValue };
  }

  /**
   * Build filter options from query parameters
   */
  static buildFilterOptions(filters = {}) {
    const mongoFilters = {};

    // Handle common filter patterns
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      
      if (value === null || value === undefined || value === '') {
        return;
      }

      switch (key) {
        case 'completed':
          mongoFilters.completed = value === 'true' || value === true;
          break;
          
        case 'priority':
          if (Array.isArray(value)) {
            mongoFilters.priority = { $in: value };
          } else {
            mongoFilters.priority = value;
          }
          break;
          
        case 'tags':
          if (Array.isArray(value)) {
            mongoFilters.tags = { $in: value };
          } else {
            mongoFilters.tags = value;
          }
          break;
          
        case 'dueDateFrom':
          if (!mongoFilters.dueDate) mongoFilters.dueDate = {};
          mongoFilters.dueDate.$gte = new Date(value);
          break;
          
        case 'dueDateTo':
          if (!mongoFilters.dueDate) mongoFilters.dueDate = {};
          mongoFilters.dueDate.$lte = new Date(value);
          break;
          
        case 'createdFrom':
          if (!mongoFilters.createdAt) mongoFilters.createdAt = {};
          mongoFilters.createdAt.$gte = new Date(value);
          break;
          
        case 'createdTo':
          if (!mongoFilters.createdAt) mongoFilters.createdAt = {};
          mongoFilters.createdAt.$lte = new Date(value);
          break;
          
        case 'search':
          mongoFilters.$text = { $search: value };
          break;
          
        default:
          mongoFilters[key] = value;
      }
    });

    // Always exclude soft-deleted items unless explicitly requested
    if (!filters.includeDeleted) {
      mongoFilters.isDeleted = { $ne: true };
    }

    return mongoFilters;
  }

  /**
   * Execute paginated query with metadata
   */
  static async executePaginatedQuery(model, filters = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = { createdAt: -1 },
      populate = null,
      select = null
    } = options;

    const paginationOptions = this.buildPaginationOptions(page, limit);
    
    try {
      // Build the query
      let query = model.find(filters);
      
      if (select) {
        query = query.select(select);
      }
      
      if (populate) {
        query = query.populate(populate);
      }
      
      // Execute count and data queries in parallel
      const [totalCount, data] = await Promise.all([
        model.countDocuments(filters),
        query
          .sort(sort)
          .skip(paginationOptions.skip)
          .limit(paginationOptions.limit)
          .exec()
      ]);

      const totalPages = Math.ceil(totalCount / paginationOptions.limit);
      const hasNextPage = paginationOptions.page < totalPages;
      const hasPrevPage = paginationOptions.page > 1;

      return {
        data,
        pagination: {
          currentPage: paginationOptions.page,
          totalPages,
          totalCount,
          limit: paginationOptions.limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? paginationOptions.page + 1 : null,
          prevPage: hasPrevPage ? paginationOptions.page - 1 : null
        }
      };
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Perform database transaction
   */
  static async executeTransaction(operations) {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const results = [];
      for (const operation of operations) {
        const result = await operation(session);
        results.push(result);
      }
      
      await session.commitTransaction();
      return results;
    } catch (error) {
      await session.abortTransaction();
      throw this.handleDatabaseError(error);
    } finally {
      session.endSession();
    }
  }

  /**
   * Bulk operations helper
   */
  static async executeBulkWrite(model, operations) {
    try {
      const result = await model.bulkWrite(operations, {
        ordered: false, // Continue on error
        writeConcern: { w: 'majority' }
      });
      
      return {
        success: true,
        insertedCount: result.insertedCount,
        modifiedCount: result.modifiedCount,
        deletedCount: result.deletedCount,
        upsertedCount: result.upsertedCount,
        matchedCount: result.matchedCount
      };
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Database health check utilities
   */
  static async checkCollectionHealth(model) {
    try {
      const collectionName = model.collection.name;
      const stats = await model.collection.stats();
      
      return {
        collection: collectionName,
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        indexes: stats.nindexes,
        indexSize: stats.totalIndexSize,
        healthy: true
      };
    } catch (error) {
      return {
        collection: model.collection.name,
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up expired or soft-deleted records
   */
  static async cleanupExpiredRecords(model, options = {}) {
    const {
      field = 'deletedAt',
      olderThan = 30, // days
      batchSize = 100
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThan);

    try {
      const filter = {
        [field]: { $lt: cutoffDate },
        isDeleted: true
      };

      const result = await model.deleteMany(filter);
      
      return {
        success: true,
        deletedCount: result.deletedCount,
        cutoffDate
      };
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }
}

module.exports = DatabaseUtils;
