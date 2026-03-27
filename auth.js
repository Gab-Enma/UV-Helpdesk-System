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
}

document.addEventListener("DOMContentLoaded", function () {
  updateNavbar();
});
