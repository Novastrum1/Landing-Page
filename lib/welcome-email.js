// Welcome email for new waitlist sign-ups. Plain inline styles so it renders in every client.
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const STEPS = [
  ["Invite email", "You get a link to create your account."],
  ["Paper trading", "Real prices, no money at risk. Learn how the bot thinks."],
  ["Live when you’re ready", "Connect your own broker. Live is always opt-in."],
];

export function welcomeEmail({ firstName, siteUrl }) {
  const name = firstName.trim();
  const subject = `You’re on the Novastrum waitlist, ${name}`;

  const text = [
    `Hi ${name},`,
    "",
    "You’re on the Novastrum waitlist. We’ll email you when your paper-trading invite is ready. Invites go out in small groups.",
    "",
    "What happens next",
    ...STEPS.map(([t, d], i) => `${i + 1}. ${t}: ${d}`),
    "",
    "Questions? Just reply to this email.",
    "",
    "The Novastrum team",
    siteUrl,
    "",
    "Trading forex and crypto carries real risk, including losing money. Novastrum does not give personal financial advice.",
  ].join("\n");

  const steps = STEPS.map(
    ([t, d], i) => `
      <tr>
        <td style="width:28px;padding:0 12px 14px 0;vertical-align:top;">
          <div style="width:24px;height:24px;border-radius:12px;background:#e8efff;color:#2f5fd0;font:13px/24px Arial,sans-serif;text-align:center;">${i + 1}</div>
        </td>
        <td style="padding:0 0 14px;vertical-align:top;font:15px/22px Arial,sans-serif;color:#1d2433;">
          <strong>${esc(t)}</strong><br /><span style="color:#4a5468;">${esc(d)}</span>
        </td>
      </tr>`,
  ).join("");

  const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dde2ec;border-radius:16px;">
          <tr>
            <td style="padding:32px 32px 8px;">
              <img src="${esc(siteUrl)}/logo.png" width="150" alt="Novastrum" style="display:block;border:0;width:150px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              <h1 style="margin:0 0 12px;font:500 26px/32px Arial,sans-serif;color:#0a0e17;">You’re on the list, ${esc(name)}.</h1>
              <p style="margin:0 0 24px;font:16px/25px Arial,sans-serif;color:#4a5468;">
                We’ll email you when your paper-trading invite is ready. Invites go out in small groups so we can listen properly.
              </p>
              <h2 style="margin:0 0 14px;font:600 16px/22px Arial,sans-serif;color:#0a0e17;">What happens next</h2>
              <table role="presentation" cellpadding="0" cellspacing="0">${steps}
              </table>
              <p style="margin:10px 0 28px;font:15px/22px Arial,sans-serif;color:#4a5468;">
                Questions? Just reply to this email.<br />The Novastrum team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #dde2ec;font:12px/18px Arial,sans-serif;color:#6b7488;">
              Trading forex and crypto carries real risk, including losing money. Risk limits and paper trading reduce that risk but do not remove it. Novastrum does not give personal financial advice.<br /><br />
              <a href="${esc(siteUrl)}" style="color:#2f5fd0;">nova-strum.app</a> · Barnawa, Kaduna
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
