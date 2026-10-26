'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FiBell, FiCheck, FiChevronLeft, FiChevronRight, FiSearch } from 'react-icons/fi';
import AppSelect from '@/components/AppSelect';
import PeriodSelector from '@/components/PeriodSelector';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/Button';
import { createTransactionPeriod } from '@/shared/transactionPeriod';
import { plainTextMessage } from '../members/inputSecurity';
import { adminNotificationTarget } from '../shared/adminNotificationTarget.cjs';
import { adminOperationsApiMessage, formatAdminOperationDate, type AdminNotificationRow, type AdminNotificationsResponse, type NotificationChannel } from './adminOperations';
import { ADMIN_NOTIFICATION_READ_EVENT, markAdminNotificationRead, markAllAdminNotificationsRead, notificationChannelLabel, notificationQuery, notificationStatusLabel, openAdminNotification } from './adminNotifications';
import styles from './AdminNotifications.module.css';

type LoadState = {key:string;result:AdminNotificationsResponse|null;error:string};
function NotificationText({row}: {row:AdminNotificationRow}) {
  return <div className={styles.notificationText}><strong>{row.reminderType}</strong>{row.description || row.bookTitle ? <small>{row.description || row.bookTitle}</small> : null}</div>;
}
function Recipient({row}: {row:AdminNotificationRow}) {
  return <div className={styles.recipient}><strong>{row.memberName}</strong><small>{row.channel === 'WHATSAPP' ? row.memberWhatsapp || 'Nomor belum tersedia' : row.memberEmail}</small></div>;
}
function Channel({row}: {row:AdminNotificationRow}) {
  return <span className={`${styles.badge} ${styles[`channel${row.channel}`]}`}>{notificationChannelLabel(row.channel)}</span>;
}
function Status({row}: {row:AdminNotificationRow}) {
  const status = row.channel === 'SYSTEM' ? row.readAt ? 'READ' : 'UNREAD' : row.status;
  return <span className={`${styles.badge} ${styles[`status${status}`]}`}>{notificationStatusLabel(row)}</span>;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [searchInput,setSearchInput] = useState(''), [search,setSearch] = useState('');
  const [channel,setChannel] = useState<NotificationChannel>('ALL');
  const [period,setPeriod] = useState(()=>createTransactionPeriod('all'));
  const [page,setPage] = useState(1), [limit,setLimit] = useState(10), [revision,setRevision] = useState(0);
  const [state,setState] = useState<LoadState>({key:'',result:null,error:''});
  const [pending,setPending] = useState<string|null>(null), [feedback,setFeedback] = useState('');
  const [context,setContext] = useState<AdminNotificationRow|null>(null);
  const locked = useRef(false);
  const searchError = plainTextMessage(searchInput,100);
  const requestKey = `${notificationQuery({search,channel,page,limit,period})}|${revision}`;
  const loading = state.key !== requestKey || searchInput.trim() !== search || Boolean(searchError);
  const result = state.key === requestKey ? state.result : null;
  const error = state.key === requestKey ? state.error : '';
  const counts = state.result?.summaryCounts ?? state.result?.counts;
  const rows = result?.data ?? [];
  useEffect(()=>{
    if (searchError || searchInput.trim() === search) return;
    const timer = window.setTimeout(()=>{setSearch(searchInput.trim());setPage(1);},350);
    return ()=>clearTimeout(timer);
  },[searchInput,searchError,search]);
  useEffect(()=>{
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/members/admin/operations/notifications?${requestKey.split('|')[0]}`,{cache:'no-store',signal:controller.signal});
        if (!response.ok) throw new Error(await adminOperationsApiMessage(response,'Notifikasi belum dapat dimuat.'));
        const payload = await response.json() as AdminNotificationsResponse;
        if (!payload || !Array.isArray(payload.data) || !payload.counts || !payload.meta) throw new Error('Notifikasi belum dapat dimuat.');
        if (controller.signal.aborted) return;
        if (payload.meta.page !== page) {setPage(payload.meta.page);return;}
        setState({key:requestKey,result:payload,error:''});
      } catch (reason) {
        if (!controller.signal.aborted) setState({key:requestKey,result:null,error:reason instanceof Error ? reason.message : 'Notifikasi belum dapat dimuat.'});
      }
    }
    void load();return ()=>controller.abort();
  },[requestKey,page]);

  function readChanged() {
    window.dispatchEvent(new Event(ADMIN_NOTIFICATION_READ_EVENT));
    setRevision(value=>value+1);
  }
  async function open(row: AdminNotificationRow) {
    if (locked.current || loading) return;
    locked.current=true;setPending(row.id);setFeedback('');
    try {
      await openAdminNotification(row,{markRead:markAdminNotificationRead,onRead:readChanged,navigate:href=>router.push(href),showContext:()=>setContext(row)});
    } catch (reason) {setFeedback(reason instanceof Error ? reason.message : 'Notifikasi belum dapat dibuka. Silakan coba lagi.');}
    finally {locked.current=false;setPending(null);}
  }
  async function readAll() {
    if (locked.current || loading || !result?.capabilities?.markAllRead || !counts?.unread) return;
    locked.current=true;setPending('all');setFeedback('');
    try {await markAllAdminNotificationsRead();readChanged();}
    catch (reason) {setFeedback(reason instanceof Error ? reason.message : 'Notifikasi belum dapat ditandai semua sebagai dibaca.');}
    finally {locked.current=false;setPending(null);}
  }
  function keyOpen(event: KeyboardEvent<HTMLElement>, row: AdminNotificationRow) {
    if (event.target !== event.currentTarget || event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();void open(row);
  }
  function rowProps(row: AdminNotificationRow) {
    const target = adminNotificationTarget(row);
    return {tabIndex:0,role:target ? 'link' : 'button','aria-label':`${target ? 'Buka detail' : 'Lihat rincian'} ${row.reminderType} untuk ${row.memberName}${row.bookTitle ? `, ${row.bookTitle}` : ''}`,
      'aria-busy':pending === row.id,'aria-disabled':pending !== null,onClick:()=>void open(row),onKeyDown:(event:KeyboardEvent<HTMLElement>)=>keyOpen(event,row)};
  }
  const tabs: Array<[NotificationChannel,string,number|undefined]> = [
    ['ALL','Semua',counts?.all],['UNREAD','Belum Dibaca',counts?.unread],['SYSTEM','Sistem',counts ? counts.system ?? counts.all-counts.email-counts.whatsapp : undefined],['EMAIL','Email',counts?.email],['WHATSAPP','WhatsApp',counts?.whatsapp],
  ];
  const empty = channel === 'UNREAD' ? 'Tidak ada notifikasi yang belum dibaca.' : channel === 'EMAIL' ? 'Belum ada riwayat email.' : channel === 'WHATSAPP' ? 'Belum ada riwayat WhatsApp.' : 'Belum ada notifikasi.';
  const filtered = Boolean(search) || period.preset !== 'all';
  return <div className={styles.page}>
    <header className={styles.pageHeading}><h1 data-page-title>Notifikasi</h1></header>
    <section className={styles.controls} aria-label="Filter notifikasi">
      <div className={styles.toolbar}>
        <label className={styles.searchBox}><FiSearch aria-hidden="true" /><input type="search" aria-label="Cari notifikasi" placeholder="Cari notifikasi, anggota, buku, atau transaksi..." maxLength={100} value={searchInput} aria-invalid={Boolean(searchError)} aria-describedby={searchError ? 'notification-search-error' : undefined} onChange={event=>setSearchInput(event.target.value)} /></label>
        <div className={styles.period}><PeriodSelector mode="transaction" label="Waktu notifikasi" value={period} onChange={value=>{setPeriod(value);setPage(1);}} /></div>
      </div>
      {searchError ? <p className={styles.feedback} role="alert" id="notification-search-error">{searchError}</p> : null}
      <div className={styles.categoryBar}>
        <div className={styles.tabs} role="group" aria-label="Kategori notifikasi">{tabs.map(([value,label,count])=><Button key={value} className={styles.categoryChip} variant={channel===value?'primary':'secondary'} aria-pressed={channel===value} data-notification-filter={value} onClick={()=>{setChannel(value);setPage(1);setFeedback('');}}>{label}<span className={styles.count}>{count ?? '—'}</span></Button>)}</div>
        {state.result?.capabilities?.markAllRead ? <Button className={styles.markAll} variant="secondary" icon={<FiCheck />} disabled={loading || Boolean(pending) || !counts?.unread} loading={pending==='all'} onClick={()=>void readAll()}>Tandai Semua Dibaca</Button> : null}
      </div>
    </section>
    {feedback ? <p className={styles.feedback} role="alert">{feedback}</p> : null}
    <section className={styles.list} aria-label="Daftar notifikasi" aria-busy={loading || Boolean(pending)}>
      {error ? <div className={styles.state} role="alert"><h2>Notifikasi belum dapat dimuat.</h2><p>{error}</p><Button variant="secondary" onClick={()=>setRevision(value=>value+1)}>Coba Lagi</Button></div>
        : loading ? <div className={styles.state} role="status">Memuat notifikasi...</div>
          : !rows.length ? <div className={styles.state} role="status"><FiBell aria-hidden="true" /><h2>{filtered ? 'Tidak ada notifikasi yang sesuai dengan pencarian atau filter.' : empty}</h2></div>
            : <>
              <div className={styles.tableScroller}><table data-record-list className={styles.table}><thead><tr><th scope="col">NOTIFIKASI</th><th scope="col">PENERIMA / KONTEKS</th><th scope="col">KANAL</th><th scope="col">STATUS</th><th scope="col">WAKTU</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} data-notification-id={row.id} className={row.channel==='SYSTEM'&&!row.readAt?styles.unread:undefined} {...rowProps(row)}>
                <td><NotificationText row={row} /></td><td><Recipient row={row} /></td><td><Channel row={row} /></td><td><Status row={row} /></td><td><time dateTime={row.time}>{formatAdminOperationDate(row.time)}</time></td>
              </tr>)}</tbody></table></div>
              <div className={styles.mobileList}>{rows.map(row=><article data-record-card key={row.id} data-notification-id={row.id} className={`${styles.mobileCard} ${row.channel==='SYSTEM'&&!row.readAt?styles.unread:''}`} {...rowProps(row)}><NotificationText row={row} /><Recipient row={row} /><div className={styles.badges}><Channel row={row} /><Status row={row} /></div><time dateTime={row.time}>{formatAdminOperationDate(row.time)}</time></article>)}</div>
            </>}
      {!loading&&!error&&result&&result.meta.total>0?<footer className={styles.footer}><span>Menampilkan {(result.meta.page-1)*result.meta.limit+1}–{Math.min(result.meta.page*result.meta.limit,result.meta.total)} dari {result.meta.total} notifikasi</span><div className={styles.pagination}>
        <AppSelect aria-label="Jumlah notifikasi per halaman" value={String(limit)} onChange={event=>{setLimit(Number(event.target.value));setPage(1);}}><option value="10">10 / halaman</option><option value="20">20 / halaman</option><option value="50">50 / halaman</option></AppSelect>
        <Button size="sm" variant="secondary" aria-label="Halaman sebelumnya" disabled={Boolean(pending)||page<=1} onClick={()=>setPage(value=>value-1)} icon={<FiChevronLeft />} />
        <span>{result.meta.page} / {result.meta.totalPages}</span>
        <Button size="sm" variant="secondary" aria-label="Halaman berikutnya" disabled={Boolean(pending)||page>=result.meta.totalPages} onClick={()=>setPage(value=>value+1)} icon={<FiChevronRight />} />
      </div></footer>:null}
    </section>
    <ConfirmDialog open={Boolean(context)} title={context?.reminderType??'Rincian notifikasi'} description={context?.description || context?.bookTitle || 'Rincian pengiriman notifikasi.'} variant="info" onCancel={()=>setContext(null)}>
      {context?<dl className={styles.context}><div><dt>Penerima</dt><dd>{context.memberName}</dd></div><div><dt>Kanal</dt><dd>{notificationChannelLabel(context.channel)}</dd></div><div><dt>Status</dt><dd>{notificationStatusLabel(context)}</dd></div><div><dt>Waktu</dt><dd>{formatAdminOperationDate(context.time)}</dd></div></dl>:null}
    </ConfirmDialog>
  </div>;
}
