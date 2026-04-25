/**
 * Migration script: Move tickets from localStorage to server
 * Run this from browser console to sync existing tickets
 */

async function migrateTicketsToServer() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    console.error("Not authenticated. Please log in first.");
    return;
  }

  const localTickets = JSON.parse(localStorage.getItem("tickets") || "[]");
  if (localTickets.length === 0) {
    console.log("No tickets to migrate.");
    return;
  }

  console.log(`Migrating ${localTickets.length} tickets to server...`);

  let successCount = 0;
  for (const ticket of localTickets) {
    try {
      const response = await fetch("http://localhost:3000/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          category: ticket.category,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.warn(`Failed to migrate ticket "${ticket.title}":`, error);
        continue;
      }

      const serverTicket = await response.json();
      console.log(`✓ Migrated: ${ticket.title} (ID: ${serverTicket.id})`);
      successCount++;

      // Migrate comments if any
      if (ticket.comments && ticket.comments.length > 0) {
        for (const comment of ticket.comments) {
          try {
            await fetch(
              `http://localhost:3000/api/tickets/${serverTicket.id}/comments`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text: comment.text }),
              },
            );
          } catch (err) {
            console.warn(
              `Failed to migrate comment for ticket ${serverTicket.id}:`,
              err,
            );
          }
        }
      }
    } catch (err) {
      console.error(`Error migrating ticket "${ticket.title}":`, err);
    }
  }

  console.log(
    `\n✓ Migration complete: ${successCount}/${localTickets.length} tickets migrated.`,
  );
  console.log("Refreshing page...");
  setTimeout(() => location.reload(), 1000);
}

// Auto-run if tickets exist and user confirms
if (localStorage.getItem("tickets")) {
  const localTickets = JSON.parse(localStorage.getItem("tickets") || "[]");
  if (localTickets.length > 0) {
    console.log(`Found ${localTickets.length} tickets in localStorage.`);
    console.log("Run: migrateTicketsToServer() to sync them to the server.");
  }
}
