// Check authentication and redirect if not logged in
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'manager') {
    window.location.href = '/index.html';
}

// Set up headers for API requests
const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    document.getElementById('user-name').textContent = user.email;
    switchTab('employees'); // Show employees tab by default
});

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
});

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load employees
        const employeesResponse = await fetch('http://localhost:8000/api/employees', { headers });
        const employeesData = await employeesResponse.json();
        updateEmployeesTable(employeesData.data.employees);

        // Load integrations
        const integrationsResponse = await fetch('http://localhost:8000/api/integrations', { headers });
        const integrationsData = await integrationsResponse.json();
        updateIntegrationsTable(integrationsData.data.integrations);

        // Load summary data
        const summaryResponse = await fetch('http://localhost:8000/api/salary/summary', { headers });
        const summaryData = await summaryResponse.json();
        updateDashboardStats(summaryData.data);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load dashboard data');
    }
}

// Update dashboard statistics
function updateDashboardStats(data) {
    document.getElementById('total-employees').textContent = data.salaries.length;
    
    const totalHours = data.salaries.reduce((sum, salary) => sum + (salary.total_hours || 0), 0);
    document.getElementById('total-hours').textContent = totalHours.toFixed(2);
    
    const totalSalary = data.salaries.reduce((sum, salary) => sum + (salary.total_salary || 0), 0);
    document.getElementById('total-salary').textContent = `${totalSalary.toFixed(2)} CZK`;
}

// Update employees table
function updateEmployeesTable(employees) {
    const tbody = document.getElementById('employees-table-body');
    tbody.innerHTML = '';

    employees.forEach(employee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${employee.name}</div>
                <div class="text-sm text-gray-500">${employee.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.position}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.hourly_wage} CZK</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.monthly_hours || 0}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="viewEmployee(${employee.id})" class="text-blue-600 hover:text-blue-900 mr-2">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="editEmployee(${employee.id})" class="text-green-600 hover:text-green-900 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteEmployee(${employee.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update integrations table
function updateIntegrationsTable(integrations) {
    const tbody = document.getElementById('integrations-table-body');
    tbody.innerHTML = '';

    integrations.forEach(integration => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${integration.name}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${integration.type}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(integration.updated_at).toLocaleString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="refreshIntegration(${integration.id})" class="text-blue-600 hover:text-blue-900 mr-2">
                    <i class="fas fa-sync"></i>
                </button>
                <button onclick="editIntegration(${integration.id})" class="text-green-600 hover:text-green-900 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteIntegration(${integration.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Tab switching functionality
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Show selected tab content
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    // Update tab button styles
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Highlight selected tab button
    event.target.classList.remove('border-transparent', 'text-gray-500');
    event.target.classList.add('border-blue-500', 'text-blue-600');
}

// Modal functionality
function showAddEmployeeModal() {
    document.getElementById('add-employee-modal').classList.remove('hidden');
}

function hideAddEmployeeModal() {
    document.getElementById('add-employee-modal').classList.add('hidden');
}

function showAddIntegrationModal() {
    document.getElementById('add-integration-modal').classList.remove('hidden');
}

function hideAddIntegrationModal() {
    document.getElementById('add-integration-modal').classList.add('hidden');
}

// Form submissions
document.getElementById('add-employee-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const employeeData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('http://localhost:8000/api/employees', {
            method: 'POST',
            headers,
            body: JSON.stringify(employeeData)
        });
        
        if (!response.ok) throw new Error('Failed to add employee');
        
        hideAddEmployeeModal();
        loadDashboardData();
        e.target.reset();
    } catch (error) {
        console.error('Error adding employee:', error);
        alert('Failed to add employee');
    }
});

document.getElementById('add-integration-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const integrationData = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('http://localhost:8000/api/integrations', {
            method: 'POST',
            headers,
            body: JSON.stringify(integrationData)
        });
        
        if (!response.ok) throw new Error('Failed to add integration');
        
        hideAddIntegrationModal();
        loadDashboardData();
        e.target.reset();
    } catch (error) {
        console.error('Error adding integration:', error);
        alert('Failed to add integration');
    }
});

// CRUD operations
async function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    try {
        const response = await fetch(`http://localhost:8000/api/employees/${id}`, {
            method: 'DELETE',
            headers
        });
        
        if (!response.ok) throw new Error('Failed to delete employee');
        
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee');
    }
}

async function deleteIntegration(id) {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    
    try {
        const response = await fetch(`http://localhost:8000/api/integrations/${id}`, {
            method: 'DELETE',
            headers
        });
        
        if (!response.ok) throw new Error('Failed to delete integration');
        
        loadDashboardData();
    } catch (error) {
        console.error('Error deleting integration:', error);
        alert('Failed to delete integration');
    }
}

async function refreshIntegration(id) {
    try {
        const response = await fetch(`http://localhost:8000/api/integrations/${id}/refresh`, {
            method: 'POST',
            headers
        });
        
        if (!response.ok) throw new Error('Failed to refresh integration');
        
        loadDashboardData();
    } catch (error) {
        console.error('Error refreshing integration:', error);
        alert('Failed to refresh integration');
    }
}

// Report generation
async function generateReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:8000/api/reports/worktime?startDate=${startDate}&endDate=${endDate}`, {
            headers
        });
        
        const data = await response.json();
        
        // Display report
        document.getElementById('report-content').innerHTML = `
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Work Time Report</h3>
                    <p class="mt-1 max-w-2xl text-sm text-gray-500">
                        ${startDate} to ${endDate}
                    </p>
                </div>
                <div class="border-t border-gray-200">
                    <dl>
                        ${data.data.summary.map(summary => `
                            <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt class="text-sm font-medium text-gray-500">${summary.employee_name}</dt>
                                <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    ${summary.total_hours} hours
                                </dd>
                            </div>
                        `).join('')}
                    </dl>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report');
    }
}

async function exportReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }
    
    try {
        const response = await fetch(
            `http://localhost:8000/api/reports/export?type=worktime&startDate=${startDate}&endDate=${endDate}`,
            { headers }
        );
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'worktime_report.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        console.error('Error exporting report:', error);
        alert('Failed to export report');
    }
}

// Refresh all data
async function refreshData() {
    try {
        await loadDashboardData();
        alert('Data refreshed successfully');
    } catch (error) {
        console.error('Error refreshing data:', error);
        alert('Failed to refresh data');
    }
}