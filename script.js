import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, where, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Set Firebase debug log level
setLogLevel('debug');

// Global variables for Firebase
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error("Firebase initialization error:", error);
    document.getElementById('form-message').textContent = 'Error initializing Firebase. Check the console for details.';
    document.getElementById('form-message').className = 'mt-4 text-center text-red-500';
}

const form = document.getElementById('appointment-form');
const appointmentsList = document.getElementById('appointments-list');
const loadingMessage = document.getElementById('loading-message');
const formMessage = document.getElementById('form-message');
const userIdDisplay = document.getElementById('user-id');
const todayAlertContainer = document.getElementById('today-alert-container');

// Login form elements
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const emailError = document.getElementById('email-error');
const phoneError = document.getElementById('phone-error');
const passwordError = document.getElementById('password-error');

// Fixed admin credentials
const ADMIN_EMAIL = 'Ntuthukolwandisa@gmail.com';
const ADMIN_PASSWORD = 'Noluthando@1';

// Interface elements
const staffInterface = document.getElementById('staff-interface');
const clientInterface = document.getElementById('client-interface');
const adminInterface = document.getElementById('admin-interface');
const staffAppointmentsList = document.getElementById('staff-appointments-list');
const adminAppointmentsList = document.getElementById('admin-appointments-list');
const statusFilter = document.getElementById('status-filter');
const dateFilter = document.getElementById('date-filter');

let userId = null;
let userRole = null;
let currentUser = null;

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

function validatePassword(password) {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    const hasSymbolOrNumber = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?0-9]/.test(password);
    if (!hasSymbolOrNumber) {
        return { valid: false, message: 'Password must contain at least 1 symbol or number' };
    }
    
    return { valid: true, message: '' };
}

function clearLoginErrors() {
    emailError.classList.add('hidden');
    phoneError.classList.add('hidden');
    passwordError.classList.add('hidden');
    emailError.textContent = '';
    phoneError.textContent = '';
    passwordError.textContent = '';
}

function showLoginError(field, message) {
    const errorElement = document.getElementById(`${field}-error`);
    const inputElement = document.getElementById(`login-${field}`);
    
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    
    // Add error styling to input
    inputElement.classList.remove('success');
    inputElement.classList.add('error');
}

function clearFieldError(field) {
    const errorElement = document.getElementById(`${field}-error`);
    const inputElement = document.getElementById(`login-${field}`);
    
    errorElement.classList.add('hidden');
    errorElement.textContent = '';
    
    // Remove error styling from input
    inputElement.classList.remove('error');
}

// Determine user role based on email
function determineUserRole(email) {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return 'admin';
    }
    return 'client';
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    clearLoginErrors();
    
    const email = document.getElementById('login-email').value.trim();
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    
    let isValid = true;
    
    // Validate email
    if (!email) {
        showLoginError('email', 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showLoginError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate phone
    if (!phone) {
        showLoginError('phone', 'Phone number is required');
        isValid = false;
    } else if (!validatePhone(phone)) {
        showLoginError('phone', 'Phone number must be exactly 10 digits');
        isValid = false;
    }
    
    // Validate password
    if (!password) {
        showLoginError('password', 'Password is required');
        isValid = false;
    } else {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            showLoginError('password', passwordValidation.message);
            isValid = false;
        }
    }
    
    if (!isValid) {
        loginMessage.textContent = 'Please fix the errors above';
        loginMessage.className = 'mt-4 text-center text-red-500';
        return;
    }
    
    // Determine user role based on email
    const role = determineUserRole(email);
    
    // Validate admin credentials
    if (role === 'admin') {
        if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
            loginMessage.textContent = 'Invalid admin credentials';
            loginMessage.className = 'mt-4 text-center text-red-500';
            return;
        }
    }
    
    // Simulate user authentication and role assignment
    currentUser = {
        id: 'user_' + Date.now(),
        email: email,
        phone: phone,
        role: role,
        name: email.split('@')[0] // Simple name generation
    };
    
    userId = currentUser.id;
    userRole = currentUser.role;
    
    // If validation passes, show success message
    loginMessage.textContent = `Login successful! Welcome ${currentUser.name} (${role}).`;
    loginMessage.className = 'mt-4 text-center text-green-500';
    
    // Clear the form
    loginForm.reset();
    
    // Hide login form and show appropriate interface after successful login
    setTimeout(() => {
        document.getElementById('login-container').style.display = 'none';
        showUserInterface();
    }, 2000);
}

