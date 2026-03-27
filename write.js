const API_BASE = "http://localhost:3000/api";

function getTickets() {
  return JSON.parse(localStorage.getItem("tickets") || "[]");
}

function setTickets(tickets) {
  localStorage.setItem("tickets", JSON.stringify(tickets));
}

async function apiRequest(path, method = "GET", body = null, token = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "API error");
  return data;
}

function redirectForCategory(category) {
  if (category === "accounting") return "dashboard-accounting.html";
  if (category === "registrar") return "dashboard-registrar.html";
  if (category === "faculty") return "dashboard-faculty.html";
  return "dashboard.html";
}

function redirectForUser() {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null");
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

  const user = JSON.parse(localStorage.getItem("currentUser") || "null");
  if (!user) {
    alert("You must be logged in to submit a ticket.");
    window.location.href = "login.html";
    return;
  }

  const form = document.querySelector(".ticket-form");
  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const title = form.querySelector("input[name='title']").value.trim();
      const description = form
        .querySelector("textarea[name='description']")
        .value.trim();
      const priority = form.querySelector("select[name='priority']").value;
      const category = form.querySelector("select[name='category']").value;

      if (!title || !description) {
        alert("Please fill all required fields.");
        return;
      }

      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("currentUser") || "null");

      const newTicket = {
        id: Date.now(),
        title,
        description,
        priority,
        category,
        status: "Open",
        createdAt: new Date().toISOString(),
        submitterEmail: user ? user.email : "",
      };

      // Persist in local storage so dashboards immediately reflect the ticket
      const tickets = getTickets();
      tickets.push(newTicket);
      setTickets(tickets);

      if (token) {
        try {
          await apiRequest(
            "/tickets",
            "POST",
            {
              title,
              description,
              priority,
              category,
            },
            token,
          );
        } catch (apiError) {
          console.warn(
            "API store unavailable, using local fallback:",
            apiError,
          );
        }
      }

      alert("Ticket submitted and routed to " + category + " dashboard.");
      form.reset();
      window.location.href = redirectForUser();
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
