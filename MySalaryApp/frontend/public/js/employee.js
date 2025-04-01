// Check authentication and redirect if not logged in
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token || user.role !== 'employee') {
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
    switchTab('profile'); // Show profile tab by default
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
        // Load profile data
        const profileResponse = await fetch('http://localhost:8000/api/employees/profile', { headers });
        const profileData = await profileResponse.json();
        updateProfile(profileData.data.employee);

        // Load salary summary
        const salaryResponse = await fetch('http://localhost:8000/api/salary/summary', { headers });
        const salaryData = await salaryResponse.json();
        updateSalaryStats(salaryData.data.salaries[0]); // First item is current employee's data

        // Load initial work history
        await loadWorkHistory();

        // Load salary history
        await loadSalaryHistory();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load dashboard data');
    }
}

// Update profile form
function updateProfile(employee) {
    document.getElementById('profile-name').value = employee.name;
    document.getElementById('profile-email').value = employee.email;
    document.getElementById('profile-position').value = employee.position;
    document.getElementById('profile-bank-account').value = employee.bank_account;
    document.getElementById('profile-bank-name').value = employee.bank_name;
    
    // Update stats
    document.getElementById('hourly-rate').textContent = `${employee.hourly_wage} CZK/hr`;
}

// Update salary statistics
function updateSalaryStats(salary) {
    if (salary) {
        document.getElementById('monthly-hours').textContent = `${salary.total_hours || 0} hrs`;
        document.getElementById('expected-salary').textContent = `${salary.total_salary || 0} CZK`;
    }
}

// Load work history
async function loadWorkHistory() {
    const startDate = document.getElementById('work-history-start-date').value || new Date().toISOString().split('T')[0];
    const endDate = document.getElementById('work-history-end-date').value || new Date().toISOString().split('T')[0];

    try {
        const response = await fetch(
            `http://localhost:8000/api/employees/work-history?startDate=${startDate}&endDate=${endDate}`,
            { headers }
        );
        const data = await response.json();
        
        const tbody = document.getElementById('work-history-table-body');
        tbody.innerHTML = '';

        data.data.workHistory.forEach(record => {
            const row = document.createElement('tr');
            const startTime = new Date(record.start_time);
            const endTime = new Date(record.end_time);
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${startTime.toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${startTime.toLocaleTimeString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${endTime.toLocaleTimeString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${record.hours}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${record.integration_name}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading work history:', error);
        alert('Failed to load work history');
    }
}

// Load salary history
async function loadSalaryHistory() {
    try {
        const response = await fetch('http://localhost:8000/api/salary/history', { headers });
        const data = await response.json();
        
        const tbody = document.getElementById('salary-history-table-body');
        tbody.innerHTML = '';

        data.data.history.forEach(payment => {
            const row = document.createElement('tr');
            const paymentDate = new Date(payment.payment_date);
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${paymentDate.toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${payment.total_hours}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${payment.amount} CZK
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }">
                        ${payment.status}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading salary history:', error);
        alert('Failed to load salary history');
    }
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

// Profile form submission
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const profileData = {
        bank_account: document.getElementById('profile-bank-account').value,
        bank_name: document.getElementById('profile-bank-name').value
    };
    
    try {
        const response = await fetch('http://localhost:8000/api/employees/profile', {
            method: 'PUT',
            headers,
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) throw new Error('Failed to update profile');
        
        alert('Profile updated successfully');
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile');
    }
});

// Password change functionality
function showChangePasswordModal() {
    document.getElementById('change-password-modal').classList.remove('hidden');
}

function hideChangePasswordModal() {
    document.getElementById('change-password-modal').classList.add('hidden');
}

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8000/api/auth/change-password', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                currentPassword: formData.get('currentPassword'),
                newPassword: newPassword
            })
        });
        
        if (!response.ok) throw new Error('Failed to change password');
        
        hideChangePasswordModal();
        e.target.reset();
        alert('Password changed successfully');
        
        // Update token if new one is returned
        const data = await response.json();
        if (data.token) {
            localStorage.setItem('token', data.token);
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('Failed to change password');
    }
});

// Initialize date inputs with current month
const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

document.getElementById('work-history-start-date').value = firstDay;
document.getElementById('work-history-end-date').value = lastDay;