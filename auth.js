function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("authToken");
  window.location.href = "login.html";
}

function updateNavbar() {
  const user = getCurrentUser();
  const nav = document.querySelector(".nav");

  if (!nav) return;

  // Find the login/signup link
  const loginLink = nav.querySelector('a[href="login.html"]');

  if (user && loginLink) {
    // Replace login/signup with logout
    const logoutLink = document.createElement("a");
    logoutLink.href = "#";
    logoutLink.className = "nav__link nav__link--cta";
    logoutLink.id = "logout-btn";
    logoutLink.textContent = "Logout";
    logoutLink.addEventListener("click", function (event) {
      event.preventDefault();
      logout();
    });

    loginLink.parentNode.replaceChild(logoutLink, loginLink);
  }

  // Hide/show links based on login status
  const dashboardLink = nav.querySelector('a[href="dashboard.html"]');
  const writeLink = nav.querySelector('a[href="write.html"]');
  const accountLink = nav.querySelector('a[href="account.html"]');

  if (!user) {
    // Hide protected links when not logged in
    if (dashboardLink) dashboardLink.style.display = "none";
    if (writeLink) writeLink.style.display = "none";
    if (accountLink) accountLink.style.display = "none";
  } else {
    // Show protected links when logged in
    if (dashboardLink) dashboardLink.style.display = "";
    if (writeLink) writeLink.style.display = "";
    if (accountLink) accountLink.style.display = "";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  updateNavbar();
});
