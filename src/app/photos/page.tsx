'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { fetchUserMap, getDisplayName, UserMap } from '@/lib/customerName';
import { getMyCustomerUids } from '@/lib/myCustomers';

type AnalysisResult = {
  concerns: string[];
  concern_levels: Record<string, number>;
  primary: string[];
  secondary: string[];
  good_combo: string;
  caution_combo: string;
  needs_consult: string[];
  summary: string;
};

type AnalysisRecord = {
  id: number;
  uid: string;
  photo_url: string;
  result: AnalysisResult;
  created_at: string;
};

const CARD = { background: '#ffffff', border: '1px solid #eaecf2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as const;
const ACCENT = '#6366f1';

const SEVERITY: Record<number, { label: string; color: string }> = {
  1: { label: '경미', color: '#10b981' },
  2: { label: '약함', color: '#84cc16' },
  3: { label: '보통', color: '#f59e0b' },
  4: { label: '뚜렷함', color: '#f97316' },
  5: { label: '심함', color: '#f43f5e' },
};

function RadarChart({ levels }: { levels: Record<string, number> }) {
  const entries = Object.entries(levels).filter(([, v]) => typeof v === 'number' && v > 0);
  if (entries.length < 3) return null;

  const size = 260;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 72;
  const n = entries.length;

  const point = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };

  const rings = [1, 2, 3, 4, 5].map(level => {
    const r = (radius * level) / 5;
    return Array.from({ length: n }, (_, i) => point(i, r)).map(p => `${p.x},${p.y}`).join(' ');
  });

  const axes = Array.from({ length: n }, (_, i) => point(i, radius));
  const dataPoints = entries.map(([, v], i) => point(i, (radius * Math.min(v, 5)) / 5));
  const dataString = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
  const labelRadius = radius + 30;

  return (
    <svg width={size} height={size + 20} viewBox={`0 0 ${size} ${size + 20}`} style={{ display: 'block', margin: '0 auto' }}>
      {rings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#eaecf2" strokeWidth="0.8" />
      ))}
      {axes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#eaecf2" strokeWidth="0.8" />
      ))}
      <polygon points={dataString} fill={ACCENT} fillOpacity={0.15} stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round" />
      {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={ACCENT} />)}
      {entries.map(([name, v], i) => {
        const p = point(i, labelRadius);
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const anchor = Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle';
        return (
          <g key={i}>
            <text x={p.x} y={p.y - 6} fontSize="10" fill="#1a1d27" textAnchor={anchor} dominantBaseline="middle" fontWeight="500">{name}</text>
            <text x={p.x} y={p.y + 8} fontSize="9" fill="#b0b8cc" textAnchor={anchor} dominantBaseline="middle">{v}/5 · {SEVERITY[v]?.label ?? ''}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ResultPanel({ record }: { record: AnalysisRecord }) {
  const r = record.result;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Photo + Summary */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <img src={record.photo_url} alt="분석 사진"
          style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 10, border: '1px solid #eaecf2', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 6 }}>SUMMARY</p>
          <p style={{ fontSize: '0.82rem', color: '#4a5568', lineHeight: 1.65 }}>{r.summary}</p>
          <p style={{ fontSize: '0.68rem', color: '#c8cdd8', marginTop: 8 }}>
            {new Date(record.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Concerns */}
      <div style={{ ...CARD, padding: '16px 18px' }}>
        <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 12 }}>감지된 피부 고민</p>
        <RadarChart levels={r.concern_levels} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' }}>
          {r.concerns.map(c => {
            const lv = r.concern_levels[c] ?? 0;
            const sev = SEVERITY[lv];
            return (
              <span key={c} style={{
                padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 500,
                background: sev ? sev.color + '18' : '#f0f1f5',
                color: sev ? sev.color : '#4a5568',
                border: `1px solid ${sev ? sev.color + '40' : '#eaecf2'}`,
              }}>
                {c} {lv}/5
              </span>
            );
          })}
        </div>
      </div>

      {/* Primary treatments */}
      <div style={{ ...CARD, padding: '16px 18px' }}>
        <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 10 }}>1순위 고려 시술</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {r.primary.map((t, i) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#f8f9fc' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1a1d27', flex: 1 }}>{t}</span>
              <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 10, background: ACCENT + '18', color: ACCENT, fontWeight: 600 }}>
                {i + 1}순위
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary treatments */}
      <div style={{ ...CARD, padding: '16px 18px' }}>
        <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 10 }}>보조 고려 시술</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {r.secondary.map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#f8f9fc', border: '1px solid #eaecf2' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.78rem', color: '#4a5568', fontWeight: 500 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Combo info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ ...CARD, padding: '14px 16px' }}>
          <p style={{ fontSize: '0.62rem', color: '#10b981', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 8 }}>✓ 같이 하면 좋은 조합</p>
          <p style={{ fontSize: '0.75rem', color: '#4a5568', lineHeight: 1.6 }}>{r.good_combo}</p>
        </div>
        <div style={{ ...CARD, padding: '14px 16px' }}>
          <p style={{ fontSize: '0.62rem', color: '#f59e0b', letterSpacing: '0.12em', fontWeight: 600, marginBottom: 8 }}>⚠ 거리두면 좋은 조합</p>
          <p style={{ fontSize: '0.75rem', color: '#4a5568', lineHeight: 1.6 }}>{r.caution_combo}</p>
        </div>
      </div>

      {/* Needs consult */}
      <div style={{ ...CARD, padding: '14px 16px' }}>
        <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 10 }}>의사 상담 후 결정</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {r.needs_consult.map((nc, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.7rem', color: '#b0b8cc', marginTop: 1, flexShrink: 0 }}>?</span>
              <p style={{ fontSize: '0.75rem', color: '#4a5568', lineHeight: 1.55 }}>{nc}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PhotosContent() {
  const searchParams = useSearchParams();
  const initUid = searchParams.get('uid') ?? '';
  const initRecordId = searchParams.get('recordId') ? Number(searchParams.get('recordId')) : null;

  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [userMap, setUserMap] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState<string>(initUid);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);

  useEffect(() => {
    Promise.all([getMyCustomerUids(), fetchUserMap()]).then(async ([uids, map]) => {
      let query = supabase.from('analysis_records').select('id,uid,photo_url,result,created_at').order('created_at', { ascending: false });
      if (uids !== null) {
        if (uids.length === 0) { setRecords([]); setUserMap(map); setLoading(false); return; }
        query = query.in('uid', uids);
      }
      const { data } = await query;
      const loaded = data ?? [];
      setRecords(loaded);
      setUserMap(map);
      setLoading(false);
      if (initRecordId) {
        const target = loaded.find(r => r.id === initRecordId);
        if (target) setSelectedRecord(target);
      }
    });
  }, []);

  const uids = useMemo(() => [...new Set(records.map(r => r.uid))], [records]);
  const filteredRecords = useMemo(() =>
    selectedUid ? records.filter(r => r.uid === selectedUid) : records,
    [records, selectedUid]);

  function selectUid(uid: string) {
    setSelectedUid(uid);
    setSelectedRecord(null);
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7">
        <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>SKIN ANALYSIS</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>피부 분석 기록</h1>
      </motion.div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left: customer list + record list */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
          style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Customer selector */}
          <div style={CARD}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #eaecf2' }}>
              <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500 }}>고객 선택</p>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <button onClick={() => selectUid('')}
                style={{
                  width: '100%', padding: '9px 14px', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: !selectedUid ? '#f0f0ff' : 'transparent',
                  color: !selectedUid ? ACCENT : '#4a5568',
                  fontSize: '0.78rem', fontWeight: !selectedUid ? 600 : 400,
                  borderBottom: '1px solid #f5f6fa',
                }}>
                전체 고객
                <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#b0b8cc' }}>({records.length}건)</span>
              </button>
              {loading ? (
                <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center', gap: 4 }}>
                  {[0, 0.12, 0.24].map((d, i) => (
                    <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#d1d5e0' }}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                  ))}
                </div>
              ) : uids.map(uid => {
                const count = records.filter(r => r.uid === uid).length;
                const isSelected = selectedUid === uid;
                return (
                  <button key={uid} onClick={() => selectUid(uid)}
                    style={{
                      width: '100%', padding: '9px 14px', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: isSelected ? '#f0f0ff' : 'transparent',
                      color: isSelected ? ACCENT : '#4a5568',
                      fontSize: '0.78rem', fontWeight: isSelected ? 600 : 400,
                      borderBottom: '1px solid #f5f6fa',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getDisplayName(uid, userMap)}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: '#b0b8cc' }}>{count}회 분석</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Record list */}
          {filteredRecords.length > 0 && (
            <div style={CARD}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #eaecf2' }}>
                <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500 }}>분석 기록</p>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {filteredRecords.map(rec => {
                  const isActive = selectedRecord?.id === rec.id;
                  return (
                    <button key={rec.id} onClick={() => setSelectedRecord(isActive ? null : rec)}
                      style={{
                        width: '100%', padding: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        background: isActive ? '#f0f0ff' : 'transparent',
                        borderBottom: '1px solid #f5f6fa', display: 'flex', alignItems: 'center', gap: 10,
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <img src={rec.photo_url} alt=""
                        style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ textAlign: 'left', flex: 1, minWidth: 0, paddingRight: 10 }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 500, color: isActive ? ACCENT : '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rec.result?.concerns?.slice(0, 2).join(', ') ?? '-'}
                        </p>
                        <p style={{ fontSize: '0.62rem', color: '#b0b8cc' }}>
                          {new Date(rec.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: result panel */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            {selectedRecord ? (
              <ResultPanel key={selectedRecord.id} record={selectedRecord} />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ ...CARD, padding: '80px 0', textAlign: 'center' }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
                    {[0, 0.12, 0.24].map((d, i) => (
                      <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                    ))}
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#c8cdd8' }}>분석 기록이 없습니다.</p>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#c8cdd8' }}>왼쪽에서 분석 기록을 선택하세요.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default function PhotosPage() {
  return (
    <Suspense>
      <PhotosContent />
    </Suspense>
  );
}
