function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "[]");
}

function setUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function ensureDefaultAccounts() {
  const defaultUsers = [
    {
      email: "accounting@uv.edu.ph",
      password: "accounting123",
      role: "accounting",
      name: "Accounting Team",
    },
    {
      email: "registrar@uv.edu.ph",
      password: "registrar123",
      role: "registrar",
      name: "Registrar Team",
    },
    {
      email: "faculty@uv.edu.ph",
      password: "faculty123",
      role: "faculty",
      name: "Faculty Team",
    },
  ];

  const users = getUsers();
  const existingEmails = new Set(users.map((u) => u.email));
  defaultUsers.forEach((u) => {
    if (!existingEmails.has(u.email)) users.push(u);
  });
  setUsers(users);
}

const API_BASE = "http://localhost:3000/api";

function redirectForRole(role) {
  if (role === "accounting") return "dashboard-accounting.html";
  if (role === "registrar") return "dashboard-registrar.html";
  if (role === "faculty") return "dashboard-faculty.html";
  if (role === "student") return "dashboard-student.html";
  return "dashboard.html";
}

async function apiRequest(path, method = "GET", body = null, auth = null) {
  try {
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (auth) opts.headers.Authorization = `Bearer ${auth}`;
    if (body) opts.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE}${path}`, opts);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "API error");
    return data;
  } catch (error) {
    throw error;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Add toggle password functionality
  const togglePasswordBtns = document.querySelectorAll(".toggle-password");
  console.log("Found toggle buttons:", togglePasswordBtns.length);
  
  togglePasswordBtns.forEach((btn) => {
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Toggle button clicked");
      
      // Find parent div that contains both input and button
      const parentDiv = btn.closest("div[style*='position']");
      console.log("Parent div:", parentDiv);
      
      if (parentDiv) {
        const input = parentDiv.querySelector("input");
        console.log("Found input:", input, "Type:", input?.type);
        
        if (input) {
          if (input.type === "password") {
            input.type = "text";
            btn.textContent = "Hide";
            console.log("Password shown");
          } else {
            input.type = "password";
            btn.textContent = "Show";
            console.log("Password hidden");
          }
        }
      }
    });
  });

  // Check if user is already logged in
  const user = getCurrentUser();
  if (user) {
    window.location.href = redirectForRole(user.role);
    return;
  }

  ensureDefaultAccounts();

  const loginForm = document.querySelector("#login-form");
  const signupForm = document.querySelector("#signup-form");

  if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const email = loginForm
        .querySelector("input[name='email']")
        .value.trim()
        .toLowerCase();
      const password = loginForm.querySelector("input[name='password']").value;

      try {
        const response = await apiRequest("/login", "POST", {
          email,
          password,
        });
        localStorage.setItem("authToken", response.token);
        setCurrentUser(response.user);
        alert(`Logged in as ${response.user.role}`);
        window.location.href = redirectForRole(response.user.role);
        return;
      } catch (apiError) {
        console.warn("API login unavailable, using local fallback:", apiError);
      }

      const users = getUsers();
      const user = users.find(
        (u) => u.email === email && u.password === password,
      );
      if (!user) {
        alert("Invalid login. Check your credentials.");
        return;
      }
      setCurrentUser(user);
      alert(`Logged in as ${user.role}`);
      window.location.href = redirectForRole(user.role);
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      const name = signupForm.querySelector("input[name='name']").value.trim();
      const email = signupForm
        .querySelector("input[name='email']")
        .value.trim()
        .toLowerCase();
      const password = signupForm.querySelector("input[name='password']").value;
      const role = "student";

      const domainPattern = /@uv\.edu\.ph$/;
      if (!domainPattern.test(email)) {
        alert("Email must be a valid @uv.edu.ph address.");
        return;
      }

      try {
        const response = await apiRequest("/signup", "POST", {
          name,
          email,
          password,
          role,
        });
        localStorage.setItem("authToken", response.token);
        setCurrentUser(response.user);
        alert("Signup successful. Redirecting to your dashboard.");
        window.location.href = redirectForRole(response.user.role);
        return;
      } catch (apiError) {
        console.warn("API signup unavailable, using local fallback:", apiError);
      }

      const users = getUsers();
      if (users.some((u) => u.email === email)) {
        alert("This account already exists.");
        return;
      }

      const newUser = { name, email, password, role };
      users.push(newUser);
      setUsers(users);
      setCurrentUser(newUser);

      alert("Signup successful. Redirecting to your dashboard.");
      window.location.href = redirectForRole(role);
    });
  }
});
