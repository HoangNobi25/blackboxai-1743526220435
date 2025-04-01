# Quick Start Guide

This guide will help you get the Salary Calculation Application up and running quickly.

## Prerequisites

- Node.js (v14 or higher)
- npm (usually comes with Node.js)
- A web browser (Chrome, Firefox, Safari, or Edge)

## Quick Start

### Using Start Scripts (Recommended)

**For Linux/Mac users:**
```bash
# Make the script executable (first time only)
chmod +x start.sh

# Start both servers
./start.sh
```

**For Windows users:**
```bash
# Double-click start.bat
# Or run from command prompt:
start.bat
```

The start scripts will:
- Check if required ports are available
- Create necessary directories
- Install dependencies if needed
- Start both backend and frontend servers
- Initialize the database (if not already done)

### Manual Installation

If you prefer to start the servers manually:

1. **Install Dependencies**

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. **Initialize Database and Create Manager Account**

```bash
# In the backend directory
npm run init
```

This will create a manager account with the following credentials:
- Email: admin@example.com
- Password: admin123

⚠️ **Important**: Change these credentials after your first login!

3. **Start the Servers Manually**

In the backend directory:
```bash
npm run dev
```

In a new terminal, in the frontend directory:
```bash
npm run dev
```

## Accessing the Application

Open your web browser and navigate to:
```
http://localhost:8000
```

## First Time Setup

After logging in as a manager, you should:

1. Change your password immediately
2. Set up integrations:
   - Configure Google Sheets integration
   - Set up website tracking
3. Add employees to the system
4. Monitor the dashboard for data collection

## Running Tests

To verify the system is working correctly:

```bash
# In the backend directory
npm run test
```

Or to initialize the database and run tests:
```bash
npm run test:init
```

## Integration Setup

### Google Sheets Integration

1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create service account credentials
4. Share your timesheet with the service account email
5. Add the integration through the manager dashboard

### Website Usage Tracking

1. Configure the tracking endpoint
2. Generate an API token
3. Add the integration through the manager dashboard

## Common Operations

### For Managers

- Add/remove employees
- Configure integrations
- View work history
- Generate reports
- Process salary payments

### For Employees

- View work hours
- Check salary information
- Update personal details
- Change password

## Troubleshooting

1. **Cannot connect to server**
   - Check if both backend and frontend servers are running
   - Verify the ports (8000) are not in use
   - Try stopping and restarting the servers using the start script

2. **Login issues**
   - Verify the correct email and password
   - Check if the database was initialized properly
   - Try running `npm run init` in the backend directory

3. **Integration problems**
   - Verify API credentials
   - Check integration logs in the manager dashboard
   - Ensure proper permissions are set

4. **Start script issues**
   - Make sure Node.js is installed and in your PATH
   - Check if you have write permissions in the directories
   - Try running the servers manually to see detailed error messages

## Support

If you encounter any issues:
1. Check the server logs
2. Verify your configuration
3. Ensure all dependencies are installed
4. Check the database file exists

## Security Notes

- Change the default manager password immediately
- Use strong passwords
- Keep API credentials secure
- Regularly monitor access logs
- Update dependencies regularly

## Next Steps

After getting the basic setup running:

1. Customize the application settings
2. Set up regular backups
3. Configure email notifications (if needed)
4. Train employees on using the system
5. Establish regular monitoring procedures

For more detailed information, refer to the main [README.md](./README.md) file.