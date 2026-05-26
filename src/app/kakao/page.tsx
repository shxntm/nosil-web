'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { fetchUserMap, getDisplayName, UserMap } from '@/lib/customerName';
import { getSession } from '@/lib/auth';

type Customer = { uid: string; updated_at: string | null };

const CARD = { background: '#ffffff', border: '1px solid #eaecf2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as const;

const TEMPLATES = [
  { id: '1', name: '시술 예약 안내', content: '안녕하세요 ${name}님, ${date}에 ${treatment} 시술이 예약되어 있습니다. 방문 시 주의사항을 확인해주세요.' },
  { id: '2', name: '시술 후 관리 안내', content: '${name}님, 시술 후 관리 안내드립니다. 3일간 자외선 차단제를 꼼꼼히 발라주시고, 사우나와 음주는 피해주세요.' },
  { id: '3', name: '다음 시술 알림', content: '${name}님, 다음 시술 일정이 다가오고 있습니다. ${date}에 방문 예정이시니 일정 확인 부탁드립니다.' },
  { id: '4', name: '이벤트/프로모션', content: '${name}님, 이번 달 특별 프로모션을 안내드립니다. 자세한 내용은 병원에 문의해주세요.' },
];

export default function KakaoPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userMap, setUserMap] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const hospitalId = getSession()?.hospitalId ?? null;

    async function load() {
      const [map] = await Promise.all([fetchUserMap()]);

      // hospital_customers + user_hospitals에서 병원 고객 uid 수집
      const [hcRes, uhRes] = await Promise.all([
        hospitalId
          ? supabase.from('hospital_customers').select('uid').eq('hospital_id', hospitalId)
          : supabase.from('hospital_customers').select('uid'),
        hospitalId
          ? supabase.from('user_hospitals').select('uid').eq('hospital_id', hospitalId)
          : Promise.resolve({ data: [] }),
      ]);

      const uids = Array.from(new Set([
        ...(hcRes.data ?? []).map((r: any) => r.uid),
        ...(uhRes.data ?? []).map((r: any) => r.uid),
      ]));

      setCustomers(uids.map(uid => ({ uid, updated_at: null })));
      setUserMap(map);
      setLoading(false);
    }

    load();
  }, []);

  function toggle(uid: string) {
    setSelected(prev => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  }

  function toggleAll() {
    setSelected(selected.size === customers.length ? new Set() : new Set(customers.map(c => c.uid)));
  }

  function handleSend() {
    if (selected.size === 0 || (!templateId && !message.trim())) return;
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7">
        <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>MESSAGING</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>카카오톡 메시지</h1>
      </motion.div>

      {/* API notice */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ padding: '10px 14px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fef3c7', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p style={{ fontSize: '0.75rem', color: '#92400e' }}>카카오 알림톡 API 연동 예정입니다. 현재는 플레이스홀더로 동작합니다.</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        {/* Customer list */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} style={CARD}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1a1d27' }}>고객 선택 <span style={{ color: '#6366f1' }}>({selected.size}/{customers.length})</span></p>
            <button onClick={toggleAll} style={{ fontSize: '0.7rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {selected.size === customers.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center', gap: 4 }}>
                {[0, 0.12, 0.24].map((d, i) => (
                  <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                ))}
              </div>
            ) : customers.map(c => (
              <label key={c.uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f5f6fa', cursor: 'pointer', background: selected.has(c.uid) ? '#f8f9ff' : 'transparent' }}>
                <input type="checkbox" checked={selected.has(c.uid)} onChange={() => toggle(c.uid)}
                  style={{ width: 14, height: 14, accentColor: '#6366f1', cursor: 'pointer' }} />
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#1a1d27' }}>{getDisplayName(c.uid, userMap)}</p>
                  <p style={{ fontSize: '0.65rem', color: '#b0b8cc' }}>{c.updated_at ? new Date(c.updated_at).toLocaleDateString('ko-KR') : '-'}</p>
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Compose */}
        <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Templates */}
          <div style={CARD}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #eaecf2' }}>
              <p style={{ fontSize: '0.65rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 2, fontWeight: 500 }}>TEMPLATES</p>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>메시지 템플릿</h3>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { setTemplateId(t.id); setMessage(t.content); }}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${templateId === t.id ? '#6366f1' : '#eaecf2'}`, background: templateId === t.id ? '#f0f0ff' : '#fff', cursor: 'pointer' }}>
                  <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#1a1d27', marginBottom: 2 }}>{t.name}</p>
                  <p style={{ fontSize: '0.7rem', color: '#b0b8cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.content}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div style={CARD}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #eaecf2' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>메시지 내용</h3>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                placeholder="보낼 메시지를 입력하세요..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e6ef', fontSize: '0.82rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
              <p style={{ fontSize: '0.68rem', color: '#c8cdd8', marginTop: 6 }}>{'${name}, ${date}, ${treatment}'} 변수를 사용할 수 있습니다.</p>
            </div>
          </div>

          {/* Send button */}
          <motion.button onClick={handleSend} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            disabled={selected.size === 0 || (!templateId && !message.trim())}
            style={{
              padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.88rem', fontWeight: 600,
              background: sent ? '#10b981' : selected.size === 0 ? '#f0f1f5' : '#FEE500',
              color: sent ? '#fff' : selected.size === 0 ? '#c8cdd8' : '#3C1E1E',
              transition: 'background 0.2s',
            }}>
            <AnimatePresence mode="wait">
              <motion.span key={sent ? 'sent' : 'send'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {sent ? '✓ 전송 완료!' : `카카오톡 보내기 (${selected.size}명)`}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
