function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}

function redirectForUser() {
  const user = getCurrentUser();
  if (!user) return "dashboard.html";

  if (user.role === "accounting") return "dashboard-accounting.html";
  if (user.role === "registrar") return "dashboard-registrar.html";
  if (user.role === "faculty") return "dashboard-faculty.html";
  if (user.role === "student") return "dashboard-student.html";
  return "dashboard.html";
}

document.addEventListener("DOMContentLoaded", function () {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const form = document.querySelector(".account-form");
  if (form) {
    form.querySelector("input[name='name']").value = user.name || "";
    form.querySelector("input[name='email']").value = user.email || "";
    form.querySelector("input[name='username']").value = user.username || "";

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const name = form.querySelector("input[name='name']").value;
      const email = form.querySelector("input[name='email']").value;
      const username = form.querySelector("input[name='username']").value;

      const users = getUsers();
      const idx = users.findIndex((u) => u.email === user.email);
      if (idx !== -1) {
        users[idx] = { ...users[idx], name, email, username };
        setUsers(users);
        setCurrentUser(users[idx]);
      }

      alert("Account settings saved.");
    });
  }

  const backToDashboard = document.querySelector(".button--secondary");
  if (backToDashboard) {
    backToDashboard.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = redirectForUser();
    });
  }
});
