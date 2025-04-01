const express = require('express');
const { protect, restrictTo } = require('../controllers/auth.controller');
const {
  getAllIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  refreshIntegrationData
} = require('../controllers/integration.controller');

const router = express.Router();

// Protect all routes and restrict to managers only
router.use(protect);
router.use(restrictTo('manager'));

// Integration routes
router.route('/')
  .get(getAllIntegrations)
  .post(createIntegration);

router.route('/:id')
  .get(getIntegration)
  .put(updateIntegration)
  .delete(deleteIntegration);

// Manual refresh route
router.post('/:id/refresh', refreshIntegrationData);

module.exports = router;