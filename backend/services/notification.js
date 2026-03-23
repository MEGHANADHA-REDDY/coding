const User = require('../models/User');

let twilioClient = null;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  const twilio = require('twilio');
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  console.log('[WhatsApp] Twilio client initialized.');
} else {
  console.log('[WhatsApp] Twilio credentials not configured — messages will be logged only.');
}

function formatDateTime(date) {
  return new Date(date).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

function buildExamMessage(exam, studentName) {
  const sections = exam.sections || [];
  const totalMinutes = sections.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  let pattern = sections
    .map((s, i) => `  ${s.label || `Section ${i + 1}`}: ${s.type.toUpperCase()} — ${s.durationMinutes} min`)
    .join('\n');

  if (!pattern) pattern = '  Single section exam';

  const message =
    `Hello ${studentName},\n\n` +
    `A new exam has been created for you:\n\n` +
    `*${exam.title}*\n\n` +
    `Availability Window:\n` +
    `  Start: ${formatDateTime(exam.startTime)}\n` +
    `  End:   ${formatDateTime(exam.endTime)}\n\n` +
    `Total Duration: ${totalMinutes} minutes\n\n` +
    `Exam Pattern:\n${pattern}\n\n` +
    `Attempt it here: ${SITE_URL}/login\n\n` +
    `Good luck!`;

  return message;
}

async function sendWhatsApp(to, body) {
  const toNumber = to.replace(/\D/g, '');
  if (toNumber.length < 10) return { success: false, reason: 'Invalid number' };

  const whatsappTo = `whatsapp:+${toNumber.startsWith('91') ? toNumber : '91' + toNumber}`;

  if (!twilioClient) {
    console.log(`[WhatsApp] (DRY RUN) To: ${whatsappTo}\n${body}\n`);
    return { success: true, dryRun: true };
  }

  try {
    const msg = await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: whatsappTo,
      body,
    });
    console.log(`[WhatsApp] Sent to ${whatsappTo} — SID: ${msg.sid}`);
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error(`[WhatsApp] Failed to send to ${whatsappTo}:`, err.message);
    return { success: false, reason: err.message };
  }
}

const notifyStudentsOfExam = async (exam, studentIds) => {
  try {
    const students = await User.find({
      _id: { $in: studentIds },
      mobileNumber: { $ne: '' },
    }).select('name mobileNumber');

    if (students.length === 0) {
      console.log('[WhatsApp] No students with mobile numbers to notify.');
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const student of students) {
      const message = buildExamMessage(exam, student.name);
      const result = await sendWhatsApp(student.mobileNumber, message);
      if (result.success) sent++;
      else failed++;
    }

    console.log(`[WhatsApp] Notification complete: ${sent} sent, ${failed} failed out of ${students.length} students.`);
  } catch (error) {
    console.error('[WhatsApp] Error sending notifications:', error.message);
  }
};

module.exports = { notifyStudentsOfExam, sendWhatsApp, buildExamMessage };
