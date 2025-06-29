const mongoose = require('mongoose');

/**
 * Database configuration and connection management
 */
class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Get MongoDB connection options with optimized settings
   */
  getConnectionOptions() {
    return {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2,  // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      
      // Connection timeout settings
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long to wait for a response
      connectTimeoutMS: 10000, // How long to wait for initial connection
      
      // Heartbeat settings
      heartbeatFrequencyMS: 10000, // How often to check server status
      
      // Buffer settings
      bufferCommands: false, // Disable mongoose buffering
      
      // Other options
      retryWrites: true,
      w: 'majority', // Write concern
      readPreference: 'primary',
      
      // Enable compression
      compressors: ['zlib'],
      zlibCompressionLevel: 6,
    };
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect(uri) {
    if (this.isConnected) {
      console.log('Database already connected');
      return;
    }

    const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager';
    
    try {
      console.log('Attempting to connect to MongoDB...');
      
      await mongoose.connect(mongoUri, this.getConnectionOptions());
      
      this.isConnected = true;
      this.connectionRetries = 0;
      
      console.log('✅ Successfully connected to MongoDB');
      console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
      console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      
      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        console.log(`🔄 Retrying connection (${this.connectionRetries}/${this.maxRetries}) in ${this.retryDelay/1000} seconds...`);
        
        setTimeout(() => {
          this.connect(uri);
        }, this.retryDelay);
      } else {
        console.error('💥 Max connection retries reached. Exiting...');
        process.exit(1);
      }
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🔌 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
    }
  }

  /**
   * Get database connection status
   */
  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      4: 'uninitialized'
    };

    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      status: states[mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.db?.databaseName,
      collections: mongoose.connection.db ? Object.keys(mongoose.connection.collections) : []
    };
  }

  /**
   * Setup connection event listeners
   */
  setupEventListeners() {
    // Connection successful
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    // Connection error
    mongoose.connection.on('error', (error) => {
      console.error('🔴 Mongoose connection error:', error.message);
      this.isConnected = false;
    });

    // Connection disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Connection reconnected
    mongoose.connection.on('reconnected', () => {
      console.log('🟢 Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // Process termination handlers
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
      await this.disconnect();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await this.disconnect();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.disconnect();
      process.exit(1);
    });
  }

  /**
   * Perform database health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      // Ping the database
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();
      
      if (result.ok !== 1) {
        throw new Error('Database ping failed');
      }

      // Get database stats
      const stats = await mongoose.connection.db.stats();
      
      return {
        status: 'healthy',
        connected: true,
        database: mongoose.connection.db.databaseName,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        avgObjSize: stats.avgObjSize,
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        uptime: process.uptime()
      };
    }
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

module.exports = databaseManager;
