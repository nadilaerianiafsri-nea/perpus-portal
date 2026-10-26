import { adminNotificationTarget } from '../shared/adminNotificationTarget.cjs';
import type { TransactionPeriodValue } from '../shared/transactionPeriod';
import { adminOperationsApiMessage, type AdminNotificationRow, type NotificationChannel } from './adminOperations';

export const ADMIN_NOTIFICATION_READ_EVENT = 'admin-notifications-read';
export function notificationStatusLabel(row: AdminNotificationRow) {
  if (row.channel === 'SYSTEM') return row.readAt ? 'Dibaca' : 'Belum Dibaca';
  return { TERKIRIM:'Terkirim', GAGAL:'Gagal', MENUNGGU:'Menunggu', MENGIRIM:'Mengirim', MANUAL:'Manual' }[row.status];
}
export function notificationChannelLabel(channel: AdminNotificationRow['channel']) {
  return {SYSTEM:'Sistem',EMAIL:'Email',WHATSAPP:'WhatsApp'}[channel];
}
export function notificationQuery({search,channel,page,limit,period}: {search:string;channel:NotificationChannel;page:number;limit:number;period:TransactionPeriodValue}) {
  const query = new URLSearchParams({channel,page:String(page),limit:String(limit)});
  if (search) query.set('search',search);
  if (period.preset !== 'all') { query.set('from',period.from);query.set('to',period.to); }
  return query;
}
export async function markAdminNotificationRead(id: number) {
  const response = await fetch(`/api/members/admin/operations/notifications/${id}/read`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'});
  if (!response.ok) throw new Error(await adminOperationsApiMessage(response,'Notifikasi belum dapat ditandai sebagai dibaca.'));
}
export async function markAllAdminNotificationsRead() {
  const response = await fetch('/api/members/admin/operations/notifications/read-all', {method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'});
  if (!response.ok) throw new Error(await adminOperationsApiMessage(response,'Notifikasi belum dapat ditandai semua sebagai dibaca.'));
}
export async function openAdminNotification(row: AdminNotificationRow, actions: {
  markRead:(id:number)=>Promise<void>;onRead:()=>void;navigate:(href:string)=>void;showContext:()=>void;
}) {
  if (row.channel === 'SYSTEM' && !row.readAt) {
    await actions.markRead(row.sourceNotificationId);
    actions.onRead();
  }
  const target = adminNotificationTarget(row);
  if (target) actions.navigate(target);
  else actions.showContext();
}
