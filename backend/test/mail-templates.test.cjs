const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const nodemailer = require('nodemailer');
const { MailService } = require('../dist/mail/mail.service.js');

// Keep rendering and delivery options real; replace only external SMTP I/O.
const original = nodemailer.createTransport;
const sent = [];
nodemailer.createTransport = () => ({
  sendMail: async options => { sent.push(options); return { accepted: [options.to] }; },
  close() {},
});
after(() => { nodemailer.createTransport = original; });
const config = {
  SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', MAIL_FROM: 'Library <sender@example.test>',
  CONTACT_RECIPIENT_EMAIL: 'recipient@example.test', FRONTEND_URL: 'https://library.example.test',
};
const mail = new MailService({ get: key => config[key] });

function complete(message) {
  assert.ok(message.html?.includes('role="presentation"'), 'structured HTML must reach SMTP');
  assert.ok(message.html.includes('Kemenkum Riau'));
  assert.ok(message.text.includes('0811-6904-422'), 'plaintext also provides support');
  assert.equal(message.from, 'Library <sender@example.test>');
  assert.doesNotMatch(message.html, /<script|<link|display:\s*(?:flex|grid)/i);
}

test('contact preserves configured recipient and Reply-To while escaping user content', async () => {
  const input = { name: '<script>alert(1)</script> & "Najwa"', email: 'najwa@example.test', message: 'Baris pertama\n<img src=x onerror=alert(1)> & pesan kedua' };
  assert.equal(await mail.sendContactEmail(input), true);
  const message = sent.at(-1);
  complete(message);
  assert.equal(message.to, 'recipient@example.test');
  assert.deepEqual(message.replyTo, { address: input.email, name: input.name });
  assert.ok(message.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.doesNotMatch(message.html, /<img/);
  assert.ok(message.html.includes('href="mailto:najwa%40example.test"'));
  assert.ok(message.text.includes(input.message));
  assert.ok(message.text.includes('Balas Pengirim'));
  assert.doesNotMatch(message.text, /jangan membalas/i);
});

test('verification and reset preserve action URLs and their existing expiry', async () => {
  const verification = 'https://library.example.test/verify-email?token=test-token&lang=id';
  await mail.sendVerificationEmail('member@example.test', verification);
  let message = sent.at(-1);
  complete(message);
  assert.ok(message.html.includes('href="https://library.example.test/verify-email?token=test-token&amp;lang=id"'));
  assert.ok(message.text.includes(verification));
  assert.ok(message.text.includes('24 jam'));
  const reset = 'https://library.example.test/reset-password?token=test-reset';
  await mail.sendPasswordResetEmail('member@example.test', reset);
  message = sent.at(-1);
  complete(message);
  assert.ok(message.html.includes(`href="${reset}"`));
  assert.ok(message.text.includes(reset));
  assert.ok(message.text.includes('1 jam'));
});

test('reminder variants render actual book/deadline and configured frontend CTA with Jakarta time', async () => {
  for (const [milestone, heading] of [[-1, 'Buku Anda Jatuh Tempo Besok'], [0, 'Buku Anda Jatuh Tempo Hari Ini'], [1, 'Pinjaman Anda Telah Melewati Jatuh Tempo'], [3, 'Pinjaman Anda Telah Melewati Jatuh Tempo']]) {
    await mail.sendMemberReminder('member@example.test', 'Pengingat', 'Pesan jadwal existing', { bookTitle: 'Buku <A> & B', bookCode: 'BK-123', dueAt: new Date('2026-10-07T02:32:00Z'), milestone });
    const message = sent.at(-1);
    complete(message);
    assert.ok(message.html.includes(heading));
    assert.ok(message.html.includes('Buku &lt;A&gt; &amp; B'));
    assert.ok(message.text.includes('7 Oktober 2026'));
    assert.ok(message.text.includes('09:32 WIB'));
    assert.ok(message.html.includes('href="https://library.example.test/dashboard/pinjaman"'));
    assert.ok(message.text.includes('Tidak ada denda uang.'));
    assert.ok(message.text.includes('Pesan jadwal existing'));
  }
});
