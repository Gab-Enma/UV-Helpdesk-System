const API_BASE = "http://localhost:3000/api";

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function getTickets() {
  return JSON.parse(localStorage.getItem("tickets") || "[]");
}

function setTickets(tickets) {
  localStorage.setItem("tickets", JSON.stringify(tickets));
}

function updateTicketStatusInLocal(ticketId, status) {
  const tickets = getTickets();
  const idx = tickets.findIndex(
    (t) => String(t.id || t._id) === String(ticketId),
  );
  if (idx < 0) return false;
  tickets[idx].status = status;
  tickets[idx].updatedAt = new Date().toISOString();
  setTickets(tickets);
  return true;
}

function updateTicketCommentsInLocal(ticketId, comment) {
  const tickets = getTickets();
  const idx = tickets.findIndex(
    (t) => String(t.id || t._id) === String(ticketId),
  );
  if (idx < 0) return false;
  if (!tickets[idx].comments) tickets[idx].comments = [];
  tickets[idx].comments.push({
    text: comment,
    author: getCurrentUser().name || getCurrentUser().email,
    createdAt: new Date().toISOString(),
  });
  tickets[idx].updatedAt = new Date().toISOString();
  setTickets(tickets);
  return true;
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

async function renderTicketsForCategory(category) {
  const token = localStorage.getItem("authToken");
  let tickets = [];

  // Try to fetch from server first
  if (token) {
    try {
      const apiTickets = await apiRequest(
        `/tickets?category=${category}`,
        "GET",
        null,
        token,
      );
      tickets = apiTickets;
      console.log("Using API tickets:", apiTickets);
      // Update localStorage with server data
      setTickets(apiTickets);
    } catch (apiError) {
      console.warn(
        "API ticket fetch failed, falling back to local tickets:",
        apiError,
      );
      // Fall back to localStorage
      tickets = getTickets().filter((t) => t.category === category);
    }
  } else {
    // No token, use localStorage only
    tickets = getTickets().filter((t) => t.category === category);
  }

  console.log("Final tickets to render:", tickets);

  // Rest of the function remains the same

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
    noItems.textContent = "No tickets in this category yet.";
    recentSection.innerHTML = "";
    recentSection.appendChild(noItems);
    return;
  }

  const user = getCurrentUser();
  const canUpdateStatus = ["accounting", "faculty", "registrar"].includes(
    user?.role,
  );

  const ordered = tickets
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  ordered.forEach((t) => {
    const item = document.createElement("div");
    item.className = "ticket-item";
    item.dataset.ticketId = t.id || t._id;
    item.style.border = "1px solid var(--border)";
    item.style.borderRadius = "10px";
    item.style.padding = "0.9rem";
    item.style.margin = "0.65rem 0";
    item.style.cursor = "pointer";

    const title = document.createElement("h3");
    title.textContent = t.title;
    title.style.margin = "0";
    title.style.fontSize = "1.1rem";
    title.style.color = "var(--primary)";

    const summary = document.createElement("p");
    summary.textContent = t.description;
    summary.style.margin = "0.3rem 0";

    const meta = document.createElement("small");
    meta.innerHTML = `Priority: ${t.priority} · Status: <strong class="ticket-status">${t.status}</strong> · Created: ${new Date(t.createdAt).toLocaleString()}`;

    const details = document.createElement("div");
    details.style.display = "none";
    details.style.marginTop = "0.65rem";
    details.innerHTML = `<p style="margin:0 0 0.5rem; color: var(--muted);"><strong>Category:</strong> ${t.category}</p>`;

    // Add attachments section if attachments exist
    if (t.attachments && t.attachments.length > 0) {
      const attachmentsDiv = document.createElement("div");
      attachmentsDiv.style.marginTop = "1rem";
      attachmentsDiv.style.padding = "0.5rem";
      attachmentsDiv.style.backgroundColor = "var(--bg)";
      attachmentsDiv.style.borderRadius = "5px";

      const attachmentsTitle = document.createElement("h4");
      attachmentsTitle.textContent = `Attachments (${t.attachments.length})`;
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
        attachmentsDiv.appendChild(attItem);
      });

      const detailsContent = details.innerHTML;
      details.innerHTML = detailsContent;
      details.appendChild(attachmentsDiv);
    }

    if (canUpdateStatus) {
      const statusWrapper = document.createElement("div");
      statusWrapper.style.display = "flex";
      statusWrapper.style.gap = "0.5rem";
      statusWrapper.style.alignItems = "center";
      statusWrapper.style.marginTop = "0.5rem";

      const statusLabel = document.createElement("label");
      statusLabel.textContent = "Update status:";
      statusLabel.style.fontWeight = "600";

      const statusSelect = document.createElement("select");
      ["Open", "In Progress", "Resolved"].forEach((state) => {
        const option = document.createElement("option");
        option.value = state;
        option.textContent = state;
        if (state === t.status) option.selected = true;
        statusSelect.appendChild(option);
      });

      statusWrapper.appendChild(statusLabel);
      statusWrapper.appendChild(statusSelect);
      details.appendChild(statusWrapper);

      // Comments section
      const commentsSection = document.createElement("div");
      commentsSection.style.marginTop = "1rem";

      const commentsTitle = document.createElement("h4");
      commentsTitle.textContent = "Comments";
      commentsTitle.style.margin = "0 0 0.5rem 0";
      commentsSection.appendChild(commentsTitle);

      // Display existing comments
      if (t.comments && t.comments.length > 0) {
        t.comments.forEach((c) => {
          const commentDiv = document.createElement("div");
          commentDiv.style.border = "1px solid var(--border)";
          commentDiv.style.borderRadius = "5px";
          commentDiv.style.padding = "0.5rem";
          commentDiv.style.marginBottom = "0.5rem";
          commentDiv.innerHTML = `<strong>${c.author}</strong> (${new Date(
            c.createdAt,
          ).toLocaleString()}): ${c.text}`;
          commentsSection.appendChild(commentDiv);
        });
      } else {
        const noComments = document.createElement("p");
        noComments.textContent = "No comments yet.";
        noComments.style.color = "var(--muted)";
        commentsSection.appendChild(noComments);
      }

      // Add comment input
      const commentWrapper = document.createElement("div");
      commentWrapper.style.display = "flex";
      commentWrapper.style.gap = "0.5rem";
      commentWrapper.style.alignItems = "flex-end";

      const commentTextarea = document.createElement("textarea");
      commentTextarea.placeholder = "Add a comment...";
      commentTextarea.style.flex = "1";
      commentTextarea.style.minHeight = "60px";

      const addCommentBtn = document.createElement("button");
      addCommentBtn.textContent = "Add Comment";
      addCommentBtn.style.padding = "0.5rem 1rem";
      addCommentBtn.style.backgroundColor = "var(--primary)";
      addCommentBtn.style.color = "white";
      addCommentBtn.style.border = "none";
      addCommentBtn.style.borderRadius = "5px";
      addCommentBtn.style.cursor = "pointer";

      commentWrapper.appendChild(commentTextarea);
      commentWrapper.appendChild(addCommentBtn);
      commentsSection.appendChild(commentWrapper);
      details.appendChild(commentsSection);

      // Event listener for add comment
      addCommentBtn.addEventListener("click", async () => {
        const commentText = commentTextarea.value.trim();
        if (!commentText) return;
        const ticketId = t.id || t._id;

        if (token) {
          try {
            await apiRequest(
              `/tickets/${ticketId}/comments`,
              "POST",
              { text: commentText },
              token,
            );
            updateTicketCommentsInLocal(ticketId, commentText);
          } catch (apiError) {
            console.error("Failed to add comment on server:", apiError);
            alert("Error adding comment: " + apiError.message);
            return;
          }
        } else {
          updateTicketCommentsInLocal(ticketId, commentText);
        }

        // Add new comment to display
        const newCommentDiv = document.createElement("div");
        newCommentDiv.style.border = "1px solid var(--border)";
        newCommentDiv.style.borderRadius = "5px";
        newCommentDiv.style.padding = "0.5rem";
        newCommentDiv.style.marginBottom = "0.5rem";
        newCommentDiv.innerHTML = `<strong>${
          user.name || user.email
        }</strong> (${new Date().toLocaleString()}): ${commentText}`;
        commentsSection.insertBefore(newCommentDiv, commentWrapper);
        commentTextarea.value = "";
      });

      statusSelect.addEventListener("change", async (event) => {
        const newStatus = event.target.value;
        const ticketId = t.id || t._id;

        if (token) {
          try {
            await apiRequest(
              `/tickets/${ticketId}`,
              "PUT",
              { status: newStatus },
              token,
            );
            updateTicketStatusInLocal(ticketId, newStatus);
          } catch (apiError) {
            console.error("Failed to update status on server:", apiError);
            alert("Error updating status: " + apiError.message);
            statusSelect.value = t.status;
            return;
          }
        } else {
          updateTicketStatusInLocal(ticketId, newStatus);
        }

        t.status = newStatus;
        meta.querySelector(".ticket-status").textContent = newStatus;

        const updatedTickets = getTickets().filter(
          (tk) => tk.category === category,
        );
        document.querySelector(".stat-open").textContent =
          updatedTickets.filter((tk) => tk.status === "Open").length;
        document.querySelector(".stat-progress").textContent =
          updatedTickets.filter((tk) => tk.status === "In Progress").length;
        document.querySelector(".stat-resolved").textContent =
          updatedTickets.filter((tk) => tk.status === "Resolved").length;
      });
    }

    title.addEventListener("click", (e) => {
      e.stopPropagation();
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
  const panelHeading = document.querySelector(".panel h1");

  if (!user) {
    alert("You must be logged in to view the dashboard.");
    window.location.href = "login.html";
    return;
  }

  const expectedCategory = panelHeading ? panelHeading.dataset.category : null;
  if (!expectedCategory || user.role !== expectedCategory) {
    alert(
      "Access denied for this category. Redirecting to your role dashboard.",
    );
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

  renderTicketsForCategory(user.role).catch((error) => {
    console.error("Error rendering tickets:", error);
  });
});
