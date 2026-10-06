import { serviceInfo } from '../../../shared/serviceInfo.cjs';

type Tone = 'info' | 'warning' | 'warningStrong' | 'danger';
type EmailContent = {
  badge: string;
  heading: string;
  paragraphs: string[];
  details?: { label: string; value: string }[];
  alert?: string;
  tone?: Tone;
  action?: { label: string; url: string };
  note?: string;
  contact?: boolean;
};

const palette = {
  info: { background: '#EAF7FF', border: '#B6E3FF', color: '#075E91' },
  warning: { background: '#FFF4E5', border: '#FFD8A3', color: '#8A4800' },
  warningStrong: { background: '#FFF0D9', border: '#FFB65A', color: '#804100' },
  danger: { background: '#FFF0EF', border: '#FFC6C1', color: '#A32319' },
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const multiline = (value: string) =>
  escapeHtml(value).replace(/\r?\n/g, '<br>');

/** All dynamic content is text. Only this module builds trusted HTML fragments. */
export function emailTemplate(content: EmailContent): {
  html: string;
  text: string;
} {
  const colors = palette[content.tone ?? 'info'];
  const paragraphs = content.paragraphs
    .map(
      (value) =>
        `<p style="margin:0 0 16px;color:#41465F;font-size:16px;line-height:1.65;overflow-wrap:anywhere;word-break:break-word;">${multiline(value)}</p>`,
    )
    .join('');
  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;background:#F8FAFD;border:1px solid #E3E7EF;border-radius:12px;margin:8px 0 24px;">${content.details.map((row) => `<tr><td style="padding:14px 18px;border-bottom:1px solid #E3E7EF;"><p style="margin:0 0 5px;font-size:12px;font-weight:bold;color:#6A7085;">${escapeHtml(row.label)}</p><p style="margin:0;font-size:16px;line-height:1.6;color:#000633;overflow-wrap:anywhere;word-break:break-word;">${multiline(row.value)}</p></td></tr>`).join('')}</table>`
    : '';
  const alert = content.alert
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;margin:0 0 24px;"><tr><td bgcolor="${colors.background}" style="padding:16px 18px;background:${colors.background};border:1px solid ${colors.border};border-left:4px solid ${colors.color};border-radius:8px;font-size:14px;line-height:1.65;color:${colors.color};">${multiline(content.alert)}</td></tr></table>`
    : '';
  const action = content.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 24px;"><tr><td align="center" bgcolor="#000633" style="background:#000633;border-radius:8px;"><a href="${escapeHtml(content.action.url)}" style="display:inline-block;padding:15px 24px;border:1px solid #000633;border-radius:8px;background:#000633;color:#FFFFFF;font-size:16px;font-weight:bold;line-height:1.3;text-align:center;text-decoration:none;">${escapeHtml(content.action.label)}</a></td></tr></table><p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6A7085;">Jika tombol tidak dapat digunakan, salin dan buka tautan berikut:</p><p style="margin:0 0 24px;font-size:12px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;"><a href="${escapeHtml(content.action.url)}" style="color:#2B3056;text-decoration:underline;">${escapeHtml(content.action.url)}</a></p>`
    : '';
  const origin = content.contact
    ? 'Pesan ini dikirim melalui formulir Kontak website Perpustakaan Kemenkum Riau. Gunakan tombol Balas pada email untuk membalas langsung kepada pengirim.'
    : 'Email ini dikirim otomatis oleh sistem Perpustakaan Kemenkum Riau. Jangan membalas email otomatis ini; untuk bantuan, hubungi kontak layanan di atas.';
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.heading)}</title></head><body style="margin:0;padding:0;background:#F5F6FA;color:#000633;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F6FA;">${escapeHtml(content.paragraphs[0] ?? content.heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F6FA" style="width:100%;background:#F5F6FA;table-layout:fixed;"><tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="620" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;table-layout:fixed;background:#FFFFFF;border:1px solid #E3E7EF;border-radius:16px;">
<tr><td bgcolor="#000633" style="padding:24px;background:#000633;border-radius:16px 16px 0 0;border-bottom:4px solid #FFD000;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="48" height="48" align="center" bgcolor="#2B3056" style="width:48px;height:48px;background:#2B3056;border-radius:10px;color:#FFD000;font-size:30px;line-height:48px;font-weight:bold;">P</td><td style="padding-left:14px;"><p style="margin:0 0 4px;color:#FFFFFF;font-size:19px;font-weight:bold;line-height:1.3;">Perpustakaan</p><p style="margin:0;color:#CED1E4;font-size:13px;line-height:1.4;">Kemenkum Riau</p></td></tr></table></td></tr>
<tr><td style="padding:30px 24px 24px;"><p style="margin:0 0 16px;"><span style="display:inline-block;padding:6px 10px;border-radius:6px;background:${colors.background};color:${colors.color};font-size:11px;font-weight:bold;letter-spacing:0.6px;line-height:1.4;">${escapeHtml(content.badge)}</span></p><h1 style="margin:0 0 18px;color:#000633;font-size:26px;line-height:1.3;overflow-wrap:anywhere;">${escapeHtml(content.heading)}</h1>${paragraphs}${details}${alert}${action}${content.note ? `<p style="margin:0;font-size:13px;line-height:1.65;color:#6A7085;">${multiline(content.note)}</p>` : ''}</td></tr>
<tr><td bgcolor="#F8FAFD" style="padding:24px;background:#F8FAFD;border-top:1px solid #E3E7EF;border-radius:0 0 16px 16px;"><p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#000633;">Butuh bantuan?</p><p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#6A7085;">Hubungi petugas perpustakaan melalui kontak layanan berikut.</p><p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#2B3056;">Perpustakaan Kemenkum Riau</p><p style="margin:0 0 12px;font-size:12px;line-height:1.7;color:#6A7085;">${escapeHtml(serviceInfo.address)}</p><p style="margin:0 0 18px;font-size:13px;line-height:1.8;"><a href="${escapeHtml(serviceInfo.phoneUrl)}" style="color:#2B3056;text-decoration:underline;">${escapeHtml(serviceInfo.phone)}</a><br><a href="mailto:${escapeHtml(serviceInfo.email)}" style="color:#2B3056;text-decoration:underline;">${escapeHtml(serviceInfo.email)}</a></p><p style="margin:0;font-size:11px;line-height:1.7;color:#74798D;">${escapeHtml(origin)}</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
  const text = [
    'Perpustakaan Kemenkum Riau',
    content.badge,
    content.heading,
    ...content.paragraphs,
    ...(content.details ?? []).map((row) => `${row.label}:\n${row.value}`),
    content.alert,
    content.action
      ? `${content.action.label}:\n${content.action.url}`
      : undefined,
    content.note,
    'Butuh bantuan? Hubungi petugas perpustakaan.',
    serviceInfo.address,
    serviceInfo.phone,
    serviceInfo.email,
    origin,
  ]
    .filter(Boolean)
    .join('\n\n');
  return { html, text };
}

export type LoanReminderDetails = {
  bookTitle: string;
  bookCode: string;
  dueAt: Date;
  milestone: number;
};

export function loanReminderTemplate(
  title: string,
  message: string,
  details: LoanReminderDetails | undefined,
  dashboardUrl: string | undefined,
) {
  const overdue = details ? details.milestone > 0 : /terlambat/i.test(title);
  const today = details ? details.milestone === 0 : /hari ini/i.test(title);
  return emailTemplate({
    badge: overdue
      ? 'PINJAMAN TERLAMBAT'
      : today
        ? 'PENGINGAT PINJAMAN'
        : 'H-1 JATUH TEMPO',
    heading: overdue
      ? 'Pinjaman Anda Telah Melewati Jatuh Tempo'
      : today
        ? 'Buku Anda Jatuh Tempo Hari Ini'
        : 'Buku Anda Jatuh Tempo Besok',
    paragraphs: [message],
    details: details
      ? [
          { label: 'Judul Buku', value: details.bookTitle },
          { label: 'Kode Buku', value: details.bookCode },
          {
            label: 'Tanggal Jatuh Tempo',
            value: new Intl.DateTimeFormat('id-ID', {
              timeZone: 'Asia/Jakarta',
              dateStyle: 'long',
            }).format(details.dueAt),
          },
          {
            label: 'Waktu',
            value: `${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(details.dueAt).replace('.', ':')} WIB`,
          },
        ]
      : undefined,
    tone: overdue ? 'danger' : today ? 'warningStrong' : 'warning',
    alert: overdue
      ? 'Mohon segera mengembalikan buku atau memeriksa informasi pinjaman Anda. Tidak ada denda uang.'
      : 'Mohon kembalikan buku tepat waktu atau periksa opsi perpanjangan pada Pinjaman Saya. Tidak ada denda uang.',
    action: dashboardUrl
      ? {
          label: overdue ? 'Buka Pinjaman Saya' : 'Lihat Pinjaman Saya',
          url: dashboardUrl,
        }
      : undefined,
    note: 'Tenggat terbaru dan informasi pinjaman tersedia pada Dashboard Anggota.',
  });
}
