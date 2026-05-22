// Helper for authenticated fetch requests
const API_BASE_URL = 'http://localhost:3000'; // Your backend runs on port 3000

async function authFetch(url, opts = {}) {
    const token = localStorage.getItem('accessToken');
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`; // Prepend base URL if not absolute
    const headers = {
        ...(opts.body && {'Content-Type': 'application/json'}),
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...opts.headers
    };
    const response = await fetch(fullUrl, { ...opts, headers });
    const data = await response.json();
    return data;
}

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        // Redirect to login if not authenticated, though ideally, main.js/router handles this
        window.location.href = '/login.html';
        return;
    }

    // Change Password Form
    const changePasswordForm = document.getElementById('change-password-form');
    const changePasswordMessageArea = document.getElementById('change-password-message-area');

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            changePasswordMessageArea.textContent = '';
            changePasswordMessageArea.className = 'mb-3';

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword !== confirmNewPassword) {
                changePasswordMessageArea.textContent = 'New passwords do not match.';
                changePasswordMessageArea.classList.add('text-danger');
                return;
            }

            try {
                const data = await authFetch('/api/auth/change-password', {
                    method: 'POST',
                    body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
                });
                changePasswordMessageArea.textContent = data.message || 'Password changed successfully!';
                changePasswordMessageArea.classList.add('text-success');
                changePasswordForm.reset();
            } catch (error) {
                changePasswordMessageArea.textContent = error.message || 'Failed to change password.';
                changePasswordMessageArea.classList.add('text-danger');
            }
        });
    }

    // Email 2FA Toggle
    const email2FAToggle = document.getElementById('email-2fa-toggle');
    const email2FAStatusLabel = document.getElementById('email-2fa-status-label');
    const twoFAMessageArea = document.getElementById('2fa-message-area');
    const twoFAVerificationSection = document.getElementById('2fa-verification-section');
    const twoFAVerificationCode_Input = document.getElementById('2fa-verification-code');
    const verify2FACodeBtn = document.getElementById('verify-2fa-code-btn');
    const cancel2FASetupBtn = document.getElementById('cancel-2fa-setup-btn');

    // Function to update 2FA UI based on user status
    function update2FA_UI(isEnabled) {
        email2FAToggle.checked = isEnabled;
        email2FAStatusLabel.textContent = isEnabled ? 'Email 2FA is Enabled' : 'Email 2FA is Disabled';
        if (isEnabled) {
            email2FAStatusLabel.classList.add('text-success');
            email2FAStatusLabel.classList.remove('text-danger');
        } else {
            email2FAStatusLabel.classList.add('text-danger');
            email2FAStatusLabel.classList.remove('text-success');
        }
        twoFAVerificationSection.style.display = 'none'; // Hide verification section by default
        twoFAVerificationCode_Input.value = '';
    }

    // Function to get 2FA status from local user data
    function fetchUser2FAStatus() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isEnabled = user?.isEmailTwoFactorEnabled || false;
        update2FA_UI(isEnabled);
        return isEnabled;
    }

    // Initialize 2FA toggle state
    const isEnabled = fetchUser2FAStatus();
    update2FA_UI(isEnabled);

    if (email2FAToggle) {
        email2FAToggle.addEventListener('change', async () => {
            twoFAMessageArea.textContent = '';
            twoFAMessageArea.className = 'mb-3';
            const isEnabling = email2FAToggle.checked;

            if (isEnabling) {
                // Request 2FA setup
                try {
                    const data = await authFetch('/api/auth/request-2fa-setup', { method: 'POST' });
                    twoFAMessageArea.textContent = data.message || 'Verification code sent.';
                    twoFAMessageArea.classList.add('text-info');
                    twoFAVerificationSection.style.display = 'block';
                } catch (error) {
                    twoFAMessageArea.textContent = error.message || 'Failed to request 2FA setup.';
                    twoFAMessageArea.classList.add('text-danger');
                    email2FAToggle.checked = false; // Revert toggle
                }
            } else {
                // Disable 2FA
                // Optional: Ask for password confirmation before disabling for extra security
                if (!confirm('Are you sure you want to disable Email 2FA?')) {
                    email2FAToggle.checked = true; // Revert toggle
                    return;
                }
                try {
                    const data = await authFetch('/api/auth/disable-2fa', { method: 'POST' });
                    twoFAMessageArea.textContent = data.message || 'Email 2FA disabled.';
                    twoFAMessageArea.classList.add('text-success');
                    update2FA_UI(false);
                    // Update UI and localStorage with fresh data from server
                    const updatedUser = { ...user, isEmailTwoFactorEnabled: false };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    // Refresh the 2FA status from server to ensure consistency
                    await fetchUser2FAStatus();
                } catch (error) {
                    twoFAMessageArea.textContent = error.message || 'Failed to disable 2FA.';
                    twoFAMessageArea.classList.add('text-danger');
                    email2FAToggle.checked = true; // Revert toggle
                }
            }
        });
    }

    if (verify2FACodeBtn) {
        verify2FACodeBtn.addEventListener('click', async () => {
            const code = twoFAVerificationCode_Input.value;
            if (!code) {
                twoFAMessageArea.textContent = 'Please enter the verification code.';
                twoFAMessageArea.className = 'mb-3 text-warning';
                return;
            }
            try {
                const data = await authFetch('/api/auth/verify-2fa-setup', {
                    method: 'POST',
                    body: JSON.stringify({ code })
                });
                twoFAMessageArea.textContent = data.message || 'Email 2FA enabled successfully!';
                twoFAMessageArea.classList.add('text-success');
                update2FA_UI(true);
                // Update UI and localStorage with fresh data from server
                const updatedUser = { ...user, isEmailTwoFactorEnabled: true };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                // Refresh the 2FA status from server to ensure consistency
                await fetchUser2FAStatus();
            } catch (error) {
                if (error.message.includes('Invalid verification code')) {
                    twoFAMessageArea.textContent = 'Invalid verification code. Please try again.';
                } else {
                    twoFAMessageArea.textContent = error.message || 'Failed to verify code or enable 2FA.';
                }
                twoFAMessageArea.classList.add('text-danger');
                // Don't revert toggle here, let user try again or cancel
            }
        });
    }

    if (cancel2FASetupBtn) {
        cancel2FASetupBtn.addEventListener('click', () => {
            twoFAVerificationSection.style.display = 'none';
            twoFAVerificationCode_Input.value = '';
            twoFAMessageArea.textContent = '2FA setup cancelled.';
            twoFAMessageArea.className = 'mb-3 text-info';
            update2FA_UI(false); // Revert toggle to disabled state as setup wasn't completed
             // Also update localStorage if you want to persist this cancellation immediately
            user.isEmailTwoFactorEnabled = false; // Assuming cancellation means it's not enabled
            localStorage.setItem('user', JSON.stringify(user));
        });
    }

    // Password visibility toggles (similar to login page)
    const passwordToggles = document.querySelectorAll('.form-password-toggle .input-group-text');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            const input = e.currentTarget.previousElementSibling;
            const icon = e.currentTarget.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('bx-hide');
                icon.classList.add('bx-show');
            } else {
                input.type = 'password';
                icon.classList.remove('bx-show');
                icon.classList.add('bx-hide');
            }
        });
    });
});
