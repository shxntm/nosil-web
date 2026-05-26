'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import ConfirmDialog from '@/components/ConfirmDialog';

type Review = {
  id: number;
  hospital_id: number;
  hospital_name: string;
  uid: string;
  rating: number;
  text: string;
  review_type: string;
  doctor_name: string | null;
  photo_paths: string[] | null;
  created_at: string;
};

const CARD = { background: '#ffffff', border: '1px solid #eaecf2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as const;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24"
          fill={i < rating ? '#f59e0b' : 'transparent'}
          stroke={i < rating ? '#f59e0b' : '#d1d5db'} strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    const hospitalId = getSession()?.hospitalId;
    if (!hospitalId) { setLoading(false); return; }

    const { data } = await supabase
      .from('reviews')
      .select('id, hospital_id, uid, rating, text, review_type, doctor_name, photo_paths, created_at')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    const { data: hosp } = await supabase.from('hospitals').select('id,name').eq('id', hospitalId).single();
    const hospitalName = hosp?.name ?? '알 수 없는 병원';

    setReviews(data.map((r: any) => ({ ...r, hospital_name: hospitalName })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function doDelete(id: number) {
    setDeleteTarget(null);
    setDeleting(id);
    await supabase.from('reviews').delete().eq('id', id);
    setReviews(prev => prev.filter(r => r.id !== id));
    setDeleting(null);
  }

  const filtered = reviews.filter(r => {
    if (filterRating > 0 && r.rating !== filterRating) return false;
    if (filterType && r.review_type !== filterType) return false;
    if (search && !r.text?.includes(search) && !r.hospital_name.includes(search)) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7">
        <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>REVIEWS</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>리뷰 관리</h1>
      </motion.div>

      {/* Stats */}
      {/* <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: '전체 리뷰', value: reviews.length, unit: '건', color: '#6366f1', bg: '#f0f0ff' },
          { label: '평균 별점', value: avgRating.toFixed(1), unit: '/ 5', color: '#f59e0b', bg: '#fffbeb' },
          { label: '영수증 리뷰', value: reviews.filter(r => r.review_type === 'receipt').length, unit: '건', color: '#10b981', bg: '#f0fdf8' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ ...CARD, padding: '16px 20px' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: s.color }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a1d27', letterSpacing: '-0.03em' }}>{s.value}</span>
              <span style={{ fontSize: '0.72rem', color: '#b0b8cc' }}>{s.unit}</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#8892a4', marginTop: 2 }}>{s.label}</p>
          </motion.div>
        ))}
      </div> */}

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ ...CARD, padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#b0b8cc' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input type="text" placeholder="병원명 또는 리뷰 내용 검색" value={search} onChange={e => handleFilterChange(() => setSearch(e.target.value))}
            style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fff', fontSize: '0.8rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            onFocus={e => (e.target.style.borderColor = '#6366f1')}
            onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2, 3, 4, 5].map(r => (
            <button key={r} onClick={() => handleFilterChange(() => setFilterRating(filterRating === r ? 0 : r))}
              style={{ padding: '5px 10px', borderRadius: 20, border: `1.5px solid ${filterRating === r ? '#f59e0b' : '#e2e6ef'}`, background: filterRating === r ? '#fffbeb' : '#fff', color: filterRating === r ? '#f59e0b' : '#8892a4', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: filterRating === r ? 600 : 400 }}>
              {r === 0 ? '전체' : `★${r}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['', '전체'], ['general', '일반'], ['receipt', '영수증']].map(([v, l]) => (
            <button key={v} onClick={() => handleFilterChange(() => setFilterType(filterType === v ? '' : v))}
              style={{ padding: '5px 10px', borderRadius: 20, border: `1.5px solid ${filterType === v ? '#6366f1' : '#e2e6ef'}`, background: filterType === v ? '#f0f0ff' : '#fff', color: filterType === v ? '#6366f1' : '#8892a4', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: filterType === v ? 600 : 400 }}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '0.72rem', color: '#b0b8cc' }}>{filtered.length}건</span>
        {/* 개수 선택 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.72rem', color: '#b0b8cc' }}>표시</span>
          {PAGE_SIZE_OPTIONS.map(n => (
            <button key={n} onClick={() => { setPageSize(n); setPage(1); }}
              style={{ padding: '4px 10px', borderRadius: 6, border: `1.5px solid ${pageSize === n ? '#6366f1' : '#e2e6ef'}`, background: pageSize === n ? '#f0f0ff' : '#fff', color: pageSize === n ? '#6366f1' : '#8892a4', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: pageSize === n ? 600 : 400 }}>
              {n}개
            </button>
          ))}
        </div>
      </motion.div>

      {/* Review list */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={CARD}>
        {loading ? (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center', gap: 5 }}>
            {[0, 0.12, 0.24].map((d, i) => (
              <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: '#c8cdd8', textAlign: 'center', padding: '40px 0' }}>리뷰가 없습니다.</p>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {paged.map((r, i) => (
                  <div key={r.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f5f6fa', display: 'flex', gap: 16 }}>
                    <div style={{ width: 140, flexShrink: 0 }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1d27', marginBottom: 2 }}>{r.hospital_name}</p>
                      <p style={{ fontSize: '0.68rem', color: '#b0b8cc', fontFamily: 'monospace', marginBottom: 6 }}>{r.uid?.slice(0, 10)}…</p>
                      <Stars rating={r.rating} />
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        {r.review_type === 'receipt' && (
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 10, background: '#f0fdf8', color: '#10b981', fontWeight: 600 }}>영수증</span>
                        )}
                        {r.doctor_name && (
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 10, background: '#f0f0ff', color: '#6366f1' }}>{r.doctor_name} 원장</span>
                        )}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', color: '#4a5568', lineHeight: 1.6, marginBottom: r.photo_paths?.length ? 8 : 0 }}>
                        {r.text || '(내용 없음)'}
                      </p>
                      {r.photo_paths && r.photo_paths.length > 0 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {r.photo_paths.map((path, pi) => {
                            const url = supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl;
                            return <img key={pi} src={url} alt="" style={{ width: 56, height: 56, borderRadius: 6, objectFit: 'cover', border: '1px solid #eaecf2' }} />;
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <p style={{ fontSize: '0.68rem', color: '#c8cdd8' }}>
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </p>
                      <button onClick={() => setDeleteTarget(r.id)} disabled={deleting === r.id}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #eaecf2', background: '#fff', color: deleting === r.id ? '#c8cdd8' : '#f43f5e', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {deleting === r.id ? '삭제 중…' : '삭제'}
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '14px 16px', borderTop: '1px solid #eaecf2' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #eaecf2', background: page === 1 ? '#f8f9fc' : '#fff', color: page === 1 ? '#c8cdd8' : '#4a5568', fontSize: '0.75rem', cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid', borderColor: page === n ? '#6366f1' : '#eaecf2', background: page === n ? '#6366f1' : '#fff', color: page === n ? '#fff' : '#4a5568', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: page === n ? 600 : 400 }}>
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #eaecf2', background: page === totalPages ? '#f8f9fc' : '#fff', color: page === totalPages ? '#c8cdd8' : '#4a5568', fontSize: '0.75rem', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  다음
                </button>
                <span style={{ fontSize: '0.7rem', color: '#b0b8cc', marginLeft: 8 }}>{page} / {totalPages} 페이지</span>
              </div>
            )}
          </>
        )}
      </motion.div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="리뷰 삭제"
        description="이 리뷰를 삭제할까요? 되돌릴 수 없습니다."
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={() => deleteTarget !== null && doDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
