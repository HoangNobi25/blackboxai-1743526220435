const express = require('express');
const { protect, restrictTo } = require('../controllers/auth.controller');
const {
  getSalarySummary,
  getSalaryHistory,
  getSalaryReport,
  triggerSalaryProcessing
} = require('../controllers/salary.controller');

const router = express.Router();

// Protect all routes
router.use(protect);

// Routes accessible by both employees and managers
router.get('/summary', getSalarySummary);
router.get('/history', getSalaryHistory);

// Routes accessible only by managers
router.get('/report', restrictTo('manager'), getSalaryReport);
router.post('/process', restrictTo('manager'), triggerSalaryProcessing);

module.exports = router;