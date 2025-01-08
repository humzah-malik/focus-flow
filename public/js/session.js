document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    fetch('/auth/check-session')
        .then((res) => res.json())
        .then((data) => {
            const loginLink = document.getElementById('login-link');
            if (data.loggedIn) {
                loginLink.textContent = 'Log out';
                loginLink.href = '/auth/logout';
            } else {
                loginLink.textContent = 'Log in';
                loginLink.href = 'login.html';
            }
        })
        .catch((err) => console.error('Error checking session:', err));
});