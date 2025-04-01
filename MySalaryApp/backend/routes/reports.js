const express = require('express');
const { protect, restrictTo } = require('../controllers/auth.controller');
const {
  getWorkTimeReport,
  getIntegrationReport,
  getEmployeeActivityReport,
  exportReport
} = require('../controllers/report.controller');

const router = express.Router();

// Protect all routes
router.use(protect);

// Work time report routes
// Employees can access their own work time data
router.get('/worktime', getWorkTimeReport);

// Integration report routes - manager only
router.get('/integration', restrictTo('manager'), getIntegrationReport);

// Employee activity report routes
// Employees can access their own activity data
router.get('/activity', getEmployeeActivityReport);

// Export report route - manager only
router.get('/export', restrictTo('manager'), exportReport);

module.exports = router;