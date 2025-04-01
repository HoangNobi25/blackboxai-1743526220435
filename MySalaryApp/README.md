# Salary Calculation Application

A comprehensive application for calculating employee salaries based on Google Sheets and website usage tracking.

## Features

- User Authentication (Employee and Manager roles)
- Employee Management
- Integration with Google Sheets and Website Usage Tracking
- Automated Work Time Tracking
- Salary Calculation and Reports
- Automated Data Refresh (Every 15 minutes)
- Monthly Salary Processing (7th of each month)

## Project Structure

```
MySalaryApp/
├── backend/           # Backend API server
│   ├── app.js        # Main application file
│   ├── config/       # Configuration files
│   ├── controllers/  # Route controllers
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   ├── services/     # Business logic services
│   └── utils/        # Utility functions
└── frontend/         # Frontend application
    ├── public/       # Static files
    │   ├── index.html
    │   ├── manager-dashboard.html
    │   ├── employee-dashboard.html
    │   └── js/
    └── server.js     # Frontend server
```

## Prerequisites

- Node.js (v14 or higher)
- SQLite3
- Google Cloud Platform account (for Google Sheets integration)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MySalaryApp
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

## Configuration

1. Backend Configuration:
   - Create a Google Cloud Project and enable Google Sheets API
   - Set up environment variables (if needed)
   - The SQLite database will be automatically created in `backend/data/salary.db`

2. Frontend Configuration:
   - The frontend is configured to connect to the backend at `http://localhost:8000`
   - Update the API URL in the JavaScript files if needed

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```
The backend API will be available at `http://localhost:8000`

2. Start the frontend server (in a new terminal):
```bash
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:8000`

## Usage

1. Access the application at `http://localhost:8000`

2. Login credentials:
   - Manager: Create the first manager account using the API
   - Employees: Created by managers through the dashboard

3. Manager Features:
   - Add/remove employees
   - Manage integrations (Google Sheets, website tracking)
   - View work history and generate reports
   - Process salary payments

4. Employee Features:
   - View work hours and salary information
   - Update personal information
   - View work history
   - Change password

## API Documentation

See [API Endpoints](#api-endpoints) section below for detailed API documentation.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/change-password` - Change user password (protected)

### Employee Management (Manager Only)
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create new employee
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/employees/:id/work-history` - Get employee work history

### Employee Self-Service
- `GET /api/employees/profile` - Get own profile
- `PUT /api/employees/profile` - Update own profile
- `GET /api/employees/work-history` - Get own work history

### Integration Management (Manager Only)
- `GET /api/integrations` - List all integrations
- `POST /api/integrations` - Add new integration
- `GET /api/integrations/:id` - Get integration details
- `PUT /api/integrations/:id` - Update integration
- `DELETE /api/integrations/:id` - Delete integration
- `POST /api/integrations/:id/refresh` - Manually refresh integration data

### Reports
- `GET /api/reports/worktime` - Get work time report
- `GET /api/reports/integration` - Get integration usage report (Manager Only)
- `GET /api/reports/activity` - Get employee activity report
- `GET /api/reports/export` - Export report data (Manager Only)

### Salary
- `GET /api/salary/summary` - Get salary summary
- `GET /api/salary/history` - Get salary payment history
- `GET /api/salary/report` - Get detailed salary report (Manager Only)
- `POST /api/salary/process` - Trigger salary processing (Manager Only)

## Development

### Backend Development
- Built with Node.js and Express
- Uses SQLite for data storage
- JWT authentication
- Automated tasks with node-cron
- Google Sheets API integration

### Frontend Development
- Pure HTML, JavaScript, and Tailwind CSS
- Responsive design
- Role-based access control
- Real-time data updates

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Secure storage of integration credentials
- Input validation and sanitization
- Protected API endpoints

## Automated Tasks

- Data refresh every 15 minutes
- Salary calculation and processing on the 7th of each month
- Automatic integration status updates

## Error Handling

- Centralized error handling
- Detailed error logging
- User-friendly error messages
- Validation for all inputs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.