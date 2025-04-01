const { query, queryOne, run } = require('../config/database');
const { APIError, catchAsync } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { processMonthlySalaries } = require('../services/scheduler');

// Get salary summary for employee(s)
const getSalarySummary = catchAsync(async (req, res) => {
  let sql, params = [];
  
  // If employee is requesting, only show their data
  if (req.user.role === 'employee') {
    sql = `
      SELECT 
        e.id as employee_id,
        e.name,
        e.hourly_wage,
        SUM(w.hours) as total_hours,
        ROUND(SUM(w.hours) * e.hourly_wage, 2) as total_salary,
        MIN(w.start_time) as period_start,
        MAX(w.end_time) as period_end
      FROM EMPLOYEE e
      LEFT JOIN WORKTIME w ON e.id = w.employee_id
      WHERE e.id = ?
      AND w.created_at >= date('now', 'start of month')
      GROUP BY e.id
    `;
    params = [req.user.employee_id];
  } else {
    // For managers, show all employees
    sql = `
      SELECT 
        e.id as employee_id,
        e.name,
        e.hourly_wage,
        SUM(w.hours) as total_hours,
        ROUND(SUM(w.hours) * e.hourly_wage, 2) as total_salary,
        MIN(w.start_time) as period_start,
        MAX(w.end_time) as period_end
      FROM EMPLOYEE e
      LEFT JOIN WORKTIME w ON e.id = w.employee_id
      WHERE w.created_at >= date('now', 'start of month')
      GROUP BY e.id
    `;
  }

  const salaries = await query(sql, params);

  res.status(200).json({
    status: 'success',
    data: {
      salaries
    }
  });
});

// Get salary history
const getSalaryHistory = catchAsync(async (req, res) => {
  let sql, params = [];
  
  // If employee is requesting, only show their data
  if (req.user.role === 'employee') {
    sql = `
      SELECT 
        sp.*,
        e.name,
        e.hourly_wage
      FROM SALARY_PAYMENT sp
      JOIN EMPLOYEE e ON sp.employee_id = e.id
      WHERE e.id = ?
      ORDER BY sp.payment_date DESC
    `;
    params = [req.user.employee_id];
  } else {
    // For managers, show all employees or filter by employee_id if provided
    sql = `
      SELECT 
        sp.*,
        e.name,
        e.hourly_wage
      FROM SALARY_PAYMENT sp
      JOIN EMPLOYEE e ON sp.employee_id = e.id
      ${req.query.employee_id ? 'WHERE e.id = ?' : ''}
      ORDER BY sp.payment_date DESC
    `;
    if (req.query.employee_id) {
      params = [req.query.employee_id];
    }
  }

  const history = await query(sql, params);

  res.status(200).json({
    status: 'success',
    data: {
      history
    }
  });
});

// Get detailed salary report for a specific period
const getSalaryReport = catchAsync(async (req, res) => {
  const { startDate, endDate, employeeId } = req.query;
  
  // Validate date range
  if (!startDate || !endDate) {
    throw new APIError('Please provide start and end dates', 400);
  }

  let sql, params = [startDate, endDate];
  
  // Base query
  sql = `
    SELECT 
      e.id as employee_id,
      e.name,
      e.hourly_wage,
      e.position,
      w.start_time,
      w.end_time,
      w.hours,
      i.type as source_type,
      i.name as source_name,
      ROUND(w.hours * e.hourly_wage, 2) as amount
    FROM EMPLOYEE e
    JOIN WORKTIME w ON e.id = w.employee_id
    JOIN INTEGRATION i ON w.integration_id = i.id
    WHERE w.start_time >= ?
    AND w.end_time <= ?
  `;

  // Add employee filter if specified or if employee is requesting
  if (req.user.role === 'employee') {
    sql += ' AND e.id = ?';
    params.push(req.user.employee_id);
  } else if (employeeId) {
    sql += ' AND e.id = ?';
    params.push(employeeId);
  }

  sql += ' ORDER BY e.name, w.start_time';

  const report = await query(sql, params);

  // Calculate summaries
  const summary = report.reduce((acc, curr) => {
    const key = curr.employee_id;
    if (!acc[key]) {
      acc[key] = {
        employee_id: curr.employee_id,
        name: curr.name,
        position: curr.position,
        total_hours: 0,
        total_amount: 0
      };
    }
    acc[key].total_hours += curr.hours;
    acc[key].total_amount += curr.amount;
    return acc;
  }, {});

  res.status(200).json({
    status: 'success',
    data: {
      details: report,
      summary: Object.values(summary)
    }
  });
});

// Trigger manual salary processing (manager only)
const triggerSalaryProcessing = catchAsync(async (req, res) => {
  await processMonthlySalaries();

  res.status(200).json({
    status: 'success',
    message: 'Salary processing triggered successfully'
  });
});

module.exports = {
  getSalarySummary,
  getSalaryHistory,
  getSalaryReport,
  triggerSalaryProcessing
};