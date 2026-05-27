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

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 18, right: 22,
          background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff', fontSize: '1rem',
        }}
      >✕</button>
      <img
        src={src}
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
  );
}

function ResultPanel({ record, onDelete }: { record: AnalysisRecord; onDelete: (id: number) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const r = record.result;

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.from('analysis_records').delete().eq('id', record.id);
    if (error) {
      setDeleting(false);
      setDeleteError('삭제에 실패했어요. 다시 시도해주세요.');
      return;
    }
    onDelete(record.id);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {lightbox && <ImageLightbox src={record.photo_url} onClose={() => setLightbox(false)} />}

      {/* Photo + Summary */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <img
          src={record.photo_url} alt="분석 사진"
          onClick={() => setLightbox(true)}
          style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 10, border: '1px solid #eaecf2', flexShrink: 0, cursor: 'zoom-in', transition: 'opacity 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 6 }}>SUMMARY</p>
          <p style={{ fontSize: '0.82rem', color: '#4a5568', lineHeight: 1.65 }}>{r.summary}</p>
          <p style={{ fontSize: '0.68rem', color: '#c8cdd8', marginTop: 8 }}>
            {new Date(record.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          {/* Delete button */}
          <div style={{ marginTop: 12 }}>
            {deleteError && (
              <p style={{ fontSize: '0.7rem', color: '#f43f5e', marginBottom: 6 }}>{deleteError}</p>
            )}
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#f43f5e' }}>정말 삭제하시겠어요?</span>
                <button onClick={handleDelete} disabled={deleting}
                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#f43f5e', color: '#fff', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, opacity: deleting ? 0.6 : 1 }}>
                  {deleting ? '삭제 중...' : '삭제'}
                </button>
                <button onClick={() => { setConfirmDelete(false); setDeleteError(null); }}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #eaecf2', background: '#fff', color: '#8892a4', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  취소
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #f43f5e22', background: '#fff5f5', color: '#f43f5e', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                기록 삭제
              </button>
            )}
          </div>
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredUids = useMemo(() => {
    if (!searchQuery.trim()) return uids;
    const q = searchQuery.trim().toLowerCase();
    return uids.filter(uid => getDisplayName(uid, userMap).toLowerCase().includes(q));
  }, [uids, searchQuery, userMap]);

  const filteredRecords = useMemo(() =>
    selectedUid ? records.filter(r => r.uid === selectedUid) : records,
    [records, selectedUid]);

  function selectUid(uid: string) {
    setSelectedUid(uid);
    setSelectedRecord(null);
  }

  function handleRecordDeleted(id: number) {
    setRecords(prev => prev.filter(r => r.id !== id));
    setSelectedRecord(null);
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7">
        <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>SKIN ANALYSIS</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>피부 데이터 관리</h1>
      </motion.div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left: customer list + record list */}
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
          style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Customer selector */}
          <div style={CARD}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #eaecf2' }}>
              <p style={{ fontSize: '0.62rem', color: '#b0b8cc', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 8 }}>고객 선택</p>
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b0b8cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="고객명 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '6px 8px 6px 26px',
                    border: '1px solid #eaecf2', borderRadius: 6,
                    fontSize: '0.75rem', color: '#1a1d27',
                    outline: 'none', fontFamily: 'inherit',
                    background: '#f8f9fc',
                  }}
                />
              </div>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {!searchQuery && (
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
              )}
              {loading ? (
                <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center', gap: 4 }}>
                  {[0, 0.12, 0.24].map((d, i) => (
                    <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#d1d5e0' }}
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                  ))}
                </div>
              ) : filteredUids.length === 0 ? (
                <p style={{ padding: '16px 14px', fontSize: '0.75rem', color: '#c8cdd8', textAlign: 'center' }}>검색 결과 없음</p>
              ) : filteredUids.map(uid => {
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
                    <div key={rec.id} style={{ position: 'relative', borderBottom: '1px solid #f5f6fa' }}>
                      <button onClick={() => setSelectedRecord(isActive ? null : rec)}
                        style={{
                          width: '100%', padding: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                          background: isActive ? '#f0f0ff' : 'transparent',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <img src={rec.photo_url} alt=""
                          style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }} />
                        <div style={{ textAlign: 'left', flex: 1, minWidth: 0, paddingRight: 32 }}>
                          <p style={{ fontSize: '0.72rem', fontWeight: 500, color: isActive ? ACCENT : '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.result?.concerns?.slice(0, 2).join(', ') ?? '-'}
                          </p>
                          <p style={{ fontSize: '0.62rem', color: '#b0b8cc' }}>
                            {new Date(rec.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </button>
                      {/* Delete button per record */}
                      <DeleteRecordButton recordId={rec.id} onDeleted={handleRecordDeleted} />
                    </div>
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
              <ResultPanel key={selectedRecord.id} record={selectedRecord} onDelete={handleRecordDeleted} />
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

function DeleteRecordButton({ recordId, onDeleted }: { recordId: number; onDeleted: (id: number) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    setFailed(false);
    const { error } = await supabase.from('analysis_records').delete().eq('id', recordId);
    if (error) {
      setDeleting(false);
      setFailed(true);
      return;
    }
    onDeleted(recordId);
  }

  if (confirm) {
    return (
      <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 3, alignItems: 'center' }}
        onClick={e => e.stopPropagation()}>
        {failed && <span style={{ fontSize: '0.58rem', color: '#f43f5e' }}>실패</span>}
        <button onClick={handleDelete} disabled={deleting}
          style={{ padding: '2px 6px', borderRadius: 4, border: 'none', background: '#f43f5e', color: '#fff', fontSize: '0.62rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, opacity: deleting ? 0.6 : 1 }}>
          {deleting ? '...' : '삭제'}
        </button>
        <button onClick={e => { e.stopPropagation(); setConfirm(false); setFailed(false); }}
          style={{ padding: '2px 4px', borderRadius: 4, border: '1px solid #eaecf2', background: '#fff', color: '#8892a4', fontSize: '0.62rem', cursor: 'pointer', fontFamily: 'inherit' }}>
          취소
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setConfirm(true); }}
      title="기록 삭제"
      style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        padding: '3px', borderRadius: 4, border: 'none', background: 'transparent',
        color: '#d1d5e0', cursor: 'pointer', display: 'flex', alignItems: 'center',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f43f5e'; (e.currentTarget as HTMLElement).style.background = '#fff5f5'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#d1d5e0'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
      </svg>
    </button>
  );
}

export default function PhotosPage() {
  return (
    <Suspense>
      <PhotosContent />
    </Suspense>
  );
}