// Show appropriate interface based on user role
function showUserInterface() {
    // Show common elements
    document.getElementById('today-alert-container').classList.remove('hidden-section');
    document.querySelector('.mb-6.bg-gray-50').classList.remove('hidden-section');
    document.querySelector('.mt-8').classList.remove('hidden-section');
    
    // Update user ID display
    userIdDisplay.textContent = userId;
    
    if (userRole === 'client') {
        // Show client interface
        clientInterface.classList.remove('hidden-section');
        document.querySelector('.mb-8').classList.remove('hidden-section');
        listenForAppointments();
    } else if (userRole === 'staff') {
        // Show staff interface
        staffInterface.classList.remove('hidden-section');
        listenForAllAppointments();
    } else if (userRole === 'admin') {
        // Show admin interface
        adminInterface.classList.remove('hidden-section');
        listenForAllAppointments();
        updateAdminStats();
    }
}

// Add event listeners for real-time validation
document.getElementById('login-email').addEventListener('input', function() {
    const email = this.value.trim();
    if (email && !validateEmail(email)) {
        showLoginError('email', 'Please enter a valid email address');
    } else {
        clearFieldError('email');
    }
});

document.getElementById('login-phone').addEventListener('input', function() {
    const phone = this.value.trim();
    if (phone && !validatePhone(phone)) {
        showLoginError('phone', 'Phone number must be exactly 10 digits');
    } else {
        clearFieldError('phone');
    }
});

document.getElementById('login-password').addEventListener('input', function() {
    const password = this.value;
    if (password) {
        const validation = validatePassword(password);
        if (!validation.valid) {
            showLoginError('password', validation.message);
        } else {
            clearFieldError('password');
            this.classList.add('success');
        }
    } else {
        clearFieldError('password');
    }
});

// Listen for all appointments (staff/admin view)
function listenForAllAppointments() {
    const staffLoadingMessage = document.getElementById('staff-loading-message');
    if (staffLoadingMessage) {
        staffLoadingMessage.classList.add('hidden');
    }
    
    // Get appointments from localStorage
    const allAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    
    // Add some sample appointments if none exist
    if (allAppointments.length === 0) {
        const sampleAppointments = [
            {
                id: 'apt_1',
                clientId: 'client_1',
                patientName: 'John Doe',
                appointmentDate: '2024-01-15',
                appointmentTime: '10:00',
                consultationType: 'X-Ray',
                status: 'scheduled',
                clientEmail: 'john@example.com',
                clientPhone: '1234567890',
                createdAt: new Date().toISOString()
            },
            {
                id: 'apt_2',
                clientId: 'client_2',
                patientName: 'Jane Smith',
                appointmentDate: '2024-01-15',
                appointmentTime: '14:00',
                consultationType: 'MRI',
                status: 'confirmed',
                clientEmail: 'jane@example.com',
                clientPhone: '0987654321',
                createdAt: new Date().toISOString()
            },
            {
                id: 'apt_3',
                clientId: 'client_3',
                patientName: 'Bob Johnson',
                appointmentDate: '2024-01-16',
                appointmentTime: '09:00',
                consultationType: 'CT Scan',
                status: 'completed',
                clientEmail: 'bob@example.com',
                clientPhone: '1122334455',
                createdAt: new Date().toISOString()
            }
        ];
        
        localStorage.setItem('appointments', JSON.stringify(sampleAppointments));
    }
    
    const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    
    if (userRole === 'admin') {
        displayAdminAppointments(appointments);
    } else {
        displayStaffAppointments(appointments);
    }
}

