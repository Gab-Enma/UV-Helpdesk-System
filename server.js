const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// In-memory data store (mock persistence)
const users = [
  {
    id: 1,
    name: "Accounting Team",
    email: "accounting@uv.edu.ph",
    password: "accounting123",
    role: "accounting",
  },
  {
    id: 2,
    name: "Registrar Team",
    email: "registrar@uv.edu.ph",
    password: "registrar123",
    role: "registrar",
  },
  {
    id: 3,
    name: "Faculty Team",
    email: "faculty@uv.edu.ph",
    password: "faculty123",
    role: "faculty",
  },
];
let tickets = [];

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
  if (!["accounting", "registrar", "faculty"].includes(role)) {
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

app.post("/api/tickets", (req, res) => {
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
    submitterEmail: req.user ? req.user.email : "anonymous",
    comments: [],
  };
  tickets.push(ticket);
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

app.listen(port, () => {
  console.log(`Ticketing system API running at http://localhost:${port}`);
});
