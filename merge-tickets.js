/**
 * Automatic merge: Send localStorage tickets to server
 * Run this from browser console after logging in
 */

async function mergeTicketsAutomatically() {
  console.log("Starting automatic ticket merge...");

  // Get tickets from localStorage
  const localTickets = JSON.parse(localStorage.getItem("tickets") || "[]");

  if (localTickets.length === 0) {
    console.log("No tickets to merge.");
    return;
  }

  console.log(`Found ${localTickets.length} tickets in localStorage.`);
  console.log("Sending to server for merge...");

  try {
    const response = await fetch(
      "http://localhost:3000/api/tickets/merge/local",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ localTickets: localTickets }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Merge failed:", error.message);
      return;
    }

    const result = await response.json();
    console.log(`✓ Success! Merged ${result.merged} tickets.`);
    console.log(`Server now has ${result.total} total tickets.`);

    if (result.merged > 0) {
      console.log("\n📋 Tickets have been synced to the server!");
      console.log("Refreshing page...");
      setTimeout(() => location.reload(), 1500);
    }
  } catch (err) {
    console.error("❌ Error merging tickets:", err);
  }
}

// Show instructions
console.log("📌 To merge your localStorage tickets to the server:");
console.log("   Run: mergeTicketsAutomatically()");
