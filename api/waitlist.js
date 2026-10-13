// POST /api/waitlist — saves a sign-up to Neon and sends the welcome email with Resend.
import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import { Resend } from "resend";
import { welcomeEmail } from "../lib/welcome-email.js";

const FROM = "Novastrum <support@nova-strum.app>";
const REPLY_TO = "support@nova-strum.app";
const SITE_URL = "https://www.nova-strum.app";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MARKETS = new Set(["forex", "gold", "crypto", "not-sure"]);
const EXPERIENCE = new Set(["new", "under-1", "1-3", "3-plus"]);
const BROKER = new Set(["mt5", "exchange", "none"]);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
attachDatabasePool(pool);
const resend = new Resend(process.env.RESEND_API_KEY);

const json = (status, body) => Response.json(body, { status });
const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }

  // Bots fill every field, including this one, which is hidden from people.
  if (clean(body.company, 100)) return json(200, { status: "joined" });

  const firstName = clean(body.first_name, 80);
  const email = clean(body.email, 254).toLowerCase();
  if (!firstName) return json(422, { error: "Add your first name." });
  if (!EMAIL_RE.test(email)) return json(422, { error: "Enter a full email address, like ada@example.com" });
  if (body.consent !== true) return json(422, { error: "Please tick the box to confirm you understand the risks." });

  const markets = Array.isArray(body.markets) ? [...new Set(body.markets.filter((m) => MARKETS.has(m)))] : [];
  const experience = EXPERIENCE.has(body.experience) ? body.experience : null;
  const broker = BROKER.has(body.broker) ? body.broker : null;

  let row;
  try {
    const { rows } = await pool.query(
      `INSERT INTO waitlist (email, first_name, country, whatsapp, markets, experience, broker, consent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT ((lower(email))) DO NOTHING
       RETURNING id`,
      [email, firstName, clean(body.country, 80) || null, clean(body.whatsapp, 32) || null, markets, experience, broker],
    );
    row = rows[0];
  } catch (err) {
    console.error("waitlist insert failed", err);
    return json(500, { error: "Something went wrong on our side. Please try again in a minute." });
  }

  // Already signed up: don't send another email, just tell them.
  if (!row) return json(200, { status: "exists" });

  const { subject, html, text } = welcomeEmail({ firstName, siteUrl: SITE_URL });
  const { error } = await resend.emails.send(
    { from: FROM, to: [email], replyTo: REPLY_TO, subject, html, text },
    { idempotencyKey: `waitlist-welcome/${row.id}` },
  );
  if (error) {
    // The sign-up is saved either way; welcome_sent_at stays empty so it can be resent later.
    console.error("welcome email failed", { id: row.id, error });
  } else {
    await pool.query("UPDATE waitlist SET welcome_sent_at = now() WHERE id = $1", [row.id]).catch((err) =>
      console.error("welcome_sent_at update failed", err),
    );
  }

  return json(200, { status: "joined" });
}
