// Sends the welcome email to sign-ups that never got one (e.g. before the domain was verified).
// Run with: npm run waitlist:send-pending
import pg from "pg";
import { Resend } from "resend";
import { welcomeEmail } from "../lib/welcome-email.js";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
const resend = new Resend(process.env.RESEND_API_KEY);
await client.connect();

const { rows } = await client.query(
  "SELECT id, email, first_name FROM waitlist WHERE welcome_sent_at IS NULL ORDER BY id",
);
console.log(`${rows.length} sign-up(s) waiting for a welcome email`);

for (const row of rows) {
  const { subject, html, text } = welcomeEmail({ firstName: row.first_name, siteUrl: "https://www.nova-strum.app" });
  const { error } = await resend.emails.send(
    { from: "Novastrum <support@nova-strum.app>", to: [row.email], replyTo: "support@nova-strum.app", subject, html, text },
    // A separate key from the API's, so an earlier failed attempt isn't replayed.
    { idempotencyKey: `waitlist-welcome-pending/${row.id}` },
  );
  if (error) {
    console.error(`#${row.id} failed:`, error.message);
    if (error.statusCode === 403) break; // domain still unverified: no point trying the rest
    continue;
  }
  await client.query("UPDATE waitlist SET welcome_sent_at = now() WHERE id = $1", [row.id]);
  console.log(`#${row.id} sent`);
  await new Promise((r) => setTimeout(r, 600)); // stay under Resend's 2 requests/second
}

await client.end();
