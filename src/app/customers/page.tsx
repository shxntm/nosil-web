'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { fetchUserMap, getDisplayName, UserMap } from '@/lib/customerName';
import { getSession } from '@/lib/auth';
import { TREATMENTS, CATEGORIES } from '@/data/treatments';
import ConfirmDialog from '@/components/ConfirmDialog';

type Customer = { uid: string; updated_at: string | null; memo: string | null };
type TreatmentPlan = { id: string; title: string; start_date: string; schedule: { name: string; date: string; status?: string }[]; doctor_id?: number | null; doctor_name?: string | null; hospital_name?: string | null; };
type ScheduleEvent = { name: string; date: string };

const TIME_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const h = Math.floor(i / 2) + 9;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function countsFromSchedule(schedule: ScheduleEvent[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of schedule) map[s.name] = (map[s.name] || 0) + 1;
  return map;
}

function MiniCalendar({ year, month, events, selectedDate, onSelectDate, onPrev, onNext }: {
  year: number; month: number; events: ScheduleEvent[];
  selectedDate: Date | null; onSelectDate: (d: Date) => void; onPrev: () => void; onNext: () => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const today = new Date();
  function getCount(day: number) {
    const d = new Date(year, month, day);
    return events.filter(e => isSameDay(new Date(e.date), d)).length;
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={onPrev} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #eaecf2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1d27' }}>{year}년 {month + 1}월</span>
        <button onClick={onNext} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #eaecf2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', color: '#b0b8cc', fontWeight: 500 }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const d = new Date(year, month, day);
          const isToday = isSameDay(d, today);
          const isSel = selectedDate ? isSameDay(d, selectedDate) : false;
          const count = getCount(day);
          return (
            <button key={idx} onClick={() => onSelectDate(d)}
              style={{ aspectRatio: '1', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: isSel ? '#1a1d27' : isToday ? '#f0f0ff' : 'transparent', color: isSel ? '#fff' : isToday ? '#6366f1' : '#4a5568', fontSize: '0.7rem', fontWeight: isSel || isToday ? 600 : 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              {day}
              {count > 0 && (
                <div style={{ display: 'flex', gap: 1 }}>
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: isSel ? '#fff' : '#6366f1' }} />)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
type DailyPhoto = { id: number; uid: string; photo_url: string; created_at: string };

const CARD = { background: '#ffffff', border: '1px solid #eaecf2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
const INPUT = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fff', fontSize: '0.82rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit' } as const;


function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '0.65rem', color: '#b0b8cc', letterSpacing: '0.15em', fontWeight: 500, marginBottom: 10 }}>{children}</p>;
}

function Empty({ text }: { text: string }) {
  return <p style={{ fontSize: '0.8rem', color: '#c8cdd8', textAlign: 'center', padding: '24px 0' }}>{text}</p>;
}

function getHospitalId(): number | null {
  return getSession()?.hospitalId ?? null;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userMap, setUserMap] = useState<UserMap>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [photos, setPhotos] = useState<DailyPhoto[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showCareModal, setShowCareModal] = useState(false);
  const [careItems, setCareItems] = useState<{ taskId: string; dateKey: string; taskText: string; taskIcon: string }[]>([]);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  // 메모
  const [memo, setMemo] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const memoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; description?: string; onConfirm: () => void } | null>(null);

  // 고객 등록 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; nickname: string }[]>([]);
  const [addSearch, setAddSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  // 시술 등록 모달 (달력 기반)
  const [showTxModal, setShowTxModal] = useState(false);
  const [txEvents, setTxEvents] = useState<ScheduleEvent[]>([]);
  const [txPlanTitle, setTxPlanTitle] = useState('');
  const [txCalYear, setTxCalYear] = useState(new Date().getFullYear());
  const [txCalMonth, setTxCalMonth] = useState(new Date().getMonth());
  const [txSelectedDate, setTxSelectedDate] = useState<Date | null>(null);
  const [txSaving, setTxSaving] = useState(false);
  // add-event 서브모달
  const [showTxAddModal, setShowTxAddModal] = useState(false);
  const [txAddTime, setTxAddTime] = useState('10:00');

  const [txAddSearch, setTxAddSearch] = useState('');
  const [txAddCategory, setTxAddCategory] = useState('');
  const [txAddCart, setTxAddCart] = useState<{ name: string; count: number }[]>([]);

  async function loadCustomers() {
    const hospitalId = getHospitalId();
    const map = await fetchUserMap();

    const customerQuery = hospitalId
      ? supabase.from('hospital_customers').select('uid, memo').eq('hospital_id', hospitalId)
      : supabase.from('hospital_customers').select('uid, memo');

    const [{ data: rows }, { data: appRows }] = await Promise.all([
      customerQuery,
      hospitalId
        ? supabase.from('user_hospitals').select('uid').eq('hospital_id', hospitalId)
        : Promise.resolve({ data: [] }),
    ]);

    const allUids = Array.from(new Set([
      ...(rows ?? []).map((r: any) => r.uid),
      ...(appRows ?? []).map((r: any) => r.uid),
    ]));
    const memoMap: Record<string, string | null> = {};
    (rows ?? []).forEach((r: any) => { memoMap[r.uid] = r.memo; });

    if (allUids.length === 0) {
      setCustomers([]);
      setUserMap(map);
      setLoading(false);
      return;
    }

    const merged: Customer[] = allUids.map(uid => ({
      uid,
      updated_at: null,
      memo: memoMap[uid] ?? null,
    }));

    setCustomers(merged);
    setUserMap(map);
    setLoading(false);
  }

  useEffect(() => { loadCustomers(); }, []);

  useEffect(() => {
    if (!selected) return;
    setDetailLoading(true);
    const c = customers.find(c => c.uid === selected);
    setMemo(c?.memo ?? '');
    Promise.all([
      supabase.from('treatment_records').select('*, hospitals(name)').eq('uid', selected).order('created_at', { ascending: false }),
      supabase.from('analysis_records').select('id, uid, photo_url, created_at').eq('uid', selected).order('created_at', { ascending: false }).limit(30),
      supabase.from('daily_completed').select('task_id, date_key').eq('uid', selected).order('date_key', { ascending: false }),
      supabase.from('daily_custom_tasks').select('task_id, task_text, task_icon').eq('uid', selected),
    ]).then(([{ data: t }, { data: p }, { data: completed }, { data: customTasks }]) => {
      setPlans((t ?? []).map((p: any) => ({ ...p, hospital_name: p.hospitals?.name ?? null })));
      setPhotos(p ?? []);
      const taskMap: Record<string, { text: string; icon: string }> = {};
      (customTasks ?? []).forEach((t: any) => { taskMap[t.task_id] = { text: t.task_text, icon: t.task_icon }; });
      setCareItems((completed ?? []).map((c: any) => ({
        taskId: c.task_id,
        dateKey: c.date_key,
        taskText: taskMap[c.task_id]?.text ?? '케어 완료',
        taskIcon: taskMap[c.task_id]?.icon ?? '✅',
      })));
      setDetailLoading(false);
    });
  }, [selected]);

  async function saveMemo(uid: string, value: string) {
    const hospitalId = getHospitalId();
    if (!hospitalId) return;
    setMemoSaving(true);
    await supabase.from('hospital_customers').update({ memo: value || null }).eq('hospital_id', hospitalId).eq('uid', uid);
    setCustomers(prev => prev.map(c => c.uid === uid ? { ...c, memo: value || null } : c));
    setMemoSaving(false);
    setMemoSaved(true);
    setTimeout(() => setMemoSaved(false), 2000);
  }

  function handleMemoChange(val: string) {
    setMemo(val);
    if (memoTimer.current) clearTimeout(memoTimer.current);
    memoTimer.current = setTimeout(() => { if (selected) saveMemo(selected, val); }, 1000);
  }

  async function openAddModal() {
    setShowAddModal(true);
    setAddSearch('');
    const { data } = await supabase.from('users').select('id, nickname').order('nickname');
    setAllUsers(data ?? []);
  }

  async function addCustomer(uid: string) {
    const hospitalId = getHospitalId();
    if (!hospitalId) { setConfirmDialog({ title: '병원 미선택', description: '설정에서 병원을 먼저 선택해주세요.', onConfirm: () => setConfirmDialog(null) }); return; }
    setAdding(uid);
    await supabase.from('hospital_customers').upsert({ hospital_id: hospitalId, uid }, { onConflict: 'hospital_id,uid' });
    setAdding(null);
    await loadCustomers();
  }

  function removeCustomer(uid: string) {
    setConfirmDialog({
      title: '고객 제거',
      description: `${getDisplayName(uid, userMap)}님을 고객 목록에서 제거하시겠습니까?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        const hospitalId = getHospitalId();
        if (hospitalId) await supabase.from('hospital_customers').delete().eq('hospital_id', hospitalId).eq('uid', uid);
        if (selected === uid) setSelected(null);
        await loadCustomers();
      },
    });
  }

  function openCareModal() {
    setShowCareModal(true);
  }

  function openTxModal() {
    const now = new Date();
    setTxEvents([]); setTxPlanTitle('');
    setTxCalYear(now.getFullYear()); setTxCalMonth(now.getMonth());
    setTxSelectedDate(null);
    setShowTxModal(true);
  }

  function handleTxSelectDate(d: Date) {
    setTxSelectedDate(d);
    setTxAddTime('10:00'); setTxAddSearch(''); setTxAddCategory(''); setTxAddCart([]);
    setShowTxAddModal(true);
  }

  function confirmTxAddEvent() {
    if (txAddCart.length === 0 || !txSelectedDate) return;
    const dateStr = txSelectedDate.toISOString().slice(0, 10);
    const iso = new Date(`${dateStr}T${txAddTime}:00`).toISOString();
    const newEvents = txAddCart.flatMap(item => Array.from({ length: item.count }, () => ({ name: item.name, date: iso })));
    setTxEvents(prev => [...prev, ...newEvents]);
    setShowTxAddModal(false);
  }

  function toggleTxCartItem(name: string) {
    setTxAddCart(prev => {
      const existing = prev.find(i => i.name === name);
      if (existing) return prev.filter(i => i.name !== name);
      return [...prev, { name, count: 1 }];
    });
  }

  function setTxCartCount(name: string, delta: number) {
    setTxAddCart(prev => prev.map(i => i.name === name ? { ...i, count: Math.max(1, Math.min(10, i.count + delta)) } : i));
  }

  async function handleTxSave() {
    if (!selected || txEvents.length === 0) return;
    setTxSaving(true);
    const session = getSession();
    const hospitalId = session?.hospitalId ?? null;
    const hospitalName = session?.name ?? '병원';
    const sorted = [...txEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = sorted[0].date.slice(0, 10);
    const names = [...new Set(sorted.map(e => e.name))];
    const title = txPlanTitle.trim() || `${names.slice(0, 2).join(', ')} 스케줄`;
    const { error } = await supabase.from('treatment_records').insert({
      uid: selected,
      title,
      step: 'calendar',
      start_date: startDate,
      schedule: sorted,
      past_treatments: [],
      hospital_id: hospitalId,
    });
    if (!error) {
      for (const s of sorted) {
        const dateKey = s.date.split('T')[0];
        await supabase.from('daily_custom_tasks').upsert({
          uid: selected,
          date_key: dateKey,
          task_time: 'morning',
          task_text: `${s.name} 시술 예정`,
          task_icon: '💉',
          task_id: `treatment-${Date.now()}-${dateKey}-${s.name}`,
        }, { onConflict: 'uid,task_id' });
      }
      const { data: t } = await supabase.from('treatment_records').select('*').eq('uid', selected).order('created_at', { ascending: false });
      setPlans(t ?? []);
      setShowTxModal(false);
    }
    setTxSaving(false);
  }

  const registeredUids = new Set(customers.map(c => c.uid));
  const filteredAddUsers = allUsers.filter(u =>
    !registeredUids.has(u.id) &&
    (!addSearch || u.nickname?.toLowerCase().includes(addSearch.toLowerCase()) || u.id.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const filtered = customers.filter(c => {
    if (!search) return true;
    const name = getDisplayName(c.uid, userMap).toLowerCase();
    return name.includes(search.toLowerCase()) || c.uid.toLowerCase().includes(search.toLowerCase());
  });

  const selectedCustomer = customers.find(c => c.uid === selected);

  return (
    <div>
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            style={{
              position: 'absolute', top: 18, right: 22,
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', fontSize: '1rem',
            }}
          >✕</button>
          <img
            src={lightboxUrl}
            alt="확대 이미지"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: 12,
              boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
              cursor: 'default',
            }}
          />
        </div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7"
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>CUSTOMERS</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>고객 관리</h1>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openAddModal}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#1a1d27', color: '#fff', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit' }}>
          + 고객 등록
        </motion.button>
      </motion.div>

      <div className="flex gap-5">
        {/* Left: customer list */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}
          style={{ width: 270, flexShrink: 0 }}>
          <div style={CARD}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #eaecf2' }}>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#b0b8cc' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input type="text" placeholder="이름 검색" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ ...INPUT, paddingLeft: 30, fontSize: '0.78rem' }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
              </div>
            </div>
            <div style={{ maxHeight: 580, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center', gap: 4 }}>
                  {[0, 0.12, 0.24].map((d, i) => (
                    <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <Empty text="고객이 없습니다" />
              ) : filtered.map((c, i) => {
                return (
                  <motion.div key={c.uid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid #f5f6fa', position: 'relative' }}>
                    <button onClick={() => setSelected(c.uid)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 36px 10px 16px',
                        cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                        background: selected === c.uid ? '#f0f0ff' : 'transparent',
                        borderLeft: selected === c.uid ? '3px solid #6366f1' : '3px solid transparent',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { if (selected !== c.uid) (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; }}
                      onMouseLeave={e => { if (selected !== c.uid) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: '0.78rem', fontWeight: 500, color: selected === c.uid ? '#6366f1' : '#1a1d27' }}>
                          {getDisplayName(c.uid, userMap)}
                        </p>
                      </div>
                    </button>
                    <button onClick={e => { e.stopPropagation(); removeCustomer(c.uid); }} title="고객 제거"
                      style={{ position: 'absolute', right: 8, top: 10, width: 20, height: 20, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f8f9fc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8cdd8', fontSize: '0.6rem' }}>
                      ✕
                    </button>
                  </motion.div>
                );
              })}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #eaecf2' }}>
              <p style={{ fontSize: '0.7rem', color: '#b0b8cc' }}>총 {customers.length}명</p>
            </div>
          </div>
        </motion.div>

        {/* Right: detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            {!selected ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ ...CARD, padding: '60px 0', textAlign: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
                  <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                </svg>
                <p style={{ fontSize: '0.85rem', color: '#c8cdd8' }}>고객을 선택해주세요</p>
              </motion.div>
            ) : (
              <motion.div key={selected} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {/* Header card */}
                <div style={{ ...CARD, padding: '16px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Label>고객</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontSize: '0.95rem', color: '#1a1d27', fontWeight: 600 }}>{getDisplayName(selected, userMap)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { label: '시술 플랜', value: plans.length, color: '#6366f1', bg: '#f0f0ff', onClick: () => document.getElementById('tx-plans-section')?.scrollIntoView({ behavior: 'smooth' }) },
                      { label: '케어 완료', value: new Set(careItems.map(i => i.dateKey)).size, color: '#0ea5e9', bg: '#f0f9ff', onClick: openCareModal },
                      { label: '피부 사진', value: photos.length, color: '#10b981', bg: '#f0fdf8', onClick: () => setShowPhotoGallery(true) },
                    ].map(s => (
                      <button key={s.label} onClick={s.onClick}
                        style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 10, background: s.bg, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{detailLoading ? '-' : s.value}</p>
                        <p style={{ fontSize: '0.65rem', color: s.color, opacity: 0.7, marginTop: 3 }}>{s.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {detailLoading ? (
                  <div style={{ ...CARD, padding: '40px 0', display: 'flex', justifyContent: 'center', gap: 5 }}>
                    {[0, 0.12, 0.24].map((d, i) => (
                      <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Memo */}
                    <div style={CARD}>
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f5f6fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><Label>MEMO</Label><h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>특이사항 메모</h3></div>
                        <AnimatePresence>
                          {(memoSaving || memoSaved) && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              style={{ fontSize: '0.68rem', color: memoSaved ? '#10b981' : '#b0b8cc' }}>
                              {memoSaved ? '✓ 저장됨' : '저장 중...'}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <div style={{ padding: '14px 20px' }}>
                        <textarea value={memo} onChange={e => handleMemoChange(e.target.value)}
                          placeholder="알레르기, 주의사항, 특이 반응 등 메모..."
                          rows={4}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fafafa', fontSize: '0.82rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, transition: 'border-color 0.15s' }}
                          onFocus={e => (e.target.style.borderColor = '#6366f1')}
                          onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
                      </div>
                    </div>

                    {/* Treatment plans */}
                    <div id="tx-plans-section" style={CARD}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div><Label>TREATMENT PLANS</Label><h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>시술 스케줄</h3></div>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openTxModal}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, background: '#1a1d27', color: '#fff', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                          시술 등록
                        </motion.button>
                      </div>
                      <div style={{ padding: '12px 20px' }}>
                        {plans.length === 0 ? <Empty text="시술 플랜이 없습니다" /> : plans.map(p => {
                          const total = (p.schedule ?? []).length;
                          const done = (p.schedule ?? []).filter(s => new Date(s.date) < new Date()).length;
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: '#f8f9fc', border: '1px solid #eaecf2', marginBottom: 6 }}>
                              <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1a1d27' }}>{p.title}</p>
                                <p style={{ fontSize: '0.72rem', color: '#b0b8cc', marginTop: 2 }}>시작일 {p.start_date} · 총 {total}회</p>
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <div style={{ width: 80, height: 4, borderRadius: 2, background: '#eaecf2', overflow: 'hidden' }}>
                                  <div style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, height: '100%', background: '#6366f1', borderRadius: 2 }} />
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#8892a4' }}>{done}/{total}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Photos */}
                    <div style={CARD}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f5f6fa' }}>
                        <Label>SKIN PHOTOS</Label>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>피부 사진</h3>
                      </div>
                      <div style={{ padding: '12px 20px' }}>
                        {photos.length === 0 ? <Empty text="피부 사진이 없습니다" /> : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                            {photos.map((p, i) => (
                              <button key={i} onClick={() => setLightboxUrl(p.photo_url)}
                                style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid #eaecf2', cursor: 'zoom-in', padding: 0, position: 'relative' }}>
                                <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.15s' }}
                                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
                                <p style={{ position: 'absolute', bottom: 4, left: 0, right: 0, fontSize: '0.55rem', color: '#fff', textAlign: 'center' }}>{new Date(p.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add customer modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 440 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 2 }}>REGISTER</p>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>고객 등록</h2>
                </div>
                <button onClick={() => setShowAddModal(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f8f9fc', cursor: 'pointer', color: '#8892a4', fontSize: '0.9rem' }}>✕</button>
              </div>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecf2' }}>
                <input type="text" placeholder="이름 또는 ID 검색" value={addSearch} onChange={e => setAddSearch(e.target.value)}
                  autoFocus style={{ ...INPUT }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {filteredAddUsers.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#c8cdd8', textAlign: 'center', padding: '32px 0' }}>
                    {allUsers.length === 0 ? '앱 가입 유저가 없습니다' : '검색 결과가 없습니다'}
                  </p>
                ) : filteredAddUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #f5f6fa' }}>
                    <div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1a1d27' }}>{u.nickname || '이름없음'}</p>
                      <p style={{ fontSize: '0.68rem', color: '#b0b8cc', fontFamily: 'monospace' }}>{u.id}</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      disabled={adding === u.id}
                      onClick={() => addCustomer(u.id)}
                      style={{
                        padding: '5px 14px', borderRadius: 7, border: 'none', cursor: adding === u.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                        background: adding === u.id ? '#d1d5e0' : '#1a1d27', color: '#fff', fontSize: '0.75rem', fontWeight: 500,
                      }}>
                      {adding === u.id ? '등록 중' : '등록'}
                    </motion.button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Treatment registration modal - calendar based */}
      <AnimatePresence>
        {showTxModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTxModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 680 }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 2 }}>NEW SCHEDULE</p>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>시술 등록 — {getDisplayName(selected!, userMap)}</h2>
                </div>
                <button onClick={() => setShowTxModal(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f8f9fc', cursor: 'pointer', color: '#8892a4', fontSize: '0.9rem' }}>✕</button>
              </div>
              {/* Title input */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecf2' }}>
                <input value={txPlanTitle} onChange={e => setTxPlanTitle(e.target.value)} placeholder="스케줄 제목 (비워두면 자동생성)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fff', fontSize: '0.85rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
              </div>
              {/* Calendar + event list */}
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 0 }}>
                <div style={{ padding: 16, borderRight: '1px solid #eaecf2', background: '#fafafa' }}>
                  <MiniCalendar
                    year={txCalYear} month={txCalMonth} events={txEvents}
                    selectedDate={txSelectedDate}
                    onSelectDate={handleTxSelectDate}
                    onPrev={() => { if (txCalMonth === 0) { setTxCalYear(y => y - 1); setTxCalMonth(11); } else setTxCalMonth(m => m - 1); }}
                    onNext={() => { if (txCalMonth === 11) { setTxCalYear(y => y + 1); setTxCalMonth(0); } else setTxCalMonth(m => m + 1); }}
                  />
                  <p style={{ fontSize: '0.65rem', color: '#b0b8cc', marginTop: 8, textAlign: 'center' }}>날짜 클릭 → 시술 추가</p>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1a1d27' }}>일정 <span style={{ color: '#6366f1' }}>{txEvents.length}개</span></p>
                    {txEvents.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {Object.entries(countsFromSchedule(txEvents)).map(([name, cnt]) => (
                          <span key={name} style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1' }}>{name} {cnt}회</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {txEvents.length === 0 ? (
                    <div style={{ padding: '28px 0', textAlign: 'center', color: '#c8cdd8', fontSize: '0.78rem', border: '1.5px dashed #eaecf2', borderRadius: 10 }}>왼쪽 달력에서 날짜를 선택하세요</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 220, overflowY: 'auto' }}>
                      {[...txEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((e, i) => {
                        const d = new Date(e.date);
                        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                        const origIdx = txEvents.indexOf(e);
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: '#f8f9fc', border: '1px solid #eaecf2' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.7rem', color: '#8892a4', width: 36, flexShrink: 0 }}>{dateStr}</span>
                            <span style={{ fontSize: '0.7rem', color: '#b0b8cc', width: 34, flexShrink: 0 }}>{timeStr}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#1a1d27', flex: 1 }}>{e.name}</span>
                            <button onClick={() => setTxEvents(prev => prev.filter((_, idx) => idx !== origIdx))} style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #eaecf2', background: '#fff', cursor: 'pointer', color: '#f43f5e', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #eaecf2', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setShowTxModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #eaecf2', background: '#f8f9fc', color: '#4a5568', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                <motion.button onClick={handleTxSave} disabled={txSaving || txEvents.length === 0} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: txEvents.length > 0 ? '#1a1d27' : '#d1d5e0', color: '#fff', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit', cursor: txEvents.length > 0 ? 'pointer' : 'not-allowed' }}>
                  {txSaving ? '저장 중...' : '스케줄 저장'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add event sub-modal */}
      <AnimatePresence>
        {showTxAddModal && txSelectedDate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowTxAddModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 24 }}>
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 420 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>
                  {txSelectedDate.getMonth() + 1}월 {txSelectedDate.getDate()}일 시술 추가
                </h3>
                <button onClick={() => setShowTxAddModal(false)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f8f9fc', cursor: 'pointer', color: '#8892a4', fontSize: '0.85rem' }}>✕</button>
              </div>
              {/* Time slots */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #eaecf2' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 500, color: '#4a5568', marginBottom: 8 }}>시술 시간</p>
                <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
                  {TIME_SLOTS.map(t => (
                    <button key={t} onClick={() => setTxAddTime(t)}
                      style={{ padding: '4px 9px', borderRadius: 20, border: `1.5px solid ${txAddTime === t ? '#6366f1' : '#e2e6ef'}`, background: txAddTime === t ? '#f0f0ff' : '#fff', color: txAddTime === t ? '#6366f1' : '#8892a4', fontSize: '0.7rem', fontWeight: txAddTime === t ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {/* Treatment search */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', gap: 8 }}>
                <input value={txAddSearch} onChange={e => setTxAddSearch(e.target.value)} placeholder="시술명 검색"
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fff', fontSize: '0.78rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
                <select value={txAddCategory} onChange={e => setTxAddCategory(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fff', fontSize: '0.78rem', color: '#4a5568', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="">전체</option>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
              </div>
              {/* Treatment list */}
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {TREATMENTS
                  .filter(t => !txAddCategory || t.category === txAddCategory)
                  .filter(t => !txAddSearch || t.name.toLowerCase().includes(txAddSearch.toLowerCase()))
                  .map(t => {
                    const inCart = txAddCart.some(i => i.name === t.name);
                    return (
                      <button key={t.name} onClick={() => toggleTxCartItem(t.name)}
                        style={{ width: '100%', textAlign: 'left', padding: '9px 20px', border: 'none', fontFamily: 'inherit', cursor: 'pointer', background: inCart ? '#f0f0ff' : 'transparent', borderBottom: '1px solid #f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={e => { if (!inCart) (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; }}
                        onMouseLeave={e => { if (!inCart) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: inCart ? '#6366f1' : '#d1d5e0' }} />
                          <span style={{ fontSize: '0.8rem', color: inCart ? '#6366f1' : '#1a1d27', fontWeight: inCart ? 600 : 400 }}>{t.name}</span>
                        </div>
                        {inCart && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    );
                  })}
              </div>

              {/* Cart */}
              {txAddCart.length > 0 && (
                <div style={{ borderTop: '1px solid #eaecf2', padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.1em', fontWeight: 500, marginBottom: 2 }}>선택된 시술</p>
                  {txAddCart.map(item => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: '#f8f9fc', border: '1px solid #eaecf2' }}>
                      <span style={{ fontSize: '0.78rem', color: '#1a1d27', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button onClick={e => { e.stopPropagation(); setTxCartCount(item.name, -1); }}
                          style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #d1d5e0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568', fontSize: '0.85rem', lineHeight: 1 }}>−</button>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1d27', minWidth: 16, textAlign: 'center' }}>{item.count}</span>
                        <button onClick={e => { e.stopPropagation(); setTxCartCount(item.name, 1); }}
                          style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #d1d5e0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568', fontSize: '0.85rem', lineHeight: 1 }}>+</button>
                        <button onClick={e => { e.stopPropagation(); toggleTxCartItem(item.name); }}
                          style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f0f0ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: '0.6rem', marginLeft: 2 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: '12px 20px', borderTop: '1px solid #eaecf2', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setShowTxAddModal(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #eaecf2', background: '#f8f9fc', color: '#4a5568', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                <motion.button onClick={confirmTxAddEvent} disabled={txAddCart.length === 0} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: txAddCart.length > 0 ? '#1a1d27' : '#d1d5e0', color: '#fff', fontSize: '0.8rem', fontWeight: 500, fontFamily: 'inherit', cursor: txAddCart.length > 0 ? 'pointer' : 'not-allowed' }}>
                  추가 {txAddCart.length > 0 && `(${txAddCart.reduce((s, i) => s + i.count, 0)}회)`}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description}
        confirmLabel="확인"
        variant="destructive"
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* 케어 완료 모달 */}
      <AnimatePresence>
        {showCareModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCareModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 2 }}>CARE HISTORY</p>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>케어 완료 내역</h2>
                </div>
                <button onClick={() => setShowCareModal(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f8f9fc', cursor: 'pointer', color: '#8892a4', fontSize: '0.9rem' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {careItems.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px 0', fontSize: '0.82rem', color: '#c8cdd8' }}>완료된 케어가 없습니다</p>
                ) : careItems.map((item, i) => {
                  const [y, m, dd] = item.dateKey.split('-');
                  const dateStr = `${y}.${m}.${dd}`;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f5f6fa' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.taskIcon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1a1d27' }}>{item.taskText}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: '0.75rem', color: '#4a5568' }}>{dateStr}</p>
                      </div>
                      <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, background: '#f0fdf8', color: '#10b981', border: '1px solid #a7f3d0', flexShrink: 0 }}>완료</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid #eaecf2', flexShrink: 0 }}>
                <p style={{ fontSize: '0.7rem', color: '#b0b8cc' }}>총 {new Set(careItems.map(i => i.dateKey)).size}일 완료 ({careItems.length}건)</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 피부 사진 갤러리 모달 */}
      <AnimatePresence>
        {showPhotoGallery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPhotoGallery(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 2 }}>SKIN PHOTOS</p>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>피부 사진 ({photos.length}장)</h2>
                </div>
                <button onClick={() => setShowPhotoGallery(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f8f9fc', cursor: 'pointer', color: '#8892a4', fontSize: '0.9rem' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
                {photos.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '40px 0', fontSize: '0.82rem', color: '#c8cdd8' }}>피부 사진이 없습니다</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {photos.map((p, i) => (
                      <button key={i} onClick={() => { setShowPhotoGallery(false); setLightboxUrl(p.photo_url); }}
                        style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid #eaecf2', cursor: 'zoom-in', padding: 0, position: 'relative', display: 'block' }}>
                        <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
                        <p style={{ position: 'absolute', bottom: 6, left: 0, right: 0, fontSize: '0.6rem', color: '#fff', textAlign: 'center', fontWeight: 500 }}>
                          {new Date(p.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
