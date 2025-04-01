const { query } = require('../config/database');
const { APIError, catchAsync } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// Helper function to validate date range
const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new APIError('Invalid date format. Please use YYYY-MM-DD format.', 400);
  }
  
  if (start > end) {
    throw new APIError('Start date must be before end date', 400);
  }
  
  return { start, end };
};

// Get work time report
const getWorkTimeReport = catchAsync(async (req, res) => {
  const { startDate, endDate, employeeId, integrationType } = req.query;
  
  // Validate date range
  validateDateRange(startDate, endDate);
  
  let sql = `
    SELECT 
      e.id as employee_id,
      e.name as employee_name,
      e.position,
      i.type as integration_type,
      i.name as integration_name,
      w.start_time,
      w.end_time,
      w.hours,
      w.created_at
    FROM WORKTIME w
    JOIN EMPLOYEE e ON w.employee_id = e.id
    JOIN INTEGRATION i ON w.integration_id = i.id
    WHERE w.start_time >= ? 
    AND w.end_time <= ?
  `;
  
  const params = [startDate, endDate];

  // Add filters if provided
  if (employeeId) {
    sql += ' AND e.id = ?';
    params.push(employeeId);
  }
  
  if (integrationType) {
    sql += ' AND i.type = ?';
    params.push(integrationType);
  }

  // For employees, only show their own data
  if (req.user.role === 'employee') {
    sql += ' AND e.id = ?';
    params.push(req.user.employee_id);
  }

  sql += ' ORDER BY w.start_time DESC';

  const workTimeRecords = await query(sql, params);

  // Calculate summaries
  const summary = workTimeRecords.reduce((acc, record) => {
    const key = record.employee_id;
    if (!acc[key]) {
      acc[key] = {
        employee_id: record.employee_id,
        employee_name: record.employee_name,
        position: record.position,
        total_hours: 0,
        integration_breakdown: {}
      };
    }
    
    acc[key].total_hours += record.hours;
    
    // Track hours by integration type
    const intKey = record.integration_type;
    if (!acc[key].integration_breakdown[intKey]) {
      acc[key].integration_breakdown[intKey] = 0;
    }
    acc[key].integration_breakdown[intKey] += record.hours;
    
    return acc;
  }, {});

  res.status(200).json({
    status: 'success',
    data: {
      details: workTimeRecords,
      summary: Object.values(summary)
    }
  });
});

// Get integration usage report
const getIntegrationReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  // Validate date range
  validateDateRange(startDate, endDate);

  const sql = `
    SELECT 
      i.id as integration_id,
      i.type,
      i.name,
      COUNT(DISTINCT w.employee_id) as total_employees,
      COUNT(*) as total_records,
      SUM(w.hours) as total_hours,
      MIN(w.start_time) as first_record,
      MAX(w.end_time) as last_record
    FROM INTEGRATION i
    LEFT JOIN WORKTIME w ON i.id = w.integration_id
    AND w.start_time >= ?
    AND w.end_time <= ?
    GROUP BY i.id
    ORDER BY i.type, i.name
  `;

  const integrationStats = await query(sql, [startDate, endDate]);

  res.status(200).json({
    status: 'success',
    data: {
      integrations: integrationStats
    }
  });
});

// Get employee activity report
const getEmployeeActivityReport = catchAsync(async (req, res) => {
  const { startDate, endDate, employeeId } = req.query;
  
  // Validate date range
  validateDateRange(startDate, endDate);

  let sql = `
    SELECT 
      e.id as employee_id,
      e.name as employee_name,
      e.position,
      DATE(w.start_time) as work_date,
      SUM(w.hours) as total_hours,
      COUNT(DISTINCT i.id) as integration_count,
      GROUP_CONCAT(DISTINCT i.type) as integration_types
    FROM EMPLOYEE e
    LEFT JOIN WORKTIME w ON e.id = w.employee_id
    LEFT JOIN INTEGRATION i ON w.integration_id = i.id
    WHERE w.start_time >= ?
    AND w.end_time <= ?
  `;
  
  const params = [startDate, endDate];

  // Add employee filter if specified or if employee is requesting
  if (req.user.role === 'employee') {
    sql += ' AND e.id = ?';
    params.push(req.user.employee_id);
  } else if (employeeId) {
    sql += ' AND e.id = ?';
    params.push(employeeId);
  }

  sql += ' GROUP BY e.id, DATE(w.start_time) ORDER BY e.name, work_date';

  const activityRecords = await query(sql, params);

  // Calculate employee summaries
  const summary = activityRecords.reduce((acc, record) => {
    const key = record.employee_id;
    if (!acc[key]) {
      acc[key] = {
        employee_id: record.employee_id,
        employee_name: record.employee_name,
        position: record.position,
        total_days: 0,
        total_hours: 0,
        avg_hours_per_day: 0
      };
    }
    
    acc[key].total_days++;
    acc[key].total_hours += record.total_hours;
    acc[key].avg_hours_per_day = acc[key].total_hours / acc[key].total_days;
    
    return acc;
  }, {});

  res.status(200).json({
    status: 'success',
    data: {
      details: activityRecords,
      summary: Object.values(summary)
    }
  });
});

// Export report data (CSV format)
const exportReport = catchAsync(async (req, res) => {
  const { type, startDate, endDate, employeeId } = req.query;
  
  // Validate date range
  validateDateRange(startDate, endDate);

  let data;
  let filename;

  switch (type) {
    case 'worktime':
      data = await getWorkTimeReport(req, { send: false });
      filename = 'worktime_report.csv';
      break;
    case 'integration':
      data = await getIntegrationReport(req, { send: false });
      filename = 'integration_report.csv';
      break;
    case 'activity':
      data = await getEmployeeActivityReport(req, { send: false });
      filename = 'activity_report.csv';
      break;
    default:
      throw new APIError('Invalid report type', 400);
  }

  // Convert data to CSV format
  const csvData = convertToCSV(data);

  // Set response headers for CSV download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  res.status(200).send(csvData);
});

// Helper function to convert data to CSV format
const convertToCSV = (data) => {
  if (!data || !data.length) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => 
        JSON.stringify(row[header] || '')
      ).join(',')
    )
  ];

  return csvRows.join('\n');
};

module.exports = {
  getWorkTimeReport,
  getIntegrationReport,
  getEmployeeActivityReport,
  exportReport
};