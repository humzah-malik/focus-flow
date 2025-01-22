// public/js/auth.js

document.addEventListener("DOMContentLoaded", async () => {
    const loginLink = document.getElementById("login-link");
    const logoutButton = document.getElementById("logout-button");

    // Ensure the logoutButton exists
    if (!logoutButton) {
        console.error('Logout button not found in the DOM.');
        return;
    }

    // Assign the click event listener to the existing logout button
    logoutButton.addEventListener("click", showLogoutConfirmationModal);

    try {
        // Fetch login status from the server
        const response = await fetch('/check-session');
        const data = await response.json();

        if (data.loggedIn) {
            // User is logged in
            loginLink.style.display = "none";
            logoutButton.classList.remove("hidden");
        } else {
            // User is not logged in
            loginLink.style.display = "inline-block";
            logoutButton.classList.add("hidden");
        }
    } catch (error) {
        console.error('Error checking login status:', error);
        loginLink.style.display = "inline-block";
        logoutButton.classList.add("hidden");
    }

    // Check if a logout just occurred to display the success popup
    if (sessionStorage.getItem('logout') === 'success') {
        showLogoutSuccessPopup();
        sessionStorage.removeItem('logout');
    }
});

// Function to show a logout confirmation modal
function showLogoutConfirmationModal() {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.id = "logout-modal";
    modal.style = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    // Create modal content container
    const popup = document.createElement("div");
    popup.style = `
        padding: 30px;
        background: #fff;
        border-radius: 10px;
        text-align: center;
        width: 300px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;

    // Confirmation message
    const message = document.createElement("p");
    message.textContent = "Are you sure you want to log out?";
    message.style = "margin-bottom: 20px; font-size: 18px;";

    // Sign Out button
    const signOutButton = document.createElement("button");
    signOutButton.textContent = "Sign Out";
    signOutButton.style = `
        padding: 10px 20px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        margin-right: 10px;
    `;

    signOutButton.addEventListener("click", async () => {
        try {
            signOutButton.textContent = "Signing out...";
            signOutButton.disabled = true;
            
            const response = await fetch('/logout', { method: 'POST' }); // Ensure method is POST
            if (response.ok) {
                sessionStorage.setItem('logout', 'success');
                window.location.href = 'index.html'; // Redirect to index.html
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Error logging out:', error.message);
            alert('Logout failed. Please try again.');
            signOutButton.textContent = "Sign Out"; // Reset button text
            signOutButton.disabled = false; // Re-enable the button
        }
    });

    // Cancel button
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.style = `
        padding: 10px 20px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
    `;
    cancelButton.addEventListener("click", () => {
        modal.remove();
    });

    // Assemble modal content
    popup.appendChild(message);
    popup.appendChild(signOutButton);
    popup.appendChild(cancelButton);
    modal.appendChild(popup);
    document.body.appendChild(modal);

    // Close modal when clicking outside the popup
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Function to show a custom logout success popup
function showLogoutSuccessPopup() {
    const popup = document.createElement("div");
    popup.id = "logout-success-popup";
    popup.style = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: #28a745;
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1001;
        opacity: 0;
        transition: opacity 0.5s ease;
        font-size: 16px;
    `;
    popup.textContent = "You have logged out successfully.";
    document.body.appendChild(popup);
    
    // Fade-in effect
    setTimeout(() => {
        popup.style.opacity = "1";
    }, 100);
    
    // Remove after 3 seconds with fade-out effect
    setTimeout(() => {
        popup.style.opacity = "0";
        setTimeout(() => {
            popup.remove();
        }, 500);
    }, 3000);
}
