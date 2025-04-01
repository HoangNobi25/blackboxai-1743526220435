const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, run } = require('../config/database');
const { APIError, catchAsync } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// Login controller
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new APIError('Please provide email and password', 400);
  }

  // Find user by email
  const user = await queryOne(
    'SELECT u.*, e.id as employee_id FROM USER u LEFT JOIN EMPLOYEE e ON u.id = e.user_id WHERE u.email = ?',
    [email]
  );

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new APIError('Incorrect email or password', 401);
  }

  // Generate token
  const token = generateToken(user.id, user.role);

  // Remove password from response
  delete user.password;

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
});

// Middleware to protect routes
const protect = catchAsync(async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new APIError('You are not logged in. Please log in to get access.', 401);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user still exists
    const user = await queryOne(
      'SELECT u.*, e.id as employee_id FROM USER u LEFT JOIN EMPLOYEE e ON u.id = e.user_id WHERE u.id = ?',
      [decoded.id]
    );

    if (!user) {
      throw new APIError('The user belonging to this token no longer exists.', 401);
    }

    // Add user to request
    req.user = user;
    next();
  } catch (err) {
    throw new APIError('Invalid token. Please log in again.', 401);
  }
});

// Restrict to certain roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new APIError('You do not have permission to perform this action', 403);
    }
    next();
  };
};

// Change password
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Get current user
  const user = await queryOne('SELECT * FROM USER WHERE id = ?', [userId]);

  // Check current password
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new APIError('Your current password is incorrect', 401);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password
  await run(
    'UPDATE USER SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hashedPassword, userId]
  );

  // Generate new token
  const token = generateToken(userId, user.role);

  res.status(200).json({
    status: 'success',
    token,
    message: 'Password updated successfully'
  });
});

module.exports = {
  login,
  protect,
  restrictTo,
  changePassword
};