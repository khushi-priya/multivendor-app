const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = env.smtp.user
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    })
  : null;

/**
 * Sends an email. Without SMTP credentials (development) the message is printed
 * to the console instead and { sent: false, dev: true } is returned.
 */
async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    if (!env.isProd && !env.isTest) {
      console.log(`\n[mail:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    }
    return { sent: false, dev: true };
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, text, html });
  return { sent: true };
}

module.exports = { sendMail };
