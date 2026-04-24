const API_BASE = "http://localhost:3000/api";

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function getTickets() {
  return JSON.parse(localStorage.getItem("tickets") || "[]");
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
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message || "API error");
  }
  return res.json();
}

function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("authToken");
  window.location.href = "login.html";
}

async function renderTicketsForStudent() {
  const user = getCurrentUser();
  if (!user) return;

  let tickets = getTickets().filter((t) => t.submitterEmail === user.email);

  const token = localStorage.getItem("authToken");
  if (token) {
    try {
      tickets = await apiRequest(
        `/tickets?submitter=${user.email}`,
        "GET",
        null,
        token,
      );
    } catch (apiError) {
      console.warn("API ticket fetch failed, using local fallback:", apiError);
    }
  }

  const counts = {
    open: tickets.filter((t) => t.status === "Open").length,
    inProgress: tickets.filter((t) => t.status === "In Progress").length,
    resolved: tickets.filter((t) => t.status === "Resolved").length,
  };

  document.querySelector(".stat-open").textContent = counts.open;
  document.querySelector(".stat-progress").textContent = counts.inProgress;
  document.querySelector(".stat-resolved").textContent = counts.resolved;

  const recentSection = document.querySelector(".recent");
  const ticketList = document.createElement("div");
  ticketList.className = "ticket-list";

  if (tickets.length === 0) {
    const noItems = document.createElement("p");
    noItems.className = "muted";
    noItems.textContent =
      "No tickets submitted yet. Create a ticket to see updates here.";
    recentSection.innerHTML = "";
    recentSection.appendChild(noItems);
    return;
  }

  const ordered = tickets
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  ordered.forEach((t) => {
    const item = document.createElement("div");
    item.className = "ticket-item";
    item.style.border = "1px solid var(--border)";
    item.style.borderRadius = "10px";
    item.style.padding = "0.9rem";
    item.style.margin = "0.65rem 0";

    const title = document.createElement("h3");
    title.textContent = t.title;
    title.style.margin = "0";
    title.style.cursor = "pointer";
    title.style.color = "var(--primary)";

    const summary = document.createElement("p");
    summary.textContent = t.description;
    summary.style.margin = "0.3rem 0";

    const meta = document.createElement("small");
    meta.innerHTML = `Priority: ${t.priority} · Status: ${t.status} · Category: ${t.category} · Created: ${new Date(t.createdAt).toLocaleString()}`;

    const details = document.createElement("div");
    details.style.display = "none";
    details.style.marginTop = "0.65rem";

    const commentsHeader = document.createElement("h4");
    commentsHeader.textContent = "Admin Feedback";
    commentsHeader.style.margin = "0 0 0.5rem 0";
    details.appendChild(commentsHeader);

    const commentsContainer = document.createElement("div");
    if (t.comments && t.comments.length > 0) {
      t.comments.forEach((c) => {
        const commentItem = document.createElement("div");
        commentItem.style.border = "1px solid var(--border)";
        commentItem.style.borderRadius = "5px";
        commentItem.style.padding = "0.5rem";
        commentItem.style.marginBottom = "0.5rem";
        commentItem.innerHTML = `<strong>${c.author}</strong> (${new Date(c.createdAt).toLocaleString()}): <br>${c.text}`;
        commentsContainer.appendChild(commentItem);
      });
    } else {
      const noComments = document.createElement("p");
      noComments.className = "muted";
      noComments.style.margin = "0";
      noComments.textContent =
        "No feedback yet. Check later for updates from staff.";
      commentsContainer.appendChild(noComments);
    }
    details.appendChild(commentsContainer);

    // Add attachments section if attachments exist
    if (t.attachments && t.attachments.length > 0) {
      const attachmentsDiv = document.createElement("div");
      attachmentsDiv.style.marginTop = "1rem";
      attachmentsDiv.style.padding = "0.5rem";
      attachmentsDiv.style.backgroundColor = "var(--bg)";
      attachmentsDiv.style.borderRadius = "5px";

      const attachmentsTitle = document.createElement("h4");
      attachmentsTitle.textContent = `My Attachments (${t.attachments.length})`;
      attachmentsTitle.style.margin = "0 0 0.5rem 0";
      attachmentsDiv.appendChild(attachmentsTitle);

      t.attachments.forEach((att, idx) => {
        const attItem = document.createElement("div");
        attItem.style.display = "flex";
        attItem.style.justifyContent = "space-between";
        attItem.style.alignItems = "center";
        attItem.style.padding = "0.5rem";
        attItem.style.borderBottom = "1px solid var(--border)";

        const attInfo = document.createElement("div");
        attInfo.innerHTML = `
          <strong>${att.name}</strong><br>
          <small style="color: var(--muted);">${(att.size / 1024).toFixed(2)} KB · ${att.type}</small>
        `;
        attItem.appendChild(attInfo);

        const downloadBtn = document.createElement("button");
        downloadBtn.textContent = "Download";
        downloadBtn.style.padding = "0.4rem 0.8rem";
        downloadBtn.style.backgroundColor = "var(--primary)";
        downloadBtn.style.color = "white";
        downloadBtn.style.border = "none";
        downloadBtn.style.borderRadius = "4px";
        downloadBtn.style.cursor = "pointer";
        downloadBtn.style.fontSize = "0.9rem";

        downloadBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const link = document.createElement("a");
          link.href = att.data;
          link.download = att.name;
          link.click();
        });

        attItem.appendChild(downloadBtn);
        attItem.style.borderBottom = "";
        attachmentsDiv.appendChild(attItem);
      });

      details.appendChild(attachmentsDiv);
    }

    title.addEventListener("click", () => {
      details.style.display =
        details.style.display === "none" ? "block" : "none";
    });

    item.appendChild(title);
    item.appendChild(summary);
    item.appendChild(meta);
    item.appendChild(details);
    ticketList.appendChild(item);
  });

  recentSection.innerHTML = "";
  recentSection.appendChild(ticketList);
}

document.addEventListener("DOMContentLoaded", function () {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const user = getCurrentUser();

  if (!user) {
    alert("You must be logged in to view the dashboard.");
    window.location.href = "login.html";
    return;
  }

  if (user.role !== "student") {
    alert("Access denied. This dashboard is for students only.");
    window.location.href = `dashboard-${user.role}.html`;
    return;
  }

  document.querySelector("#account-name").textContent = user.name || user.email;
  document.querySelector("#role-name").textContent = user.role;

  const logoutBtn = document.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (event) {
      event.preventDefault();
      logout();
    });
  }

  // Handle sidebar logout button
  const sidebarLogoutBtn = document.querySelector("#sidebar-logout-btn");
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener("click", function (event) {
      event.preventDefault();
      logout();
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

  renderTicketsForStudent().catch((error) => {
    console.error("Error rendering tickets:", error);
  });
});
