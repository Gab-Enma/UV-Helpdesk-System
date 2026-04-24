const API_BASE = "http://localhost:3000/api";

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}

function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("authToken");
  window.location.href = "login.html";
}

async function apiRequest(path, method = "GET", body = null) {
  try {
    const token = localStorage.getItem("authToken");
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE}${path}`, opts);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "API error");
    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

function showAlert(message, type = "success") {
  const alert = document.getElementById("alert");
  alert.textContent = message;
  alert.className = `alert show alert-${type}`;
  setTimeout(() => {
    alert.classList.remove("show");
  }, 4000);
}

let users = [];
let editingUserId = null;

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Dashboard loaded");
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const user = getCurrentUser();
  console.log("Current user:", user);
  if (!user || user.role !== "masterkey") {
    console.error("Not authenticated as masterkey");
    window.location.href = "login.html";
    return;
  }

  // Ensure default users are in localStorage
  const defaultUsers = [
    {
      id: 1,
      email: "masterkey@uv.edu.ph",
      password: "masterkey123",
      role: "masterkey",
      name: "Master Administrator",
    },
    {
      id: 2,
      email: "accounting@uv.edu.ph",
      password: "accounting123",
      role: "accounting",
      name: "Accounting Team",
    },
    {
      id: 3,
      email: "registrar@uv.edu.ph",
      password: "registrar123",
      role: "registrar",
      name: "Registrar Team",
    },
    {
      id: 4,
      email: "faculty@uv.edu.ph",
      password: "faculty123",
      role: "faculty",
      name: "Faculty Team",
    },
  ];

  const existingUsers = getUsers();
  const existingEmails = new Set(existingUsers.map((u) => u.email));
  defaultUsers.forEach((u) => {
    if (!existingEmails.has(u.email)) {
      existingUsers.push(u);
    }
  });
  localStorage.setItem("users", JSON.stringify(existingUsers));

  // Set up account name
  const accountName = document.getElementById("account-name");
  if (accountName) accountName.textContent = user.name || user.email;

  // Set up logout buttons
  const logoutBtn = document.getElementById("logout-btn");
  const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      logout();
    });
  }
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      logout();
    });
  }

  // Set up sidebar toggle
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.toggle("sidebar--collapsed");
    });
  }

  // Modal controls
  const editModal = document.getElementById("edit-modal");
  const addModal = document.getElementById("add-modal");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const closeAddModalBtn = document.getElementById("close-add-modal-btn");
  const addUserBtn = document.getElementById("add-user-btn");
  const saveUserBtn = document.getElementById("save-user-btn");
  const createUserBtn = document.getElementById("create-user-btn");

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", function () {
      editModal.classList.remove("active");
      editingUserId = null;
    });
  }

  if (closeAddModalBtn) {
    closeAddModalBtn.addEventListener("click", function () {
      addModal.classList.remove("active");
    });
  }

  if (addUserBtn) {
    addUserBtn.addEventListener("click", function () {
      addModal.classList.add("active");
      // Clear form
      document.getElementById("add-name").value = "";
      document.getElementById("add-email").value = "";
      document.getElementById("add-password").value = "";
      document.getElementById("add-role").value = "accounting";
    });
  }

  if (saveUserBtn) {
    saveUserBtn.addEventListener("click", saveUser);
  }

  if (createUserBtn) {
    createUserBtn.addEventListener("click", createUser);
  }

  // Close modals when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target == editModal) {
      editModal.classList.remove("active");
      editingUserId = null;
    }
    if (event.target == addModal) {
      addModal.classList.remove("active");
    }
  });

  // Load initial data
  await loadUsers();
});

async function loadUsers() {
  try {
    users = await apiRequest("/admin/users");
    displayUsers();
    updateStats();
  } catch (error) {
    console.warn("API users unavailable, using local fallback:", error);
    // Fallback to localStorage
    users = getUsers();
    displayUsers();
    updateStats();
    if (users.length === 0) {
      showAlert("No users found. Check server connection.", "error");
    } else {
      showAlert("Using local data (server unavailable)", "error");
    }
  }
}

function displayUsers() {
  const tbody = document.getElementById("users-tbody");
  tbody.innerHTML = "";

  users.forEach((user) => {
    const row = document.createElement("tr");

    // Role badge with color coding
    const roleClass = `status-${user.role}`;

    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td><span class="status-badge ${roleClass}">${user.role}</span></td>
      <td>
        <div class="admin-actions">
          <button class="btn-edit" onclick="editUser(${user.id})">Edit</button>
          <button class="btn-delete" onclick="deleteUser(${user.id})" ${
            user.role === "masterkey" ? "disabled" : ""
          }>Delete</button>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function updateStats() {
  const totalUsers = document.getElementById("total-users");
  const activeAccounts = document.getElementById("active-accounts");
  const totalDepartments = document.getElementById("total-departments");

  if (totalUsers) totalUsers.textContent = users.length;
  if (activeAccounts) activeAccounts.textContent = users.length; // All users are considered active

  // Count unique departments
  const departments = new Set(
    users.filter((u) => u.role !== "masterkey").map((u) => u.role),
  );
  if (totalDepartments) totalDepartments.textContent = departments.size;
}

function editUser(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  if (user.role === "masterkey") {
    showAlert("Cannot edit masterkey account", "error");
    return;
  }

  editingUserId = userId;

  document.getElementById("edit-name").value = user.name;
  document.getElementById("edit-email").value = user.email;
  document.getElementById("edit-role").value = user.role;
  document.getElementById("edit-password").value = "";

  document.getElementById("edit-modal").classList.add("active");
}

async function saveUser() {
  if (!editingUserId) return;

  const name = document.getElementById("edit-name").value.trim();
  const email = document.getElementById("edit-email").value.trim();
  const role = document.getElementById("edit-role").value;
  const password = document.getElementById("edit-password").value;

  if (!name || !email) {
    showAlert("Name and email are required", "error");
    return;
  }

  try {
    const body = { name, email, role };
    if (password) body.password = password;

    await apiRequest(`/admin/users/${editingUserId}`, "PUT", body);

    showAlert("User updated successfully");
    document.getElementById("edit-modal").classList.remove("active");
    editingUserId = null;
    await loadUsers();
  } catch (error) {
    console.warn("API update failed, using local fallback:", error);
    // Fallback to localStorage
    const localUsers = getUsers();
    const userIndex = localUsers.findIndex((u) => u.id === editingUserId);

    if (userIndex === -1) {
      showAlert("User not found", "error");
      return;
    }

    const user = localUsers[userIndex];

    // Prevent masterkey from being edited
    if (user.role === "masterkey") {
      showAlert("Cannot edit masterkey account", "error");
      return;
    }

    // Check if email already exists (for other users)
    if (email !== user.email && localUsers.some((u) => u.email === email)) {
      showAlert("Email already exists", "error");
      return;
    }

    user.name = name;
    user.email = email;
    user.role = role;
    if (password) user.password = password;

    localStorage.setItem("users", JSON.stringify(localUsers));

    showAlert("User updated successfully (local)");
    document.getElementById("edit-modal").classList.remove("active");
    editingUserId = null;
    await loadUsers();
  }
}

async function createUser() {
  const name = document.getElementById("add-name").value.trim();
  const email = document.getElementById("add-email").value.trim();
  const password = document.getElementById("add-password").value;
  const role = document.getElementById("add-role").value;

  if (!name || !email || !password) {
    showAlert("All fields are required", "error");
    return;
  }

  try {
    // Use the signup endpoint to create a new user
    const response = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "Failed to create user");

    showAlert("User created successfully");
    document.getElementById("add-modal").classList.remove("active");
    await loadUsers();
  } catch (error) {
    console.warn("API signup failed, using local fallback:", error);
    // Fallback to localStorage
    const localUsers = getUsers();
    if (localUsers.some((u) => u.email === email)) {
      showAlert("Email already exists", "error");
      return;
    }

    const newId = Math.max(...localUsers.map((u) => u.id || 0)) + 1;
    const newUser = { id: newId, name, email, password, role };
    localUsers.push(newUser);
    localStorage.setItem("users", JSON.stringify(localUsers));

    showAlert("User created successfully (local)");
    document.getElementById("add-modal").classList.remove("active");
    await loadUsers();
  }
}

async function deleteUser(userId) {
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  if (user.role === "masterkey") {
    showAlert("Cannot delete masterkey account", "error");
    return;
  }

  if (!confirm(`Are you sure you want to delete ${user.name}?`)) {
    return;
  }

  try {
    await apiRequest(`/admin/users/${userId}`, "DELETE");
    showAlert("User deleted successfully");
    await loadUsers();
  } catch (error) {
    console.warn("API delete failed, using local fallback:", error);
    // Fallback to localStorage
    const localUsers = getUsers();
    const userIndex = localUsers.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      showAlert("User not found", "error");
      return;
    }

    const deleteUser = localUsers[userIndex];

    // Prevent masterkey from being deleted
    if (deleteUser.role === "masterkey") {
      showAlert("Cannot delete masterkey account", "error");
      return;
    }

    localUsers.splice(userIndex, 1);
    localStorage.setItem("users", JSON.stringify(localUsers));

    showAlert("User deleted successfully (local)");
    await loadUsers();
  }
}
