const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./utils/errorHandler');
const { initializeSchedulers } = require('./services/scheduler');

// Import routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const integrationRoutes = require('./routes/integrations');
const reportRoutes = require('./routes/reports');
const salaryRoutes = require('./routes/salary');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/salary', salaryRoutes);

// Handle 404 routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Initialize database and start server
initializeDatabase()
  .then(() => {
    // Initialize schedulers after database is ready
    initializeSchedulers();
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  });

module.exports = app;