'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { TREATMENTS, CATEGORIES, getCategoryName } from '@/data/treatments';
import { getSession } from '@/lib/auth';

type PriceRow = { treatment_name: string; price_1: number; price_3: number; price_5: number; price_10: number };

const CARD = { background: '#ffffff', border: '1px solid #eaecf2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as const;

const DEFAULT_PRICES: PriceRow[] = TREATMENTS.map(t => {
  const base = parseInt(t.price.replace(/[^0-9]/g, '')) * 10000 || 100000;
  return { treatment_name: t.name, price_1: base, price_3: Math.round(base * 2.7), price_5: Math.round(base * 4.2), price_10: Math.round(base * 7.5) };
});

export default function PricingPage() {
  const [prices, setPrices] = useState<PriceRow[]>(DEFAULT_PRICES);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    const hospitalId = getSession()?.hospitalId;
    const query = hospitalId
      ? supabase.from('treatment_prices').select('*').eq('hospital_id', hospitalId)
      : supabase.from('treatment_prices').select('*');
    query.then(({ data }) => {
      if (data && data.length > 0) {
        const dbMap: Record<string, PriceRow> = {};
        data.forEach((r: any) => { dbMap[r.treatment_name] = r; });
        setPrices(DEFAULT_PRICES.map(d => dbMap[d.treatment_name] ?? d));
      }
      setLoadingPrices(false);
    });
  }, []);

  async function savePrices() {
    const hospitalId = getSession()?.hospitalId;
    setSaving(true);
    const { error } = await supabase.from('treatment_prices').upsert(
      prices.map(({ treatment_name, price_1, price_3, price_5, price_10 }) => ({
        treatment_name, price_1, price_3, price_5, price_10,
        ...(hospitalId ? { hospital_id: hospitalId } : {}),
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'hospital_id,treatment_name' }
    );
    setSaving(false);
    setSavedMsg(error ? '저장 실패: ' + error.message : '저장 완료');
    setTimeout(() => setSavedMsg(''), 3000);
  }

  function updatePrice(name: string, field: keyof PriceRow, value: number) {
    setPrices(prev => prev.map(p => p.treatment_name === name ? { ...p, [field]: value } : p));
  }

  const filteredPrices = priceFilter
    ? prices.filter(p => TREATMENTS.find(t => t.name === p.treatment_name)?.category === priceFilter)
    : prices;
  const totalPages = Math.ceil(filteredPrices.length / PAGE_SIZE);
  const pagedPrices = filteredPrices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7">
        <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>PRICING</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>시술 가격 관리</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
          <select value={priceFilter} onChange={e => { setPriceFilter(e.target.value); setPage(1); }}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e2e6ef', background: '#fff', fontSize: '0.82rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit', appearance: 'none' }}>
            <option value="">전체 카테고리</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
          <span style={{ fontSize: '0.75rem', color: '#b0b8cc' }}>{filteredPrices.length}개 시술</span>
          <div style={{ flex: 1 }} />
          {savedMsg && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ fontSize: '0.75rem', color: savedMsg.includes('실패') ? '#f43f5e' : '#10b981', fontWeight: 500 }}>
              {savedMsg}
            </motion.span>
          )}
          <motion.button onClick={savePrices} disabled={saving || loadingPrices} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: saving ? '#d1d5e0' : '#1a1d27', color: '#fff', fontSize: '0.82rem', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? '저장 중...' : '가격 저장'}
          </motion.button>
        </div>

        <div style={{ ...CARD, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ background: '#f8f9fc' }}>
                  {['시술명', '카테고리', '1회', '3회', '5회', '10회'].map((h, i) => (
                    <th key={h} style={{ textAlign: i > 1 ? 'right' : 'left', padding: '10px 14px', fontSize: '0.68rem', fontWeight: 600, color: '#8892a4', letterSpacing: '0.08em', borderBottom: '1px solid #eaecf2' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingPrices ? (
                  <tr><td colSpan={6} style={{ padding: '32px 0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {[0, 0.12, 0.24].map((d, i) => (
                        <motion.div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5e0' }}
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                          transition={{ duration: 0.7, delay: d, repeat: Infinity }} />
                      ))}
                    </div>
                  </td></tr>
                ) : pagedPrices.map(p => {
                  const t = TREATMENTS.find(tr => tr.name === p.treatment_name);
                  return (
                    <tr key={p.treatment_name} style={{ borderBottom: '1px solid #f5f6fa' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8f9fc'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td style={{ padding: '9px 14px', fontSize: '0.82rem', fontWeight: 500, color: '#1a1d27' }}>{p.treatment_name}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, background: '#f0f1f5', color: '#4a5568' }}>{t ? getCategoryName(t.category) : '-'}</span>
                      </td>
                      {(['price_1', 'price_3', 'price_5', 'price_10'] as const).map(field => (
                        <td key={field} style={{ padding: '7px 14px', textAlign: 'right' }}>
                          <input type="number" value={p[field]} step={10000}
                            onChange={e => updatePrice(p.treatment_name, field, Number(e.target.value))}
                            style={{ width: 100, padding: '5px 8px', border: '1.5px solid #e2e6ef', borderRadius: 6, fontSize: '0.78rem', color: '#1a1d27', textAlign: 'right', outline: 'none', fontFamily: 'inherit', background: '#fff' }}
                            onFocus={e => (e.target.style.borderColor = '#6366f1')}
                            onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 16px', borderTop: '1px solid #eaecf2' }}>
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
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
