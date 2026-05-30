'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { TREATMENTS, CATEGORIES } from '@/data/treatments';
import { fetchUserMap, getDisplayName, UserMap } from '@/lib/customerName';
import { getSession } from '@/lib/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AiAppointment = { id: number; name: string; phone: string; date: string; time: string; treatment: string; memo: string | null; status: string; uid: string | null; created_at: string; };
type EventStatus = '완료' | '지각' | '취소' | '부재' | null;
type ScheduleEvent = { name: string; date: string; status?: EventStatus };
type Plan = { id: string; uid: string; title: string; start_date: string; schedule: ScheduleEvent[]; created_at: string };

const EVENT_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  '완료': { label: '완료', color: '#10b981', bg: '#f0fdf8', border: '#a7f3d0' },
  '지각': { label: '지각', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  '취소': { label: '취소', color: '#f43f5e', bg: '#fff1f2', border: '#fecdd3' },
  '부재': { label: '부재', color: '#8892a4', bg: '#f5f6fa', border: '#d1d5e0' },
};

const CARD = { background: '#ffffff', border: '1px solid #eaecf2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as const;

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

// ──────────────── Calendar ────────────────
function MiniCalendar({
  year, month, events, selectedDate, onSelectDate, onPrev, onNext,
}: {
  year: number; month: number; events: ScheduleEvent[];
  selectedDate: Date | null; onSelectDate: (d: Date) => void; onPrev: () => void; onNext: () => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const today = new Date();

  function getEventCount(day: number) {
    const d = new Date(year, month, day);
    return events.filter(e => isSameDay(new Date(e.date), d)).length;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={onPrev} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #eaecf2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a1d27' }}>{year}년 {month + 1}월</span>
        <button onClick={onNext} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #eaecf2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', color: '#b0b8cc', fontWeight: 500, padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const d = new Date(year, month, day);
          const isToday = isSameDay(d, today);
          const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
          const count = getEventCount(day);
          return (
            <button key={idx} onClick={() => onSelectDate(d)}
              style={{
                aspectRatio: '1', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: isSelected ? '#1a1d27' : isToday ? '#f0f0ff' : 'transparent',
                color: isSelected ? '#fff' : isToday ? '#6366f1' : '#4a5568',
                fontSize: '0.75rem', fontWeight: isSelected || isToday ? 600 : 400,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                position: 'relative',
              }}>
              {day}
              {count > 0 && (
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : '#6366f1' }} />
                  ))}
                  {count > 3 && <span style={{ fontSize: '0.5rem', color: isSelected ? '#fff' : '#6366f1' }}>+</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────── Main Page ────────────────
export default function AppointmentsPage() {
  const [records, setRecords] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Plan | null>(null);
  const [updatingEvent, setUpdatingEvent] = useState<string | null>(null);

  // form state
  const [customers, setCustomers] = useState<{ uid: string }[]>([]);
  const [userMap, setUserMap] = useState<UserMap>({});
  const [uid, setUid] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [saving, setSaving] = useState(false);

  // calendar
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [aiAppts, setAiAppts] = useState<AiAppointment[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [updatingAppt, setUpdatingAppt] = useState<number | null>(null);

  // add-event modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTime, setAddTime] = useState('10:00');
  const [addTxSearch, setAddTxSearch] = useState('');
  const [addTxCategory, setAddTxCategory] = useState('');
  const [addCart, setAddCart] = useState<{ name: string; count: number }[]>([]);

  async function loadRecords() {
    const hospitalId = getSession()?.hospitalId;
    let query = supabase.from('treatment_records').select('*').order('created_at', { ascending: false }).limit(50);
    if (hospitalId) query = query.eq('hospital_id', hospitalId);
    const { data } = await query;
    setRecords(data ?? []);
    setLoading(false);
  }

  async function loadAiAppts() {
    const hospitalId = getSession()?.hospitalId;
    let query = supabase.from('appointments').select('*').order('date', { ascending: true });
    if (hospitalId) query = query.eq('hospital_id', hospitalId);
    const { data } = await query;
    setAiAppts(data ?? []);
    setAiLoading(false);
  }

  async function updateApptStatus(id: number, status: string) {
    setUpdatingAppt(id);
    await supabase.from('appointments').update({ status }).eq('id', id);
    setAiAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a));

    // 확정 시 treatment_records에도 등록 → 캘린더 & 시술 리스트에 반영
    if (status === 'confirmed') {
      const appt = aiAppts.find(a => a.id === id);
      if (appt) {
        const session = getSession();
        const hospitalId = session?.hospitalId ?? null;
        const isoDate = new Date(`${appt.date}T${appt.time}:00`).toISOString();
        await supabase.from('treatment_records').insert({
          uid: appt.uid ?? null,
          title: `${appt.treatment} 예약 (${appt.name})`,
          step: 'calendar',
          start_date: appt.date,
          schedule: [{ name: appt.treatment, date: isoDate }],
          past_treatments: [],
          hospital_id: hospitalId,
        });
        loadRecords();
      }
    }

    setUpdatingAppt(null);
  }

  useEffect(() => {
    loadRecords();
    loadAiAppts();
    const hospitalId = getSession()?.hospitalId;
    Promise.all([
      hospitalId
        ? supabase.from('hospital_customers').select('uid').eq('hospital_id', hospitalId)
        : supabase.from('hospital_customers').select('uid'),
      fetchUserMap(),
    ]).then(([{ data }, map]) => {
      setCustomers(data ?? []);
      setUserMap(map);
    });
  }, []);

  function openForm() {
    setUid(''); setPlanTitle(''); setEvents([]);
    setSelectedDate(null); setCalYear(today.getFullYear()); setCalMonth(today.getMonth());
    setShowForm(true);
  }

  function handleSelectDate(d: Date) {
    setSelectedDate(d);
    setAddTime('10:00'); setAddTxSearch(''); setAddTxCategory(''); setAddCart([]);
    setShowAddModal(true);
  }

  function confirmAddEvent() {
    if (addCart.length === 0 || !selectedDate) return;
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const iso = `${dateStr}T${addTime}:00`;
    const newEvents = addCart.flatMap(item => Array.from({ length: item.count }, () => ({ name: item.name, date: iso })));
    setEvents(prev => [...prev, ...newEvents]);
    setShowAddModal(false);
  }

  function toggleCartItem(name: string) {
    setAddCart(prev => {
      const existing = prev.find(i => i.name === name);
      if (existing) return prev.filter(i => i.name !== name);
      return [...prev, { name, count: 1 }];
    });
  }

  function setCartCount(name: string, delta: number) {
    setAddCart(prev => prev.map(i => i.name === name ? { ...i, count: Math.max(1, Math.min(10, i.count + delta)) } : i));
  }

  function removeEvent(idx: number) {
    setEvents(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!uid || events.length === 0) return;
    setSaving(true);
    const session = getSession();
    const hospitalId = session?.hospitalId ?? null;
    const hospitalName = session?.name ?? '병원';

    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const startDate = sorted[0].date.slice(0, 10);
    const names = [...new Set(sorted.map(e => e.name))];
    const title = planTitle.trim() || `${names.slice(0, 2).join(', ')} 스케줄`;
    const { error } = await supabase.from('treatment_records').insert({
      uid,
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
          uid,
          date_key: dateKey,
          task_time: 'morning',
          task_text: `${s.name} 시술 예정`,
          task_icon: '💉',
          task_id: `treatment-${Date.now()}-${dateKey}-${s.name}`,
        }, { onConflict: 'uid,task_id' });
      }
      setShowForm(false);
      loadRecords();
    }
    setSaving(false);
  }

  async function updateEventStatus(plan: Plan, eventIdx: number, status: EventStatus) {
    const key = `${plan.id}-${eventIdx}`;
    setUpdatingEvent(key);
    const event = plan.schedule[eventIdx];
    const isToggleOff = event.status === status;
    const newStatus = isToggleOff ? null : status;
    const newSchedule = plan.schedule.map((e, i) =>
      i === eventIdx ? { ...e, status: newStatus } : e
    );
    await supabase.from('treatment_records').update({ schedule: newSchedule }).eq('id', plan.id);

    if (status === '완료' && plan.uid) {
      const taskId = `treatment-done-${plan.id}-${eventIdx}`;
      const dateKey = event.date.slice(0, 10);
      if (isToggleOff) {
        await supabase.from('daily_completed').delete().eq('uid', plan.uid).eq('task_id', taskId);
      } else {
        await supabase.from('daily_completed').upsert(
          { uid: plan.uid, task_id: taskId, date_key: dateKey },
          { onConflict: 'uid,task_id' }
        );
        await supabase.from('daily_custom_tasks').upsert(
          { uid: plan.uid, task_id: taskId, task_text: `${event.name} 시술 완료`, task_icon: '💉', date_key: dateKey, task_time: 'morning' },
          { onConflict: 'uid,task_id' }
        );
      }
    }

    const updated = { ...plan, schedule: newSchedule };
    setRecords(prev => prev.map(r => r.id === plan.id ? updated : r));
    setSelectedRecord(updated);
    setUpdatingEvent(null);
  }

  const selectedDateEvents = selectedDate
    ? events.filter(e => isSameDay(new Date(e.date), selectedDate))
    : [];

  const filteredTx = TREATMENTS
    .filter(t => t.category !== 'filler')
    .filter(t => !addTxCategory || t.category === addTxCategory)
    .filter(t => !addTxSearch || t.name.toLowerCase().includes(addTxSearch.toLowerCase()));

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7"
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>APPOINTMENTS</p>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>시술 등록</h1>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={showForm ? () => setShowForm(false) : openForm}
          style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: showForm ? '#f0f1f5' : '#1a1d27', color: showForm ? '#4a5568' : '#ffffff',
            fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit',
          }}>
          {showForm ? '취소' : '+ 새 스케줄 등록'}
        </motion.button>
      </motion.div>

      {/* ── Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ ...CARD, padding: 24 }}>
              <p style={{ fontSize: '0.65rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 16, fontWeight: 500 }}>NEW SCHEDULE</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {/* 고객 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#4a5568', marginBottom: 5 }}>고객 선택</label>
                  <Select value={uid} onValueChange={v => setUid(v ?? '')}>
                    <SelectTrigger className="w-full h-9 text-sm border-[#e2e6ef] rounded-lg">
                      <SelectValue placeholder="고객을 선택하세요">
                        {uid ? getDisplayName(uid, userMap) : '고객을 선택하세요'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.uid} value={c.uid}>{getDisplayName(c.uid, userMap)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* 스케줄 제목 */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#4a5568', marginBottom: 5 }}>스케줄 제목 <span style={{ color: '#b0b8cc', fontWeight: 400 }}>(비워두면 자동생성)</span></label>
                  <input value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="예: 봄 집중 관리"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fff', fontSize: '0.85rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
                </div>
              </div>

              {/* Calendar + events side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
                {/* Calendar */}
                <div style={{ padding: 16, borderRadius: 10, border: '1.5px solid #eaecf2', background: '#fafafa' }}>
                  <MiniCalendar
                    year={calYear} month={calMonth} events={events}
                    selectedDate={selectedDate}
                    onSelectDate={handleSelectDate}
                    onPrev={() => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); }}
                    onNext={() => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); }}
                  />
                  <p style={{ fontSize: '0.68rem', color: '#b0b8cc', marginTop: 10, textAlign: 'center' }}>날짜를 클릭해 시술을 추가하세요</p>
                </div>

                {/* Event list */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1a1d27' }}>등록된 일정 <span style={{ color: '#6366f1' }}>{events.length}개</span></p>
                    {events.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.entries(countsFromSchedule(events)).map(([name, cnt]) => (
                          <span key={name} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1', border: '1px solid #e0e7ff' }}>
                            {name} {cnt}회
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {events.length === 0 ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: '#c8cdd8', fontSize: '0.82rem', border: '1.5px dashed #eaecf2', borderRadius: 10 }}>
                      캘린더에서 날짜를 선택하세요
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                      {[...events]
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((e, i) => {
                          const d = new Date(e.date);
                          const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                          const origIdx = events.indexOf(e);
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#f8f9fc', border: '1px solid #eaecf2' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.72rem', color: '#8892a4', width: 40, flexShrink: 0 }}>{dateStr}</span>
                              <span style={{ fontSize: '0.72rem', color: '#b0b8cc', width: 36, flexShrink: 0 }}>{timeStr}</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1a1d27', flex: 1 }}>{e.name}</span>
                              <button onClick={() => removeEvent(origIdx)} style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #eaecf2', background: '#fff', cursor: 'pointer', color: '#f43f5e', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <motion.button onClick={handleSave} disabled={saving || !uid || events.length === 0} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{
                    padding: '9px 24px', borderRadius: 8, border: 'none',
                    background: uid && events.length > 0 ? '#1a1d27' : '#d1d5e0',
                    color: '#fff', fontSize: '0.85rem', fontWeight: 500, fontFamily: 'inherit',
                    cursor: uid && events.length > 0 ? 'pointer' : 'not-allowed',
                  }}>
                  {saving ? '저장 중...' : '스케줄 저장'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI 예약 요청 ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ ...CARD, marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 2 }}>AI BOOKINGS</p>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>AI 예약 요청</h2>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#6366f1', background: '#f0f0ff', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
            {aiAppts.filter(a => a.status === 'pending').length}건 대기 중
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                {['고객명', '연락처', '시술', '날짜', '시간', '메모', '상태'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '0.68rem', fontWeight: 600, color: '#8892a4', letterSpacing: '0.08em', borderBottom: '1px solid #eaecf2' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aiLoading ? (
                <tr><td colSpan={7} style={{ padding: '24px 0', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    {[0, 0.12, 0.24].map((d, i) => (
                      <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                    ))}
                  </div>
                </td></tr>
              ) : aiAppts.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px 0', textAlign: 'center', fontSize: '0.82rem', color: '#c8cdd8' }}>AI 예약 요청이 없습니다.</td></tr>
              ) : aiAppts.map((a, i) => {
                const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
                  pending:   { label: '대기',   color: '#f59e0b', bg: '#fffbeb' },
                  confirmed: { label: '확정',   color: '#10b981', bg: '#f0fdf8' },
                  cancelled: { label: '취소',   color: '#f43f5e', bg: '#fff1f2' },
                };
                const sc = STATUS_MAP[a.status] ?? { label: a.status, color: '#8892a4', bg: '#f5f6fa' };
                return (
                  <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid #f5f6fa', opacity: updatingAppt === a.id ? 0.5 : 1 }}>
                    <td style={{ padding: '11px 16px', fontSize: '0.82rem', color: '#1a1d27', fontWeight: 500 }}>{a.name}</td>
                    <td style={{ padding: '11px 16px', fontSize: '0.78rem', color: '#4a5568', fontFamily: 'monospace' }}>{a.phone}</td>
                    <td style={{ padding: '11px 16px', fontSize: '0.82rem', color: '#4a5568' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1', fontSize: '0.7rem' }}>{a.treatment}</span>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.78rem', color: '#4a5568' }}>{a.date}</td>
                    <td style={{ padding: '11px 16px', fontSize: '0.78rem', color: '#4a5568' }}>{a.time}</td>
                    <td style={{ padding: '11px 16px', fontSize: '0.75rem', color: '#8892a4', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.memo ?? '-'}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600, marginRight: 4 }}>{sc.label}</span>
                        {a.status === 'pending' && (
                          <>
                            <button onClick={() => updateApptStatus(a.id, 'confirmed')}
                              style={{ padding: '3px 10px', borderRadius: 20, border: '1.5px solid #a7f3d0', background: '#f0fdf8', color: '#10b981', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>확정</button>
                            <button onClick={() => updateApptStatus(a.id, 'cancelled')}
                              style={{ padding: '3px 10px', borderRadius: 20, border: '1.5px solid #fecdd3', background: '#fff1f2', color: '#f43f5e', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Records table ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={CARD}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>시술 기록</h2>
          <span style={{ fontSize: '0.72rem', color: '#6366f1', background: '#f0f0ff', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>총 {records.length}건</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fc' }}>
                {['고객', '스케줄 제목', '시술 구성', '시작일', '총 회차', '진행'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '0.68rem', fontWeight: 600, color: '#8892a4', letterSpacing: '0.08em', borderBottom: '1px solid #eaecf2' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '32px 0', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    {[0, 0.12, 0.24].map((d, i) => (
                      <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                    ))}
                  </div>
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '32px 0', textAlign: 'center', fontSize: '0.82rem', color: '#c8cdd8' }}>등록된 시술이 없습니다.</td></tr>
              ) : records.map((r, i) => {
                const schedule = (r.schedule as ScheduleEvent[]) ?? [];
                const counts = countsFromSchedule(schedule);
                const txNames = Object.keys(counts);
                const done = schedule.filter(s => s.status === '완료').length;
                return (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedRecord(selectedRecord?.id === r.id ? null : r)}
                    style={{ borderBottom: '1px solid #f5f6fa', cursor: 'pointer', background: selectedRecord?.id === r.id ? '#f0f0ff' : 'transparent' }}
                    onMouseEnter={e => { if (selectedRecord?.id !== r.id) (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; }}
                    onMouseLeave={e => { if (selectedRecord?.id !== r.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <td style={{ padding: '11px 16px', fontSize: '0.82rem', color: '#4a5568', fontWeight: 500 }}>{getDisplayName(r.uid, userMap)}</td>
                    <td style={{ padding: '11px 16px', fontSize: '0.82rem', fontWeight: 500, color: '#1a1d27' }}>{r.title}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {txNames.slice(0, 3).map(name => (
                          <span key={name} style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1' }}>
                            {name} {counts[name]}회
                          </span>
                        ))}
                        {txNames.length > 3 && <span style={{ fontSize: '0.65rem', color: '#b0b8cc' }}>+{txNames.length - 3}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.78rem', color: '#8892a4' }}>{r.start_date}</td>
                    <td style={{ padding: '11px 16px', fontSize: '0.78rem', color: '#4a5568' }}>{schedule.length}회</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: '#eaecf2', overflow: 'hidden' }}>
                          <div style={{ width: `${schedule.length > 0 ? (done / schedule.length) * 100 : 0}%`, height: '100%', background: '#6366f1', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#8892a4' }}>{done}/{schedule.length}</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Schedule detail panel ── */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}
            style={{ ...CARD, marginTop: 12 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 2 }}>SCHEDULE DETAIL</p>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>
                  {getDisplayName(selectedRecord.uid, userMap)} — {selectedRecord.title}
                </h2>
              </div>
              <button onClick={() => setSelectedRecord(null)}
                style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f8f9fc', cursor: 'pointer', color: '#8892a4', fontSize: '0.9rem' }}>✕</button>
            </div>
            <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...selectedRecord.schedule]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((e, i) => {
                  const origIdx = selectedRecord.schedule.indexOf(e);
                  const d = new Date(e.date);
                  const isPast = d < new Date();
                  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                  const sc = e.status ? EVENT_STATUS[e.status] : null;
                  const key = `${selectedRecord.id}-${origIdx}`;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: sc ? sc.bg : isPast ? '#f8f9fc' : '#fff', border: `1px solid ${sc ? sc.border : '#eaecf2'}`, opacity: updatingEvent === key ? 0.6 : 1 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc ? sc.color : isPast ? '#d1d5e0' : '#6366f1', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.72rem', color: '#8892a4', width: 80, flexShrink: 0 }}>{dateStr}</span>
                      <span style={{ fontSize: '0.72rem', color: '#b0b8cc', width: 36, flexShrink: 0 }}>{timeStr}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1a1d27', flex: 1 }}>{e.name}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['완료', '지각', '취소', '부재'] as EventStatus[]).map(s => {
                          const cfg = EVENT_STATUS[s!];
                          const active = e.status === s;
                          return (
                            <button key={s} onClick={() => updateEventStatus(selectedRecord, origIdx, s)}
                              style={{ padding: '3px 9px', borderRadius: 20, border: `1.5px solid ${active ? cfg.border : '#eaecf2'}`, background: active ? cfg.bg : 'transparent', color: active ? cfg.color : '#c8cdd8', fontSize: '0.65rem', fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s' }}>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add event modal ── */}
      <AnimatePresence>
        {showAddModal && selectedDate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}>
            <motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 460 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 2 }}>ADD EVENT</p>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>
                    {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 시술 추가
                  </h2>
                </div>
                <button onClick={() => setShowAddModal(false)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f8f9fc', cursor: 'pointer', color: '#8892a4', fontSize: '0.9rem' }}>✕</button>
              </div>

              {/* Time slots */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecf2' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 500, color: '#4a5568', marginBottom: 8 }}>시술 시간</p>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  {TIME_SLOTS.map(t => (
                    <button key={t} onClick={() => setAddTime(t)}
                      style={{ padding: '5px 10px', borderRadius: 20, border: `1.5px solid ${addTime === t ? '#6366f1' : '#e2e6ef'}`, background: addTime === t ? '#f0f0ff' : '#fff', color: addTime === t ? '#6366f1' : '#8892a4', fontSize: '0.72rem', fontWeight: addTime === t ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Treatment search & filter */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', gap: 8 }}>
                <input value={addTxSearch} onChange={e => setAddTxSearch(e.target.value)} placeholder="시술명 검색"
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fff', fontSize: '0.8rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
                <select value={addTxCategory} onChange={e => setAddTxCategory(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fff', fontSize: '0.8rem', color: '#4a5568', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="">전체</option>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
              </div>

              {/* Treatment list */}
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {filteredTx.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '24px 0', fontSize: '0.8rem', color: '#c8cdd8' }}>검색 결과 없음</p>
                ) : filteredTx.map(t => {
                  const inCart = addCart.some(i => i.name === t.name);
                  return (
                    <button key={t.name} onClick={() => toggleCartItem(t.name)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '9px 20px', border: 'none', fontFamily: 'inherit', cursor: 'pointer',
                        background: inCart ? '#f0f0ff' : 'transparent',
                        borderBottom: '1px solid #f5f6fa',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                      onMouseEnter={e => { if (!inCart) (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; }}
                      onMouseLeave={e => { if (!inCart) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: inCart ? '#6366f1' : '#d1d5e0', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: inCart ? '#6366f1' : '#1a1d27', fontWeight: inCart ? 600 : 400 }}>{t.name}</span>
                      </div>
                      {inCart && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  );
                })}
              </div>

              {/* Cart */}
              {addCart.length > 0 && (
                <div style={{ borderTop: '1px solid #eaecf2', padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.1em', fontWeight: 500, marginBottom: 2 }}>선택된 시술</p>
                  {addCart.map(item => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: '#f8f9fc', border: '1px solid #eaecf2' }}>
                      <span style={{ fontSize: '0.8rem', color: '#1a1d27', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button onClick={e => { e.stopPropagation(); setCartCount(item.name, -1); }}
                          style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #d1d5e0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568', fontSize: '0.85rem', lineHeight: 1 }}>−</button>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1d27', minWidth: 16, textAlign: 'center' }}>{item.count}</span>
                        <button onClick={e => { e.stopPropagation(); setCartCount(item.name, 1); }}
                          style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #d1d5e0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568', fontSize: '0.85rem', lineHeight: 1 }}>+</button>
                        <button onClick={e => { e.stopPropagation(); toggleCartItem(item.name); }}
                          style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid #eaecf2', background: '#f0f0ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: '0.6rem', marginLeft: 2 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: '12px 20px', borderTop: '1px solid #eaecf2', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #eaecf2', background: '#f8f9fc', color: '#4a5568', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  취소
                </button>
                <motion.button onClick={confirmAddEvent} disabled={addCart.length === 0} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: addCart.length > 0 ? '#1a1d27' : '#d1d5e0', color: '#fff', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit', cursor: addCart.length > 0 ? 'pointer' : 'not-allowed' }}>
                  추가 {addCart.length > 0 && `(${addCart.reduce((s, i) => s + i.count, 0)}회)`}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
