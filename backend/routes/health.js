const express = require('express');
const databaseManager = require('../config/database');
const DatabaseUtils = require('../utils/database');
const Task = require('../models/Task');

const router = express.Router();

/**
 * Basic health check endpoint
 */
router.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Task Manager API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Detailed health check with database status
 */
router.get('/detailed', async (req, res) => {
  try {
    const [dbHealth, taskCollectionHealth] = await Promise.all([
      databaseManager.healthCheck(),
      DatabaseUtils.checkCollectionHealth(Task)
    ]);

    const connectionStatus = databaseManager.getConnectionStatus();

    const healthData = {
      status: dbHealth.status === 'healthy' ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      
      // Application info
      application: {
        name: 'Task Manager API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      },

      // Database health
      database: {
        ...dbHealth,
        connection: connectionStatus
      },

      // Collections health
      collections: {
        tasks: taskCollectionHealth
      },

      // System resources
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        cpu: {
          usage: process.cpuUsage()
        },
        platform: process.platform,
        arch: process.arch
      }
    };

    // Set appropriate status code
    const statusCode = healthData.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthData);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Database-specific health check
 */
router.get('/database', async (req, res) => {
  try {
    const dbHealth = await databaseManager.healthCheck();
    const connectionStatus = databaseManager.getConnectionStatus();

    const response = {
      ...dbHealth,
      connection: connectionStatus,
      timestamp: new Date().toISOString()
    };

    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);

  } catch (error) {
    console.error('Database health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Database statistics endpoint
 */
router.get('/stats', async (req, res) => {
  try {
    const [taskStats, dbHealth] = await Promise.all([
      DatabaseUtils.checkCollectionHealth(Task),
      databaseManager.healthCheck()
    ]);

    // Get task-specific statistics
    const [totalTasks, completedTasks, pendingTasks, overdueTasks] = await Promise.all([
      Task.countDocuments({ isDeleted: { $ne: true } }),
      Task.countDocuments({ completed: true, isDeleted: { $ne: true } }),
      Task.countDocuments({ completed: false, isDeleted: { $ne: true } }),
      Task.countDocuments({
        dueDate: { $lt: new Date() },
        completed: false,
        isDeleted: { $ne: true }
      })
    ]);

    // Get priority distribution
    const priorityStats = await Task.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get recent activity (tasks created in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTasks = await Task.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      isDeleted: { $ne: true }
    });

    const statistics = {
      timestamp: new Date().toISOString(),
      database: {
        status: dbHealth.status,
        connected: dbHealth.connected
      },
      
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        recentlyCreated: recentTasks
      },

      priorities: priorityStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),

      collection: taskStats
    };

    res.json(statistics);

  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Database maintenance endpoint (admin only)
 */
router.post('/maintenance/cleanup', async (req, res) => {
  try {
    // Only allow in development or with proper authorization
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Maintenance operations not allowed in production without proper authorization'
      });
    }

    const { olderThan = 30 } = req.body;

    const result = await DatabaseUtils.cleanupExpiredRecords(Task, {
      olderThan: parseInt(olderThan)
    });

    res.json({
      message: 'Cleanup completed successfully',
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      error: 'Cleanup operation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
