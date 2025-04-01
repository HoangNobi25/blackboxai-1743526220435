const axios = require('axios');
const logger = require('../utils/logger');

const API_URL = 'http://localhost:8000/api';
let authToken = '';

// Test user credentials
const manager = {
    email: 'admin@example.com',
    password: 'admin123'
};

const testEmployee = {
    name: 'Test Employee',
    email: 'test@example.com',
    password: 'test123',
    hourly_wage: 150,
    position: 'Tester',
    bank_account: '1234567890',
    bank_name: 'Test Bank'
};

const testIntegration = {
    type: 'google_sheets',
    name: 'Test Sheet',
    token: JSON.stringify({
        "type": "service_account",
        "project_id": "test-project",
        "private_key": "test-key",
        "client_email": "test@test-project.iam.gserviceaccount.com"
    }),
    details: JSON.stringify({
        "spreadsheetId": "test-sheet-id"
    })
};

// Helper function for API calls
async function apiCall(method, endpoint, data = null, auth = true) {
    try {
        const headers = auth ? { Authorization: `Bearer ${authToken}` } : {};
        const response = await axios({
            method,
            url: `${API_URL}${endpoint}`,
            data,
            headers
        });
        return response.data;
    } catch (error) {
        throw new Error(`API call failed: ${error.response?.data?.message || error.message}`);
    }
}

// Test functions
async function testAuthentication() {
    logger.info('Testing authentication...');
    
    try {
        const response = await apiCall('post', '/auth/login', manager, false);
        authToken = response.token;
        logger.info('✓ Authentication successful');
        return true;
    } catch (error) {
        logger.error('✗ Authentication failed:', error.message);
        return false;
    }
}

async function testEmployeeManagement() {
    logger.info('Testing employee management...');
    
    try {
        // Create employee
        const createResponse = await apiCall('post', '/employees', testEmployee);
        const employeeId = createResponse.data.id;
        logger.info('✓ Employee creation successful');

        // Get employee
        const getResponse = await apiCall('get', `/employees/${employeeId}`);
        logger.info('✓ Employee retrieval successful');

        // Update employee
        const updateResponse = await apiCall('put', `/employees/${employeeId}`, {
            hourly_wage: 160
        });
        logger.info('✓ Employee update successful');

        // Delete employee
        await apiCall('delete', `/employees/${employeeId}`);
        logger.info('✓ Employee deletion successful');

        return true;
    } catch (error) {
        logger.error('✗ Employee management failed:', error.message);
        return false;
    }
}

async function testIntegrationManagement() {
    logger.info('Testing integration management...');
    
    try {
        // Create integration
        const createResponse = await apiCall('post', '/integrations', testIntegration);
        const integrationId = createResponse.data.id;
        logger.info('✓ Integration creation successful');

        // Get integration
        const getResponse = await apiCall('get', `/integrations/${integrationId}`);
        logger.info('✓ Integration retrieval successful');

        // Update integration
        const updateResponse = await apiCall('put', `/integrations/${integrationId}`, {
            name: 'Updated Test Sheet'
        });
        logger.info('✓ Integration update successful');

        // Refresh integration
        await apiCall('post', `/integrations/${integrationId}/refresh`);
        logger.info('✓ Integration refresh successful');

        // Delete integration
        await apiCall('delete', `/integrations/${integrationId}`);
        logger.info('✓ Integration deletion successful');

        return true;
    } catch (error) {
        logger.error('✗ Integration management failed:', error.message);
        return false;
    }
}

async function testReportGeneration() {
    logger.info('Testing report generation...');
    
    try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        
        // Get work time report
        await apiCall('get', `/reports/worktime?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`);
        logger.info('✓ Work time report generation successful');

        // Get integration report
        await apiCall('get', '/reports/integration');
        logger.info('✓ Integration report generation successful');

        // Export report
        await apiCall('get', `/reports/export?type=worktime&startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`);
        logger.info('✓ Report export successful');

        return true;
    } catch (error) {
        logger.error('✗ Report generation failed:', error.message);
        return false;
    }
}

async function testSalaryCalculation() {
    logger.info('Testing salary calculation...');
    
    try {
        // Get salary summary
        await apiCall('get', '/salary/summary');
        logger.info('✓ Salary summary retrieval successful');

        // Get salary history
        await apiCall('get', '/salary/history');
        logger.info('✓ Salary history retrieval successful');

        // Trigger salary processing
        await apiCall('post', '/salary/process');
        logger.info('✓ Salary processing successful');

        return true;
    } catch (error) {
        logger.error('✗ Salary calculation failed:', error.message);
        return false;
    }
}

// Main test runner
async function runTests() {
    logger.info('Starting core functionality tests...');
    
    const results = {
        authentication: false,
        employeeManagement: false,
        integrationManagement: false,
        reportGeneration: false,
        salaryCalculation: false
    };

    try {
        // Run tests sequentially
        results.authentication = await testAuthentication();
        if (results.authentication) {
            results.employeeManagement = await testEmployeeManagement();
            results.integrationManagement = await testIntegrationManagement();
            results.reportGeneration = await testReportGeneration();
            results.salaryCalculation = await testSalaryCalculation();
        }

        // Print summary
        logger.info('\nTest Summary:');
        Object.entries(results).forEach(([test, passed]) => {
            logger.info(`${test}: ${passed ? '✓ Passed' : '✗ Failed'}`);
        });

        const passedTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        logger.info(`\nPassed ${passedTests} out of ${totalTests} tests`);

        process.exit(passedTests === totalTests ? 0 : 1);
    } catch (error) {
        logger.error('Test execution failed:', error);
        process.exit(1);
    }
}

// Run tests if executed directly
if (require.main === module) {
    runTests();
}

module.exports = { runTests };