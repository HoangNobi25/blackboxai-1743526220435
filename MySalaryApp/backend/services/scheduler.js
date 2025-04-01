const cron = require('node-cron');
const { query, run } = require('../config/database');
const logger = require('../utils/logger');
const { refreshGoogleSheetsData } = require('./googleSheetsService');
const { refreshWebsiteData } = require('./websiteUsageService');

// Refresh data from all integrations
const refreshAllIntegrations = async () => {
  try {
    logger.info('Starting scheduled data refresh for all integrations');

    // Get all active integrations
    const integrations = await query('SELECT * FROM INTEGRATION');

    for (const integration of integrations) {
      try {
        if (integration.type === 'google_sheets') {
          await refreshGoogleSheetsData(integration);
        } else if (integration.type === 'website') {
          await refreshWebsiteData(integration);
        }
        logger.info(`Successfully refreshed data for integration ${integration.id} (${integration.name})`);
      } catch (error) {
        logger.error(`Failed to refresh integration ${integration.id} (${integration.name}):`, error);
        // Continue with next integration even if one fails
      }
    }

    logger.info('Completed scheduled data refresh for all integrations');
  } catch (error) {
    logger.error('Error in refreshAllIntegrations:', error);
  }
};

// Calculate and process monthly salaries
const processMonthlySalaries = async () => {
  try {
    logger.info('Starting monthly salary calculations');

    const db = require('../config/database').db;
    
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Calculate total hours and salary for each employee
        db.all(`
          SELECT 
            e.id as employee_id,
            e.name,
            e.hourly_wage,
            e.bank_account,
            e.bank_name,
            SUM(w.hours) as total_hours,
            ROUND(SUM(w.hours) * e.hourly_wage, 2) as total_salary
          FROM EMPLOYEE e
          LEFT JOIN WORKTIME w ON e.id = w.employee_id
          WHERE w.created_at >= date('now', 'start of month')
          AND w.created_at < date('now', 'start of month', '+1 month')
          GROUP BY e.id
        `, [], async (err, salaries) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          try {
            // Process each salary payment
            for (const salary of salaries) {
              // Here you would integrate with a payment processing service
              // For now, we'll just log the payment details
              logger.info('Processing salary payment:', {
                employeeId: salary.employee_id,
                name: salary.name,
                totalHours: salary.total_hours,
                salary: salary.total_salary,
                bankAccount: salary.bank_account,
                bankName: salary.bank_name
              });

              // Record the salary payment
              await run(`
                INSERT INTO SALARY_PAYMENT (
                  employee_id,
                  payment_date,
                  total_hours,
                  amount,
                  status
                ) VALUES (?, date('now'), ?, ?, 'processed')
              `, [
                salary.employee_id,
                salary.total_hours,
                salary.total_salary
              ]);
            }

            db.run('COMMIT');
            resolve();
          } catch (error) {
            db.run('ROLLBACK');
            reject(error);
          }
        });
      });
    });

    logger.info('Completed monthly salary calculations');
  } catch (error) {
    logger.error('Error in processMonthlySalaries:', error);
  }
};

// Initialize schedulers
const initializeSchedulers = () => {
  // Schedule data refresh every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running scheduled data refresh');
    await refreshAllIntegrations();
  });

  // Schedule salary processing on the 7th of each month
  cron.schedule('0 0 7 * *', async () => {
    logger.info('Running monthly salary processing');
    await processMonthlySalaries();
  });

  logger.info('Schedulers initialized successfully');
};

module.exports = {
  initializeSchedulers,
  refreshAllIntegrations,  // Exported for manual triggering
  processMonthlySalaries   // Exported for manual triggering
};