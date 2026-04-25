const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(".")); // Serve static files from current directory

// File-based persistence
const ticketsFile = path.join(__dirname, "tickets.json");

function loadTickets() {
  try {
    if (fs.existsSync(ticketsFile)) {
      const data = fs.readFileSync(ticketsFile, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading tickets:", err);
  }
  return [];
}

function saveTickets(tickets) {
  try {
    fs.writeFileSync(ticketsFile, JSON.stringify(tickets, null, 2));
  } catch (err) {
    console.error("Error saving tickets:", err);
  }
}

// In-memory data store (mock persistence)
let tickets = loadTickets();

const users = [
  {
    id: 1,
    name: "Master Administrator",
    email: "masterkey@uv.edu.ph",
    password: "masterkey123",
    role: "masterkey",
  },
  {
    id: 2,
    name: "Accounting Team",
    email: "accounting@uv.edu.ph",
    password: "accounting123",
    role: "accounting",
  },
  {
    id: 3,
    name: "Registrar Team",
    email: "registrar@uv.edu.ph",
    password: "registrar123",
    role: "registrar",
  },
  {
    id: 4,
    name: "SASC Team",
    email: "sasc@uv.edu.ph",
    password: "sasc123",
    role: "sasc",
  },
];

function createToken(user) {
  return Buffer.from(`${user.email}:${Date.now()}`).toString("base64");
}

const sessions = new Map();

function authenticate(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = sessions.get(token);
  next();
}

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = createToken(user);
  sessions.set(token, user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

app.post("/api/signup", (req, res) => {
  const { name, email, password, role } = req.body;
  // Masterkey cannot be created via signup - only exists by default
  if (!["accounting", "registrar", "faculty", "student"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  if (users.some((u) => u.email === email)) {
    return res.status(400).json({ message: "Email exists" });
  }
  const user = { id: users.length + 1, name, email, password, role };
  users.push(user);
  const token = createToken(user);
  sessions.set(token, user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

app.get("/api/users/me", authenticate, (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

app.post("/api/tickets", authenticate, (req, res) => {
  const { title, description, priority, category } = req.body;
  if (!["accounting", "registrar", "faculty"].includes(category)) {
    return res.status(400).json({ message: "Invalid category" });
  }
  const ticket = {
    id: tickets.length + 1,
    title,
    description,
    priority,
    category,
    status: "Open",
    createdAt: new Date().toISOString(),
    owner: req.user.id,
    submitterEmail: req.user.email,
    comments: [],
  };
  tickets.push(ticket);
  saveTickets(tickets);
  res.json(ticket);
});

app.put("/api/tickets/:ticketId", authenticate, (req, res) => {
  const ticketId = Number(req.params.ticketId);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found" });
  }

  const { status } = req.body;
  if (status && ["Open", "In Progress", "Resolved"].includes(status)) {
    ticket.status = status;
    saveTickets(tickets);
  }

  return res.json(ticket);
});

app.post("/api/tickets/:ticketId/comments", authenticate, (req, res) => {
  const ticketId = Number(req.params.ticketId);
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket not found" });
  }

  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ message: "Comment text is required" });
  }

  const comment = {
    author: req.user.name || req.user.email,
    text,
    createdAt: new Date().toISOString(),
  };

  ticket.comments = ticket.comments || [];
  ticket.comments.push(comment);
  saveTickets(tickets);

  return res.json(comment);
});

app.get("/api/tickets", authenticate, (req, res) => {
  const category = req.query.category;
  const submitter = req.query.submitter;

  if (category) {
    // Filter by category (for staff roles)
    if (req.user.role !== category) {
      return res.status(403).json({ message: "Access denied" });
    }
    const filtered = tickets.filter((t) => t.category === category);
    return res.json(filtered);
  }

  if (submitter) {
    // Filter by submitter (for students)
    if (req.user.email !== submitter) {
      return res.status(403).json({ message: "Access denied" });
    }
    const filtered = tickets.filter((t) => t.submitterEmail === submitter);
    return res.json(filtered);
  }

  return res
    .status(400)
    .json({ message: "Category or submitter parameter required" });
});

// Merge localStorage tickets with server tickets (no auth required for initial migration)
app.post("/api/tickets/merge/local", (req, res) => {
  const { localTickets } = req.body;

  if (!Array.isArray(localTickets)) {
    return res.status(400).json({ message: "localTickets must be an array" });
  }

  if (localTickets.length === 0) {
    return res.json({ message: "No tickets to merge", merged: 0 });
  }

  let mergedCount = 0;

  for (const localTicket of localTickets) {
    // Check if ticket already exists (by title, category, and createdAt to avoid duplicates)
    const exists = tickets.some(
      (t) =>
        t.title === localTicket.title &&
        t.category === localTicket.category &&
        t.createdAt === localTicket.createdAt,
    );

    if (exists) {
      console.log(`Skipping duplicate: ${localTicket.title}`);
      continue;
    }

    // Assign new server ID
    const newId =
      tickets.length > 0 ? Math.max(...tickets.map((t) => t.id)) + 1 : 1;

    const serverTicket = {
      id: newId,
      title: localTicket.title,
      description: localTicket.description,
      priority: localTicket.priority,
      category: localTicket.category,
      status: localTicket.status || "Open",
      createdAt: localTicket.createdAt || new Date().toISOString(),
      submitterEmail: localTicket.submitterEmail || "unknown@example.com",
      owner: 0,
      comments: localTicket.comments || [],
    };

    tickets.push(serverTicket);
    mergedCount++;
    console.log(`✓ Merged ticket: ${serverTicket.title} (ID: ${newId})`);
  }

  saveTickets(tickets);
  res.json({
    message: `Merged ${mergedCount} tickets`,
    merged: mergedCount,
    total: tickets.length,
  });
});

// ============ MASTERKEY ADMIN ENDPOINTS ============
// Middleware to check if user is masterkey
function authenticateAdmin(req, res, next) {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = sessions.get(token);
  if (user.role !== "masterkey") {
    return res.status(403).json({ message: "Admin access required" });
  }
  req.user = user;
  next();
}

// Get all tickets (masterkey only)
app.get("/api/admin/tickets", authenticateAdmin, (req, res) => {
  res.json(tickets);
});

// Get all users
app.get("/api/admin/users", authenticateAdmin, (req, res) => {
  const userList = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
  }));
  res.json(userList);
});

// Get user by ID
app.get("/api/admin/users/:userId", authenticateAdmin, (req, res) => {
  const userId = Number(req.params.userId);
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

// Update user
app.put("/api/admin/users/:userId", authenticateAdmin, (req, res) => {
  const userId = Number(req.params.userId);
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Prevent masterkey from being modified
  if (user.role === "masterkey") {
    return res.status(403).json({ message: "Cannot modify masterkey account" });
  }

  const { name, email, role, password } = req.body;

  if (name || email || role || password) {
    if (name) user.name = name;
    if (email && !users.some((u) => u.id !== userId && u.email === email)) {
      user.email = email;
    } else if (email) {
      return res.status(400).json({ message: "Email already exists" });
    }
    if (
      role &&
      ["accounting", "registrar", "faculty", "student"].includes(role)
    ) {
      user.role = role;
    }
    if (password) user.password = password;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

// Delete user
app.delete("/api/admin/users/:userId", authenticateAdmin, (req, res) => {
  const userId = Number(req.params.userId);
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = users[userIndex];

  // Prevent masterkey from being deleted
  if (user.role === "masterkey") {
    return res.status(403).json({ message: "Cannot delete masterkey account" });
  }

  users.splice(userIndex, 1);

  res.json({ message: "User deleted successfully" });
});

app.listen(port, () => {
  console.log(`Ticketing system API running at http://localhost:${port}`);
});