// Display appointments for staff
function displayStaffAppointments(appointments) {
    staffAppointmentsList.innerHTML = '';
    
    if (appointments.length === 0) {
        staffAppointmentsList.innerHTML = '<p class="text-center text-gray-500">No appointments found.</p>';
        return;
    }
    
    appointments.forEach(app => {
        const appointmentCard = document.createElement('div');
        appointmentCard.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm';
        
        const statusColor = {
            'scheduled': 'text-yellow-600 bg-yellow-100',
            'confirmed': 'text-green-600 bg-green-100',
            'cancelled': 'text-red-600 bg-red-100',
            'completed': 'text-blue-600 bg-blue-100'
        }[app.status] || 'text-gray-600 bg-gray-100';
        
        appointmentCard.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800">${app.consultationType} for ${app.patientName}</h3>
                    <p class="text-gray-600 text-sm">Date: ${app.appointmentDate}</p>
                    <p class="text-gray-600 text-sm">Time: ${app.appointmentTime}</p>
                    <p class="text-gray-600 text-sm">Client: ${app.clientEmail}</p>
                    <p class="text-gray-600 text-sm">Phone: ${app.clientPhone}</p>
                    <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColor} mt-2">
                        ${app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                </div>
                <div class="flex gap-2 mt-3 sm:mt-0">
                    <select class="status-update text-xs border rounded px-2 py-1" data-id="${app.id}">
                        <option value="scheduled" ${app.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="confirmed" ${app.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="cancelled" ${app.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        <option value="completed" ${app.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button class="reschedule-btn text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" data-id="${app.id}">
                        Reschedule
                    </button>
                </div>
            </div>
        `;
        
        staffAppointmentsList.appendChild(appointmentCard);
    });
    
    // Add event listeners for status updates
    staffAppointmentsList.addEventListener('change', function(event) {
        if (event.target.classList.contains('status-update')) {
            const appointmentId = event.target.getAttribute('data-id');
            const newStatus = event.target.value;
            updateAppointmentStatus(appointmentId, newStatus);
        }
    });
    
    // Add event listeners for reschedule buttons
    staffAppointmentsList.addEventListener('click', function(event) {
        if (event.target.classList.contains('reschedule-btn')) {
            const appointmentId = event.target.getAttribute('data-id');
            rescheduleAppointment(appointmentId);
        }
    });
}

// Update appointment status
function updateAppointmentStatus(appointmentId, newStatus) {
    console.log(`Updating appointment ${appointmentId} to status: ${newStatus}`);
    
    // Get appointments from localStorage
    let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    
    // Find and update the appointment
    const appointmentIndex = appointments.findIndex(app => app.id === appointmentId);
    if (appointmentIndex !== -1) {
        appointments[appointmentIndex].status = newStatus;
        appointments[appointmentIndex].updatedAt = new Date().toISOString();
        
        // Save back to localStorage
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Refresh the appointments list
        if (userRole === 'admin') {
            displayAdminAppointments(appointments);
        } else {
            displayStaffAppointments(appointments);
        }
    }
    
    loginMessage.textContent = `Appointment status updated to ${newStatus}`;
    loginMessage.className = 'mt-4 text-center text-green-500';
    setTimeout(() => {
        loginMessage.textContent = '';
    }, 3000);
}

// Reschedule appointment
function rescheduleAppointment(appointmentId) {
    const newDate = prompt('Enter new date (YYYY-MM-DD):');
    const newTime = prompt('Enter new time (HH:MM):');
    
    if (newDate && newTime) {
        console.log(`Rescheduling appointment ${appointmentId} to ${newDate} at ${newTime}`);
        
        // Get appointments from localStorage
        let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        
        // Find and update the appointment
        const appointmentIndex = appointments.findIndex(app => app.id === appointmentId);
        if (appointmentIndex !== -1) {
            appointments[appointmentIndex].appointmentDate = newDate;
            appointments[appointmentIndex].appointmentTime = newTime;
            appointments[appointmentIndex].updatedAt = new Date().toISOString();
            
            // Save back to localStorage
            localStorage.setItem('appointments', JSON.stringify(appointments));
            
            // Refresh the appointments list
            if (userRole === 'admin') {
                displayAdminAppointments(appointments);
            } else {
                displayStaffAppointments(appointments);
            }
        }
        
        loginMessage.textContent = `Appointment rescheduled to ${newDate} at ${newTime}`;
        loginMessage.className = 'mt-4 text-center text-green-500';
        setTimeout(() => {
            loginMessage.textContent = '';
        }, 3000);
    }
}

// Update admin statistics
function updateAdminStats() {
    // Simulate admin statistics
    document.getElementById('total-appointments').textContent = '15';
    document.getElementById('active-users').textContent = '8';
    document.getElementById('today-appointments').textContent = '3';
}

// Display appointments for admin (same as staff but with additional controls)
function displayAdminAppointments(appointments) {
    adminAppointmentsList.innerHTML = '';
    
    if (appointments.length === 0) {
        adminAppointmentsList.innerHTML = '<p class="text-center text-gray-500">No appointments found.</p>';
        return;
    }
    
    appointments.forEach(app => {
        const appointmentCard = document.createElement('div');
        appointmentCard.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm';
        
        const statusColor = {
            'scheduled': 'text-yellow-600 bg-yellow-100',
            'confirmed': 'text-green-600 bg-green-100',
            'cancelled': 'text-red-600 bg-red-100',
            'completed': 'text-blue-600 bg-blue-100'
        }[app.status] || 'text-gray-600 bg-gray-100';
        
        appointmentCard.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800">${app.consultationType} for ${app.patientName}</h3>
                    <p class="text-gray-600 text-sm">Date: ${app.appointmentDate}</p>
                    <p class="text-gray-600 text-sm">Time: ${app.appointmentTime}</p>
                    <p class="text-gray-600 text-sm">Client: ${app.clientEmail}</p>
                    <p class="text-gray-600 text-sm">Phone: ${app.clientPhone}</p>
                    <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColor} mt-2">
                        ${app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                </div>
                <div class="flex gap-2 mt-3 sm:mt-0">
                    <select class="admin-status-update text-xs border rounded px-2 py-1" data-id="${app.id}">
                        <option value="scheduled" ${app.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="confirmed" ${app.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="cancelled" ${app.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        <option value="completed" ${app.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                    <button class="admin-reschedule-btn text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" data-id="${app.id}">
                        Reschedule
                    </button>
                    <button class="admin-delete-btn text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700" data-id="${app.id}">
                        Delete
                    </button>
                </div>
            </div>
        `;
        
        adminAppointmentsList.appendChild(appointmentCard);
    });
    
    // Add event listeners for admin controls
    adminAppointmentsList.addEventListener('change', function(event) {
        if (event.target.classList.contains('admin-status-update')) {
            const appointmentId = event.target.getAttribute('data-id');
            const newStatus = event.target.value;
            updateAppointmentStatus(appointmentId, newStatus);
        }
    });
    
    adminAppointmentsList.addEventListener('click', function(event) {
        if (event.target.classList.contains('admin-reschedule-btn')) {
            const appointmentId = event.target.getAttribute('data-id');
            rescheduleAppointment(appointmentId);
        } else if (event.target.classList.contains('admin-delete-btn')) {
            const appointmentId = event.target.getAttribute('data-id');
            deleteAppointment(appointmentId);
        }
    });
}

// Delete appointment (admin only)
function deleteAppointment(appointmentId) {
    if (confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
        console.log(`Deleting appointment ${appointmentId}`);
        
        // Get appointments from localStorage
        let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        
        // Filter out the appointment to delete
        appointments = appointments.filter(app => app.id !== appointmentId);
        
        // Save back to localStorage
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Refresh the appointments list
        displayAdminAppointments(appointments);
        
        loginMessage.textContent = 'Appointment deleted successfully';
        loginMessage.className = 'mt-4 text-center text-green-500';
        setTimeout(() => {
            loginMessage.textContent = '';
        }, 3000);
    }
}

// Add event listener for login form
loginForm.addEventListener('submit', handleLogin);

// Skip Firebase authentication for now - use local authentication
// This allows the application to continue after login without Firebase dependency

// Initialize the application without Firebase authentication
function initializeApp() {
    console.log("Application initialized without Firebase authentication");
    // The application will work with the login form authentication
}

// Call initialization
initializeApp();

// Add a new appointment (local storage simulation)
async function bookAppointment(event) {
    event.preventDefault();
    if (!userId || userRole !== 'client') {
        formMessage.textContent = 'Only clients can book appointments.';
        formMessage.className = 'mt-4 text-center text-red-500';
        return;
    }

    const patientName = document.getElementById('patient-name').value;
    const appointmentDate = document.getElementById('appointment-date').value;
    const appointmentTime = document.getElementById('appointment-time').value;
    const consultationType = document.getElementById('consultation-type').value;

    // Validation for operating hours and days
    const date = new Date(appointmentDate);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 2 = Tuesday
    const timeHours = parseInt(appointmentTime.split(':')[0]);

    if (dayOfWeek === 2) { // Tuesday
        formMessage.textContent = 'Sorry, the clinic is closed on Tuesdays. Please choose another day.';
        formMessage.className = 'mt-4 text-center text-red-500';
        return;
    }

    if (timeHours < 8 || timeHours >= 17) {
        formMessage.textContent = 'The clinic is only open from 08:00 to 17:00. Please choose a time within this range.';
        formMessage.className = 'mt-4 text-center text-red-500';
        return;
    }

    try {
        // Create appointment object
        const appointment = {
            id: 'apt_' + Date.now(),
            patientName,
            appointmentDate,
            appointmentTime,
            consultationType,
            status: 'scheduled',
            clientId: userId,
            clientEmail: currentUser.email,
            clientPhone: currentUser.phone,
            createdAt: new Date().toISOString()
        };

        // Store in localStorage (simulating database)
        let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        appointments.push(appointment);
        localStorage.setItem('appointments', JSON.stringify(appointments));

        form.reset();
        formMessage.textContent = 'Appointment booked successfully!';
        formMessage.className = 'mt-4 text-center text-green-500';
        
        // Refresh appointments list
        listenForAppointments();
    } catch (error) {
        console.error("Error adding appointment: ", error);
        formMessage.textContent = 'Error booking appointment. Please try again.';
        formMessage.className = 'mt-4 text-center text-red-500';
    }
}

// Load appointments from localStorage
function listenForAppointments() {
    loadingMessage.classList.add('hidden');
    appointmentsList.innerHTML = '';
    let hasAppointmentToday = false;
    const today = new Date().toISOString().split('T')[0];

    // Get appointments from localStorage
    const allAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    
    // Filter appointments for current user (clients only see their own)
    const appointments = allAppointments.filter(app => 
        userRole === 'admin' || userRole === 'staff' || app.clientId === userId
    );

    // Sort appointments by date and time
    appointments.sort((a, b) => {
        const dateA = new Date(`${a.appointmentDate}T${a.appointmentTime}`);
        const dateB = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
        return dateA - dateB;
    });

    if (appointments.length === 0) {
        appointmentsList.innerHTML = '<p class="text-center text-gray-500">No appointments found.</p>';
    } else {
        appointments.forEach(app => {
            const appointmentDate = app.appointmentDate;
            if (appointmentDate === today) {
                hasAppointmentToday = true;
            }

            const appointmentCard = document.createElement('div');
            appointmentCard.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm';
            
            const statusColor = {
                'scheduled': 'text-yellow-600 bg-yellow-100',
                'confirmed': 'text-green-600 bg-green-100',
                'cancelled': 'text-red-600 bg-red-100',
                'completed': 'text-blue-600 bg-blue-100'
            }[app.status] || 'text-gray-600 bg-gray-100';
            
            appointmentCard.innerHTML = `
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800">${app.consultationType} for ${app.patientName}</h3>
                    <p class="text-gray-600 text-sm">Date: ${app.appointmentDate}</p>
                    <p class="text-gray-600 text-sm">Time: ${app.appointmentTime}</p>
                    ${app.clientEmail ? `<p class="text-gray-600 text-sm">Client: ${app.clientEmail}</p>` : ''}
                    ${app.clientPhone ? `<p class="text-gray-600 text-sm">Phone: ${app.clientPhone}</p>` : ''}
                    <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColor} mt-2">
                        ${app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'Scheduled'}
                    </span>
                </div>
                <div class="flex gap-2 mt-3 sm:mt-0">
                    ${app.status !== 'cancelled' && app.status !== 'completed' ? 
                        `<button data-id="${app.id}" class="delete-btn px-4 py-2 text-xs font-semibold text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors">Cancel</button>` : 
                        ''
                    }
                </div>
            `;
            appointmentsList.appendChild(appointmentCard);
        });
    }

    // Show or hide the today's appointment alert
    if (hasAppointmentToday) {
        todayAlertContainer.classList.remove('hidden');
    } else {
        todayAlertContainer.classList.add('hidden');
    }
}

// Handle appointment deletion
appointmentsList.addEventListener('click', async (event) => {
    const target = event.target;
    if (target.classList.contains('delete-btn')) {
        const appointmentId = target.getAttribute('data-id');
        try {
            // Get appointments from localStorage
            let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
            
            // Filter out the appointment to delete
            appointments = appointments.filter(app => app.id !== appointmentId);
            
            // Save back to localStorage
            localStorage.setItem('appointments', JSON.stringify(appointments));
            
            console.log("Appointment successfully deleted!");
            
            // Refresh the appointments list
            listenForAppointments();
        } catch (error) {
            console.error("Error removing appointment: ", error);
        }
    }
});

// Add event listener for form submission
form.addEventListener('submit', bookAppointment);
