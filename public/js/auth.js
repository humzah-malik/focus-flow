document.addEventListener("DOMContentLoaded", async () => {
    const loginLink = document.getElementById("login-link");
    const logoutButton = document.createElement("button");
  
    // Style and configure the logout button
    logoutButton.textContent = "Log Out";
    logoutButton.style = "display: none; padding: 10px; border: none; background: #007bff; color: white; cursor: pointer;";
    logoutButton.addEventListener("click", showLogoutPopup);
  
    // Append the logout button next to the login link
    const loginBox = document.getElementById("login-box");
    loginBox.appendChild(logoutButton);
  
    try {
      // Fetch login status
      const response = await fetch('/auth/status');
      const data = await response.json();
  
      if (data.loggedIn) {
        // User is logged in
        loginLink.style.display = "none";
        logoutButton.style.display = "inline-block";
      } else {
        // User is not logged in
        loginLink.style.display = "inline-block";
        logoutButton.style.display = "none";
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      loginLink.style.display = "inline-block";
      logoutButton.style.display = "none";
    }
  });
  
  // Function to show a logout popup
  function showLogoutPopup() {
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
  
    const popup = document.createElement("div");
    popup.style = `
      padding: 20px;
      background: #fff;
      border-radius: 10px;
      text-align: center;
    `;
  
    const signOutButton = document.createElement("button");
    signOutButton.textContent = "Sign Out";
    signOutButton.style = `
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    `;
  
    signOutButton.addEventListener("click", async () => {
      try {
        signOutButton.textContent = "Signing out...";
        await fetch('/logout', { method: 'GET' }); // Trigger the logout endpoint
        location.reload(); // Reload the page to reset UI state
      } catch (error) {
        console.error('Error logging out:', error.message);
        alert('Logout failed. Please try again.');
      }
    });
  
    popup.appendChild(signOutButton);
    modal.appendChild(popup);
    document.body.appendChild(modal);
  
    // Close popup on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  