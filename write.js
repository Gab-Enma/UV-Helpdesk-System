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
      const attachmentInput = form.querySelector("input[name='attachments']");

      if (!title || !description) {
        alert("Please fill all required fields.");
        return;
      }

      const token = localStorage.getItem("authToken");
      const user = JSON.parse(localStorage.getItem("currentUser") || "null");

      // Process attachments
      const attachments = [];
      if (attachmentInput && attachmentInput.files.length > 0) {
        for (let file of attachmentInput.files) {
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onload = (e) => {
              attachments.push({
                name: file.name,
                size: file.size,
                type: file.type,
                data: e.target.result, // Base64 encoded file data
              });
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }
      }

      const newTicket = {
        title,
        description,
        priority,
        category,
        attachments: attachments,
      };

      // Save to server first if authenticated
      if (token) {
        try {
          const serverTicket = await apiRequest(
            "/tickets",
            "POST",
            newTicket,
            token,
          );
          // Save server response to localStorage with server ID
          const tickets = getTickets();
          const ticketToSave = {
            ...serverTicket,
            attachments: attachments,
          };
          tickets.push(ticketToSave);
          setTickets(tickets);
        } catch (apiError) {
          console.error("Failed to submit ticket to server:", apiError);
          alert("Error submitting ticket: " + apiError.message);
          return;
        }
      } else {
        // Fallback: save to localStorage only if not authenticated
        const localTicket = {
          id: Date.now(),
          ...newTicket,
          status: "Open",
          createdAt: new Date().toISOString(),
          submitterEmail: user ? user.email : "",
          comments: [],
        };
        const tickets = getTickets();
        tickets.push(localTicket);
        setTickets(tickets);
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

  // Sidebar toggle functionality
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("sidebar-toggle");
  const page = document.querySelector(".page");

  if (toggleBtn) {
    // Restore sidebar state from localStorage
    const isSidebarHidden = localStorage.getItem("sidebarHidden") === "true";
    if (isSidebarHidden) {
      sidebar.classList.add("sidebar--hidden");
      page.classList.add("page--sidebar-hidden");
    }

    toggleBtn.addEventListener("click", function () {
      sidebar.classList.toggle("sidebar--hidden");
      page.classList.toggle("page--sidebar-hidden");
      // Save state to localStorage
      localStorage.setItem(
        "sidebarHidden",
        sidebar.classList.contains("sidebar--hidden"),
      );
    });
  }
});
