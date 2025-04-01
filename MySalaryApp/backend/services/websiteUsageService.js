const axios = require('axios');
const { run, query } = require('../config/database');
const logger = require('../utils/logger');

// Helper function to calculate hours between timestamps
const calculateHours = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const hours = (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
  return Math.round(hours * 100) / 100; // Round to 2 decimal places
};

// Process website usage data
const processWebsiteData = async (employeeId, integrationId, usageData) => {
  try {
    for (const session of usageData) {
      const { startTime, endTime } = session;
      const hours = calculateHours(startTime, endTime);

      // Insert or update work time record
      await run(`
        INSERT INTO WORKTIME (
          employee_id,
          integration_id,
          start_time,
          end_time,
          hours
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(employee_id, integration_id, start_time)
        DO UPDATE SET
          end_time = excluded.end_time,
          hours = excluded.hours
      `, [
        employeeId,
        integrationId,
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString(),
        hours
      ]);
    }
  } catch (error) {
    logger.error('Error processing website usage data:', error);
    throw new Error(`Failed to process website usage data: ${error.message}`);
  }
};

// Fetch and refresh website usage data
const refreshWebsiteData = async (integration) => {
  try {
    const { endpoint, apiKey } = JSON.parse(integration.token);
    
    // Fetch data from website tracking API
    const response = await axios.get(endpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const usageData = response.data;

    // Process data for each employee
    for (const employeeUsage of usageData) {
      const { employeeEmail, sessions } = employeeUsage;

      // Get employee ID from email
      const employeeResult = await query(
        'SELECT e.id FROM EMPLOYEE e JOIN USER u ON e.user_id = u.id WHERE u.email = ?',
        [employeeEmail]
      );

      if (employeeResult.length === 0) {
        logger.warn(`No employee found for email: ${employeeEmail}`);
        continue;
      }

      const employeeId = employeeResult[0].id;

      // Process sessions for this employee
      await processWebsiteData(employeeId, integration.id, sessions);
    }

    logger.info(`Successfully refreshed website usage data for integration ${integration.id}`);
  } catch (error) {
    logger.error('Error refreshing website usage data:', error);
    throw new Error(`Failed to refresh website usage data: ${error.message}`);
  }
};

// Validate website integration token
const validateWebsiteIntegration = async (token) => {
  try {
    const { endpoint, apiKey } = JSON.parse(token);
    
    // Test API connection
    await axios.get(endpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return true;
  } catch (error) {
    logger.error('Error validating website integration:', error);
    throw new Error(`Invalid website integration configuration: ${error.message}`);
  }
};

module.exports = {
  refreshWebsiteData,
  validateWebsiteIntegration
};