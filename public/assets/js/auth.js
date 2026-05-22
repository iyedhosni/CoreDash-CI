// Import the socket utility
import { initSocket, disconnectSocket } from './socket.js';

// State variable to manage 2FA flow
let isWaitingFor2FACode = false;
let twoFactorUserId = null;

// Initialize socket connection when the page loads
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize socket if user is already logged in (page refresh)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.role) {
      console.log('Initializing socket for user:', user.role);
      initSocket(user.role);
    }
    
    // Add logout handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
  } catch (error) {
    console.error('Error initializing auth module:', error);
  }
});

// Handle login form submission
document.getElementById('login-form')?.addEventListener('submit', async e => {
  e.preventDefault();

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const twoFactorCodeInput = document.getElementById('2fa-code');
  const loginBtn = document.getElementById('login-submit-btn');
  const messageArea = document.getElementById('message-area');
  const originalBtnText = loginBtn.textContent; // Use textContent for button text

  // Clear previous messages
  messageArea.textContent = '';
  messageArea.className = 'mb-3'; // Reset class

  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

  try {
    if (isWaitingFor2FACode) {
      // --- Second step: Verify 2FA code ---
      const code = twoFactorCodeInput.value;
      if (!code) {
        throw new Error('Verification code is required.');
      }

      const res = await fetch('http://localhost:3000/api/auth/verify-2fa-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // If your backend uses cookies/sessions for 2FA state
        body: JSON.stringify({ userId: twoFactorUserId, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid or expired 2FA code.');

      // 2FA successful, proceed to login completion
      completeLogin(data);

    } else {
      // --- First step: Standard email/password login ---
      const email = emailInput.value;
      const password = passwordInput.value;

      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        // If login fails before 2FA check (e.g. bad password), it's an error
        throw new Error(data.message || 'Login failed');
      }

      if (data.twoFactorRequired) {
        // Transition to 2FA code input step
        isWaitingFor2FACode = true;
        twoFactorUserId = data.userId;

        document.getElementById('email-field-container').style.display = 'none';
        document.getElementById('password-field-container').style.display = 'none';
        document.getElementById('2fa-code-field-container').style.display = 'block';
        twoFactorCodeInput.focus();
        
        loginBtn.textContent = 'Verify Code';
        messageArea.textContent = data.message || 'A verification code has been sent to your email.';
        messageArea.classList.add('text-success'); // Use a success class for info message
        loginBtn.disabled = false; // Re-enable button for code submission
      } else {
        // No 2FA required, or 2FA was part of the initial login response (not our case here)
        completeLogin(data);
      }
    }
  } catch (err) {
    console.error('Login process error:', err);
    messageArea.textContent = err.message || 'An error occurred.';
    messageArea.className = 'mb-3 text-danger'; // Error class
    loginBtn.disabled = false;
    loginBtn.innerHTML = originalBtnText;
    // Reset 2FA state if an error occurs during code verification
    if (isWaitingFor2FACode) {
        // Optionally, revert UI to email/password input
        // document.getElementById('email-field-container').style.display = 'block';
        // document.getElementById('password-field-container').style.display = 'block';
        // document.getElementById('2fa-code-field-container').style.display = 'none';
        // isWaitingFor2FACode = false;
        // twoFactorUserId = null;
        // loginBtn.textContent = 'Login';
    }
  }
});

function completeLogin(data) {
  // Store token and user data
  localStorage.setItem('accessToken', data.token);
  const userData = {
    id: data.user.id,
    firstName: data.user.first_name,
    lastName: data.user.last_name,
    email: data.user.email,
    role: data.user.role,
    isEmailTwoFactorEnabled: data.user.isEmailTwoFactorEnabled // Store 2FA status
  };
  localStorage.setItem('user', JSON.stringify(userData));

  // Initialize socket connection with user's role
  initSocket(userData.role);

  // Redirect to dashboard after a short delay to allow socket to connect
  setTimeout(() => {
    window.location.href = '/index.html'; // Or your intended dashboard page
  }, 500);
}

// Handle logout
async function handleLogout(e) {
  e.preventDefault();
  
  try {
    // Disconnect socket before logging out
    disconnectSocket();
    
    // Get the token from localStorage
    const token = localStorage.getItem('accessToken');
    
    // Call the logout endpoint to invalidate the token on the server
    if (token) {
      try {
        const response = await fetch(`${window.ENV?.BACKEND_URL || 'http://localhost:3000'}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Check if the response is not OK (status not in the range 200-299)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.warn('Logout API warning:', errorData.message || 'Logout endpoint returned non-OK status');
          // Continue with client-side cleanup even if the API returns an error
        }
      } catch (err) {
        console.warn('Logout API warning (proceeding with client-side cleanup):', err.message);
        // Continue with client-side cleanup even if the API call fails
      }
    }
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    
    // Redirect to login page
    window.location.href = '/login.html';
  } catch (err) {
    console.error('Unexpected logout error:', err);
    // Don't show an alert for unexpected errors during logout
    // Just redirect to login page
    window.location.href = '/login.html';
  }
}

// Handle page unload to clean up socket connection
window.addEventListener('beforeunload', () => {
  // Only disconnect if we're not navigating to a page in our app
  if (!window.location.pathname.includes('logout')) {
    disconnectSocket();
  }
});

// Helper for authenticated fetch requests
async function authFetch(url, opts = {}) {
    const token = localStorage.getItem('accessToken');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...opts.headers
    };
    try {
        const response = await fetch(url, { ...opts, headers });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: response.statusText }));
            console.error(`API Error ${response.status} for ${url}:`, errData.message);
            throw new Error(errData.message || `HTTP error ${response.status}`);
        }
        // Check if the response is JSON before trying to parse it
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json(); 
        }
        return response.text(); // Or handle as plain text, or throw error if JSON was expected
    } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        throw error;
    }
}
