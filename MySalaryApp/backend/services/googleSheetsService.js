const { google } = require('googleapis');
const { run, query } = require('../config/database');
const logger = require('../utils/logger');

// Helper function to parse time duration from Google Sheets
const parseSheetDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const hours = (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
  return Math.round(hours * 100) / 100; // Round to 2 decimal places
};

// Initialize Google Sheets API
const initializeGoogleSheets = async (credentials) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    logger.error('Failed to initialize Google Sheets:', error);
    throw new Error('Invalid Google Sheets credentials');
  }
};

// Fetch and process data from Google Sheets
const refreshGoogleSheetsData = async (integration) => {
  try {
    const sheets = await initializeGoogleSheets(integration.token);
    
    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: JSON.parse(integration.details).spreadsheetId,
      range: 'Sheet1!A:D', // Assuming columns: Employee Email, Start Time, End Time, Date
    });

    const rows = response.data.values || [];
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const [employeeEmail, startTime, endTime, date] = rows[i];
      
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
      const hours = parseSheetDuration(startTime, endTime);

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
        integration.id,
        new Date(startTime).toISOString(),
        new Date(endTime).toISOString(),
        hours
      ]);
    }

    logger.info(`Successfully refreshed Google Sheets data for integration ${integration.id}`);
  } catch (error) {
    logger.error('Error refreshing Google Sheets data:', error);
    throw new Error(`Failed to refresh Google Sheets data: ${error.message}`);
  }
};

module.exports = {
  refreshGoogleSheetsData
};