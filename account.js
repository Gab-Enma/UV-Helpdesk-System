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
      const name = form.querySelector("input[name='name']").value.trim();
      const email = form.querySelector("input[name='email']").value.trim();
      const username = form.querySelector("input[name='username']").value.trim();
      const currentPassword = form.querySelector("input[name='currentPassword']").value;
      const newPassword = form.querySelector("input[name='newPassword']").value;
      const confirmPassword = form.querySelector("input[name='confirmPassword']").value;

      if (!name || !email || !username) {
        alert("Please fill in all required fields.");
        return;
      }

      const users = getUsers();
      const idx = users.findIndex((u) => u.email === user.email);
      if (idx === -1) {
        alert("User not found.");
        return;
      }

      // Check if email is already taken by another user
      const emailTaken = users.some((u, i) => i !== idx && u.email === email);
      if (emailTaken) {
        alert("Email is already in use by another account.");
        return;
      }

      // Handle password change
      let updatedPassword = user.password;
      if (currentPassword || newPassword || confirmPassword) {
        if (currentPassword !== user.password) {
          alert("Current password is incorrect.");
          return;
        }
        if (newPassword !== confirmPassword) {
          alert("New passwords do not match.");
          return;
        }
        if (!newPassword) {
          alert("Please enter a new password.");
          return;
        }
        updatedPassword = newPassword;
      }

      // Update user
      const updatedUser = { ...users[idx], name, email, username, password: updatedPassword };
      users[idx] = updatedUser;
      setUsers(users);
      setCurrentUser(updatedUser);

      alert("Account settings saved.");
      // Clear password fields
      form.querySelector("input[name='currentPassword']").value = "";
      form.querySelector("input[name='newPassword']").value = "";
      form.querySelector("input[name='confirmPassword']").value = "";
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
