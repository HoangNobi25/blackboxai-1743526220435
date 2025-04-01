const bcrypt = require('bcryptjs');
const { query, queryOne, run } = require('../config/database');
const { APIError, catchAsync } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// Get all employees (manager only)
const getAllEmployees = catchAsync(async (req, res) => {
  const employees = await query(`
    SELECT 
      e.*,
      u.email,
      u.role,
      (
        SELECT SUM(w.hours)
        FROM WORKTIME w
        WHERE w.employee_id = e.id
        AND w.created_at >= date('now', 'start of month')
      ) as monthly_hours
    FROM EMPLOYEE e
    JOIN USER u ON e.user_id = u.id
  `);

  res.status(200).json({
    status: 'success',
    data: {
      employees
    }
  });
});

// Get employee profile (for both employee and manager)
const getEmployeeProfile = catchAsync(async (req, res) => {
  const employeeId = req.params.id || req.user.employee_id;

  // Check if employee exists and user has permission
  if (req.user.role === 'employee' && req.user.employee_id !== Number(employeeId)) {
    throw new APIError('You do not have permission to view this profile', 403);
  }

  const employee = await queryOne(`
    SELECT 
      e.*,
      u.email,
      u.role,
      (
        SELECT SUM(w.hours)
        FROM WORKTIME w
        WHERE w.employee_id = e.id
        AND w.created_at >= date('now', 'start of month')
      ) as monthly_hours
    FROM EMPLOYEE e
    JOIN USER u ON e.user_id = u.id
    WHERE e.id = ?
  `, [employeeId]);

  if (!employee) {
    throw new APIError('Employee not found', 404);
  }

  res.status(200).json({
    status: 'success',
    data: {
      employee
    }
  });
});

// Create new employee (manager only)
const createEmployee = catchAsync(async (req, res) => {
  const {
    name,
    email,
    password,
    hourly_wage,
    position,
    bank_account,
    bank_name
  } = req.body;

  // Validate required fields
  if (!name || !email || !password || !hourly_wage || !position || !bank_account || !bank_name) {
    throw new APIError('Please provide all required fields', 400);
  }

  // Check if email already exists
  const existingUser = await queryOne('SELECT id FROM USER WHERE email = ?', [email]);
  if (existingUser) {
    throw new APIError('Email already in use', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user and employee in transaction
  const db = require('../config/database').db;
  
  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Create user
      db.run(
        'INSERT INTO USER (email, password, role) VALUES (?, ?, ?)',
        [email, hashedPassword, 'employee'],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          const userId = this.lastID;

          // Create employee
          db.run(
            `INSERT INTO EMPLOYEE (
              user_id, name, hourly_wage, position, bank_account, bank_name
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, name, hourly_wage, position, bank_account, bank_name],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              db.run('COMMIT');
              resolve();
            }
          );
        }
      );
    });
  });

  res.status(201).json({
    status: 'success',
    message: 'Employee created successfully'
  });
});

// Update employee (manager or self)
const updateEmployee = catchAsync(async (req, res) => {
  const employeeId = req.params.id || req.user.employee_id;
  
  // Check permissions
  if (req.user.role === 'employee' && req.user.employee_id !== Number(employeeId)) {
    throw new APIError('You do not have permission to update this profile', 403);
  }

  const {
    name,
    hourly_wage,
    position,
    bank_account,
    bank_name
  } = req.body;

  // Build update query dynamically
  const updates = [];
  const values = [];

  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (hourly_wage && req.user.role === 'manager') { // Only manager can update wage
    updates.push('hourly_wage = ?');
    values.push(hourly_wage);
  }
  if (position && req.user.role === 'manager') { // Only manager can update position
    updates.push('position = ?');
    values.push(position);
  }
  if (bank_account) {
    updates.push('bank_account = ?');
    values.push(bank_account);
  }
  if (bank_name) {
    updates.push('bank_name = ?');
    values.push(bank_name);
  }

  if (updates.length === 0) {
    throw new APIError('No valid fields to update', 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(employeeId);

  await run(
    `UPDATE EMPLOYEE SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  res.status(200).json({
    status: 'success',
    message: 'Employee updated successfully'
  });
});

// Delete employee (manager only)
const deleteEmployee = catchAsync(async (req, res) => {
  const employeeId = req.params.id;

  // Check if employee exists
  const employee = await queryOne('SELECT user_id FROM EMPLOYEE WHERE id = ?', [employeeId]);
  if (!employee) {
    throw new APIError('Employee not found', 404);
  }

  // Delete employee and associated user in transaction
  const db = require('../config/database').db;
  
  await new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Delete employee
      db.run('DELETE FROM EMPLOYEE WHERE id = ?', [employeeId], (err) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
          return;
        }

        // Delete associated user
        db.run('DELETE FROM USER WHERE id = ?', [employee.user_id], (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          db.run('COMMIT');
          resolve();
        });
      });
    });
  });

  res.status(200).json({
    status: 'success',
    message: 'Employee deleted successfully'
  });
});

// Get employee work history
const getWorkHistory = catchAsync(async (req, res) => {
  const employeeId = req.params.id || req.user.employee_id;
  
  // Check permissions
  if (req.user.role === 'employee' && req.user.employee_id !== Number(employeeId)) {
    throw new APIError('You do not have permission to view this work history', 403);
  }

  const workHistory = await query(`
    SELECT 
      w.*,
      i.type as integration_type,
      i.name as integration_name
    FROM WORKTIME w
    JOIN INTEGRATION i ON w.integration_id = i.id
    WHERE w.employee_id = ?
    ORDER BY w.start_time DESC
  `, [employeeId]);

  res.status(200).json({
    status: 'success',
    data: {
      workHistory
    }
  });
});

module.exports = {
  getAllEmployees,
  getEmployeeProfile,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getWorkHistory
};