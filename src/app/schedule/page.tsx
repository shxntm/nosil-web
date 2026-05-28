'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { fetchUserMap, getDisplayName, UserMap } from '@/lib/customerName';

type EventStatus = '접수' | '시술 중' | '완료' | '지각' | '부재' | '취소' | null;
type ScheduleItem = { name: string; date: string; status?: EventStatus };
type Plan = { id: string; uid: string; title: string; start_date: string; schedule: ScheduleItem[] };

const CARD = { background: '#ffffff', border: '1px solid #eaecf2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as const;

const COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#84cc16'];
const DOT_COLORS: Record<string, string> = {};
let colorIdx = 0;
function getTxColor(name: string) {
  if (!DOT_COLORS[name]) DOT_COLORS[name] = COLORS[colorIdx++ % COLORS.length];
  return DOT_COLORS[name];
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  '접수':   { label: '접수',   color: '#6366f1', bg: '#f0f0ff', border: '#c7d2fe' },
  '시술 중': { label: '시술 중', color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
  '완료':   { label: '완료',   color: '#10b981', bg: '#f0fdf8', border: '#a7f3d0' },
  '지각':   { label: '지각',   color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  '부재':   { label: '부재',   color: '#8892a4', bg: '#f5f6fa', border: '#d1d5e0' },
  '취소':   { label: '취소',   color: '#f43f5e', bg: '#fff1f2', border: '#fecdd3' },
};
const STATUS_KEYS = ['접수', '시술 중', '완료', '지각', '부재', '취소'] as const;

function formatTime(isoDate: string): string {
  const d = new Date(isoDate);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function SchedulePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userMap, setUserMap] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('treatment_records').select('id,uid,title,start_date,schedule').order('start_date', { ascending: true }),
      fetchUserMap(),
    ]).then(([{ data }, map]) => {
      setPlans(data ?? []);
      setUserMap(map);
      setLoading(false);
    });
  }, []);

  async function updateStatus(planId: string, eventIdx: number, status: EventStatus) {
    const key = `${planId}-${eventIdx}`;
    setUpdatingKey(key);
    const plan = plans.find(p => p.id === planId);
    if (!plan) { setUpdatingKey(null); return; }
    const event = plan.schedule[eventIdx];
    const isToggleOff = event.status === status;
    const newStatus = isToggleOff ? null : status;
    const newSchedule = plan.schedule.map((e, i) =>
      i === eventIdx ? { ...e, status: newStatus } : e
    );
    const taskId = `treatment-done-${planId}-${eventIdx}`;
    const dateKey = event.date.slice(0, 10);

    await supabase.from('treatment_records').update({ schedule: newSchedule }).eq('id', planId);

    if (status === '완료') {
      if (isToggleOff) {
        // 완료 해제 → daily_completed에서 삭제
        await supabase.from('daily_completed').delete().eq('uid', plan.uid).eq('task_id', taskId);
      } else {
        // 완료 체크 → daily_completed에 기록
        await supabase.from('daily_completed').upsert(
          { uid: plan.uid, task_id: taskId, date_key: dateKey },
          { onConflict: 'uid,task_id' }
        );
        // daily_custom_tasks에 태스크 텍스트/아이콘 등록 (없으면)
        await supabase.from('daily_custom_tasks').upsert(
          { uid: plan.uid, task_id: taskId, task_text: `${event.name} 시술 완료`, task_icon: '💉', date_key: dateKey, task_time: 'morning' },
          { onConflict: 'uid,task_id' }
        );
      }
    }

    setPlans(prev => prev.map(p => p.id === planId ? { ...p, schedule: newSchedule } : p));
    setUpdatingKey(null);
  }

  const { year, month } = viewDate;
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const dayEvents = useMemo(() => {
    const map: Record<number, { name: string; uid: string; past: boolean; status: EventStatus; planId: string; eventIdx: number }[]> = {};
    plans.forEach(p => {
      (p.schedule ?? []).forEach((s, idx) => {
        const d = new Date(s.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({ name: s.name, uid: p.uid, past: d < today, status: s.status ?? null, planId: p.id, eventIdx: idx });
        }
      });
    });
    return map;
  }, [plans, year, month]);

  const upcoming = useMemo(() => {
    return plans.flatMap(p =>
      (p.schedule ?? []).map((s, idx) => ({ ...s, uid: p.uid, title: p.title, planId: p.id, eventIdx: idx }))
    )
    .filter(s => new Date(s.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 50);
  }, [plans]);

  const upcomingByDate = useMemo(() => {
    const groups: { date: string; items: typeof upcoming }[] = [];
    for (const ev of upcoming) {
      const dateKey = ev.date.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.date === dateKey) last.items.push(ev);
      else groups.push({ date: dateKey, items: [ev] });
    }
    return groups;
  }, [upcoming]);

  const selectedEvents = selectedDay !== null ? (dayEvents[selectedDay] ?? []) : [];

  function changeMonth(delta: number) {
    setViewDate(v => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDay(null);
  }

  const monthName = new Date(year, month, 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7">
        <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>SCHEDULE</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>스케줄 관리</h1>
      </motion.div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Calendar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ ...CARD, flex: 1, minWidth: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eaecf2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => changeMonth(-1)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #eaecf2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>{monthName}</h2>
            <button onClick={() => changeMonth(1)} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #eaecf2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a5568' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #eaecf2' }}>
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: '0.68rem', fontWeight: 600, color: i === 0 ? '#f43f5e' : i === 6 ? '#0ea5e9' : '#8892a4', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', gap: 5 }}>
              {[0, 0.12, 0.24].map((d, i) => (
                <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`pad-${i}`} style={{ minHeight: 80, borderRight: '1px solid #f5f6fa', borderBottom: '1px solid #f5f6fa' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const events = dayEvents[day] ?? [];
                const dateObj = new Date(year, month, day);
                const isToday = dateObj.getTime() === today.getTime();
                const isSelected = selectedDay === day;
                const isPast = dateObj < today;
                const col = (firstDow + i) % 7;
                return (
                  <div key={day}
                    onClick={() => events.length > 0 && setSelectedDay(isSelected ? null : day)}
                    style={{ minHeight: 80, padding: 6, borderRight: '1px solid #f5f6fa', borderBottom: '1px solid #f5f6fa', background: isSelected ? '#f0f0ff' : isToday ? '#fafafa' : 'transparent', cursor: events.length > 0 ? 'pointer' : 'default' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: isToday ? 700 : 400, background: isToday ? '#1a1d27' : 'transparent', color: isToday ? '#fff' : col === 0 ? '#f43f5e' : col === 6 ? '#0ea5e9' : isPast ? '#c8cdd8' : '#4a5568' }}>{day}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                      {events.slice(0, 4).map((ev, j) => {
                        const color = ev.status ? STATUS_CFG[ev.status]?.color ?? getTxColor(ev.name) : getTxColor(ev.name);
                        return <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: ev.past && !ev.status ? 'transparent' : color, border: `1.5px solid ${color}` }} />;
                      })}
                      {events.length > 4 && <span style={{ fontSize: '0.55rem', color: '#b0b8cc' }}>+{events.length - 4}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected day detail */}
          <AnimatePresence>
            {selectedDay !== null && selectedEvents.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ borderTop: '1px solid #eaecf2', overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6366f1', marginBottom: 10 }}>
                    {year}년 {month + 1}월 {selectedDay}일
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedEvents.map((ev, i) => {
                      const sc = ev.status ? STATUS_CFG[ev.status] : null;
                      const key = `cal-${ev.planId}-${ev.eventIdx}`;
                      const isExpanded = expandedKey === key;
                      return (
                        <div key={i} style={{ borderRadius: 8, border: `1px solid ${sc ? sc.border : '#eaecf2'}`, overflow: 'hidden' }}>
                          <div onClick={() => setExpandedKey(isExpanded ? null : key)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: sc ? sc.bg : '#f8f9fc', cursor: 'pointer' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: getTxColor(ev.name), flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', color: '#1a1d27', fontWeight: 500, flex: 1 }}>{ev.name}</span>
                            <span style={{ fontSize: '0.7rem', color: '#8892a4' }}>{getDisplayName(ev.uid, userMap)}</span>
                            {sc && <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 10, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 600 }}>{ev.status}</span>}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c8cdd8" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                              <path d="m6 9 6 6 6-6"/>
                            </svg>
                          </div>
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '8px 12px', borderTop: '1px solid #eaecf2', background: '#fff' }}>
                                  {STATUS_KEYS.map(s => {
                                    const cfg = STATUS_CFG[s];
                                    const active = ev.status === s;
                                    return (
                                      <button key={s} onClick={() => updateStatus(ev.planId, ev.eventIdx, s)}
                                        disabled={updatingKey === `${ev.planId}-${ev.eventIdx}`}
                                        style={{ padding: '3px 10px', borderRadius: 20, border: `1.5px solid ${active ? cfg.border : '#e2e6ef'}`, background: active ? cfg.bg : '#fff', color: active ? cfg.color : '#8892a4', fontSize: '0.68rem', fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s' }}>
                                        {s}
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Upcoming list */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          style={{ ...CARD, width: 300, flexShrink: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #eaecf2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.65rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 2, fontWeight: 500 }}>UPCOMING</p>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>예정 시술</h3>
            </div>
            <Link href="/appointments">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: '#1a1d27', color: '#fff', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                시술 등록
              </motion.div>
            </Link>
          </div>
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center', gap: 4 }}>
                {[0, 0.12, 0.24].map((d, i) => (
                  <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                ))}
              </div>
            ) : upcomingByDate.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#c8cdd8', textAlign: 'center', padding: '24px 0' }}>예정된 시술이 없습니다</p>
            ) : upcomingByDate.map((group) => (
              <div key={group.date}>
                <div style={{ padding: '6px 16px 4px', background: '#f8f9fc', borderBottom: '1px solid #eaecf2', borderTop: '1px solid #eaecf2' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6366f1' }}>
                    {group.date.slice(5).replace('-', '/')}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#c8cdd8', marginLeft: 6 }}>
                    {group.date.slice(0, 4)}
                  </span>
                </div>
                {group.items.map((ev, i) => {
                  const sc = ev.status ? STATUS_CFG[ev.status] : null;
                  const time = formatTime(ev.date);
                  const key = `${ev.planId}-${ev.eventIdx}`;
                  const isExpanded = expandedKey === key;
                  return (
                    <div key={i} style={{ borderBottom: '1px solid #f5f6fa' }}>
                      {/* 클릭 행 */}
                      <div onClick={() => setExpandedKey(isExpanded ? null : key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', cursor: 'pointer', background: sc ? sc.bg : isExpanded ? '#f8f9fc' : 'transparent', opacity: updatingKey === key ? 0.6 : 1, transition: 'background 0.1s' }}>
                        <div style={{ width: 3, height: 32, borderRadius: 2, background: getTxColor(ev.name), flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {getDisplayName(ev.uid, userMap)}
                            </p>
                            {time && (
                              <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600, flexShrink: 0, background: '#f0f0ff', padding: '1px 6px', borderRadius: 6 }}>
                                {time}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontSize: '0.68rem', color: '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {ev.name}
                            </p>
                            {sc && (
                              <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 10, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 600, flexShrink: 0 }}>
                                {ev.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c8cdd8" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </div>
                      {/* 상태 버튼 (펼쳐질 때만) */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                            style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '6px 16px 10px 27px' }}>
                              {STATUS_KEYS.map(s => {
                                const cfg = STATUS_CFG[s];
                                const active = ev.status === s;
                                return (
                                  <button key={s} onClick={() => updateStatus(ev.planId, ev.eventIdx, s)}
                                    disabled={updatingKey === key}
                                    style={{ padding: '3px 10px', borderRadius: 20, border: `1.5px solid ${active ? cfg.border : '#e2e6ef'}`, background: active ? cfg.bg : '#fff', color: active ? cfg.color : '#8892a4', fontSize: '0.68rem', fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s' }}>
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
