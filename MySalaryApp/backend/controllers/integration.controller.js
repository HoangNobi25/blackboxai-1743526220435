const { query, queryOne, run } = require('../config/database');
const { APIError, catchAsync } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { refreshGoogleSheetsData } = require('../services/googleSheetsService');
const { refreshWebsiteData } = require('../services/websiteUsageService');

// Get all integrations
const getAllIntegrations = catchAsync(async (req, res) => {
  const integrations = await query('SELECT * FROM INTEGRATION');
  
  res.status(200).json({
    status: 'success',
    data: {
      integrations
    }
  });
});

// Get single integration
const getIntegration = catchAsync(async (req, res) => {
  const integration = await queryOne('SELECT * FROM INTEGRATION WHERE id = ?', [req.params.id]);
  
  if (!integration) {
    throw new APIError('Integration not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      integration
    }
  });
});

// Create new integration
const createIntegration = catchAsync(async (req, res) => {
  const { type, name, token, details } = req.body;

  // Validate required fields
  if (!type || !name || !token) {
    throw new APIError('Please provide type, name, and token', 400);
  }

  // Validate integration type
  if (!['google_sheets', 'website'].includes(type)) {
    throw new APIError('Invalid integration type. Must be either "google_sheets" or "website"', 400);
  }

  // Verify integration credentials
  try {
    if (type === 'google_sheets') {
      await refreshGoogleSheetsData({ token }); // Test connection
    } else if (type === 'website') {
      await refreshWebsiteData({ token }); // Test connection
    }
  } catch (error) {
    throw new APIError(`Failed to verify ${type} integration: ${error.message}`, 400);
  }

  // Create integration
  const result = await run(
    'INSERT INTO INTEGRATION (type, name, token, details) VALUES (?, ?, ?, ?)',
    [type, name, token, details || null]
  );

  res.status(201).json({
    status: 'success',
    message: 'Integration created successfully',
    data: {
      id: result.id
    }
  });
});

// Update integration
const updateIntegration = catchAsync(async (req, res) => {
  const { name, token, details } = req.body;
  const integrationId = req.params.id;

  // Check if integration exists
  const integration = await queryOne('SELECT * FROM INTEGRATION WHERE id = ?', [integrationId]);
  if (!integration) {
    throw new APIError('Integration not found', 404);
  }

  // Build update query dynamically
  const updates = [];
  const values = [];

  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (token) {
    // Verify new token if provided
    try {
      if (integration.type === 'google_sheets') {
        await refreshGoogleSheetsData({ token });
      } else if (integration.type === 'website') {
        await refreshWebsiteData({ token });
      }
      updates.push('token = ?');
      values.push(token);
    } catch (error) {
      throw new APIError(`Failed to verify new token: ${error.message}`, 400);
    }
  }
  if (details !== undefined) {
    updates.push('details = ?');
    values.push(details);
  }

  if (updates.length === 0) {
    throw new APIError('No valid fields to update', 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(integrationId);

  await run(
    `UPDATE INTEGRATION SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  res.status(200).json({
    status: 'success',
    message: 'Integration updated successfully'
  });
});

// Delete integration
const deleteIntegration = catchAsync(async (req, res) => {
  const integrationId = req.params.id;

  // Check if integration exists
  const integration = await queryOne('SELECT id FROM INTEGRATION WHERE id = ?', [integrationId]);
  if (!integration) {
    throw new APIError('Integration not found', 404);
  }

  // Delete integration (cascade will handle related worktime records)
  await run('DELETE FROM INTEGRATION WHERE id = ?', [integrationId]);

  res.status(200).json({
    status: 'success',
    message: 'Integration deleted successfully'
  });
});

// Refresh integration data manually
const refreshIntegrationData = catchAsync(async (req, res) => {
  const integrationId = req.params.id;

  // Check if integration exists
  const integration = await queryOne('SELECT * FROM INTEGRATION WHERE id = ?', [integrationId]);
  if (!integration) {
    throw new APIError('Integration not found', 404);
  }

  try {
    if (integration.type === 'google_sheets') {
      await refreshGoogleSheetsData(integration);
    } else if (integration.type === 'website') {
      await refreshWebsiteData(integration);
    }

    res.status(200).json({
      status: 'success',
      message: 'Integration data refreshed successfully'
    });
  } catch (error) {
    throw new APIError(`Failed to refresh integration data: ${error.message}`, 500);
  }
});

module.exports = {
  getAllIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  refreshIntegrationData
};