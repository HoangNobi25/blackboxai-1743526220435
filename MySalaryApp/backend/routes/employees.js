const express = require('express');
const { protect, restrictTo } = require('../controllers/auth.controller');
const {
  getAllEmployees,
  getEmployeeProfile,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getWorkHistory
} = require('../controllers/employee.controller');

const router = express.Router();

// Protect all routes
router.use(protect);

// Manager-only routes
router.route('/')
  .get(restrictTo('manager'), getAllEmployees)
  .post(restrictTo('manager'), createEmployee);

router.route('/:id')
  .get(restrictTo('manager'), getEmployeeProfile)
  .put(restrictTo('manager'), updateEmployee)
  .delete(restrictTo('manager'), deleteEmployee);

router.get('/:id/work-history', restrictTo('manager'), getWorkHistory);

// Employee self-service routes
router.get('/profile', getEmployeeProfile);
router.put('/profile', updateEmployee);
router.get('/work-history', getWorkHistory);

module.exports = router;