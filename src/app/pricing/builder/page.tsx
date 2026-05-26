'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { TREATMENTS, getCategoryName } from '@/data/treatments';
import { getSession } from '@/lib/auth';

type PriceRow = { treatment_name: string; price_1: number; price_3: number; price_5: number; price_10: number };
type PackageItem = { name: string; sessions: number; unitPrice: number; totalPrice: number; category: string; concerns: string[]; interval: number };

const CARD = { background: '#ffffff', border: '1px solid #eaecf2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as const;

function formatWon(n: number) {
  if (n >= 10000) return `${Math.round(n / 10000)}만원`;
  return `${n.toLocaleString()}원`;
}

const DEFAULT_PRICES: PriceRow[] = TREATMENTS.map(t => {
  const base = parseInt(t.price.replace(/[^0-9]/g, '')) * 10000 || 100000;
  return { treatment_name: t.name, price_1: base, price_3: Math.round(base * 2.7), price_5: Math.round(base * 4.2), price_10: Math.round(base * 7.5) };
});

export default function PackageBuilderPage() {
  const [prices, setPrices] = useState<PriceRow[]>(DEFAULT_PRICES);
  const [budget, setBudget] = useState(3000000);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [concernInput, setConcernInput] = useState('');
  const [generatedPackage, setGeneratedPackage] = useState<PackageItem[] | null>(null);

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
    });
  }, []);

  const allConcerns = [...new Set(TREATMENTS.flatMap(t => t.concerns))];
  const suggestions = allConcerns.filter(c => !concerns.includes(c) && (concernInput === '' || c.includes(concernInput))).slice(0, 8);

  function generatePackage() {
    const scored = TREATMENTS.map(t => ({
      treatment: t,
      score: t.concerns.filter(c => concerns.some(uc => c.includes(uc) || uc.includes(c))).length,
    })).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    const result: PackageItem[] = [];
    let remaining = budget;
    const usedCats = new Set<string>();

    for (const { treatment: t } of scored) {
      if (remaining <= 0) break;
      const pd = prices.find(p => p.treatment_name === t.name);
      if (!pd) continue;
      if (result.some(r => t.avoid.some(a => r.name.includes(a) || a.includes(r.name)))) continue;
      const priority = usedCats.has(t.category) ? 0.5 : 1;
      for (const opt of [
        { sessions: 10, total: pd.price_10, unit: pd.price_10 / 10 },
        { sessions: 5, total: pd.price_5, unit: pd.price_5 / 5 },
        { sessions: 3, total: pd.price_3, unit: pd.price_3 / 3 },
        { sessions: 1, total: pd.price_1, unit: pd.price_1 },
      ]) {
        if (opt.total * priority <= remaining) {
          result.push({ name: t.name, sessions: opt.sessions, unitPrice: opt.unit, totalPrice: opt.total, category: t.category, concerns: t.concerns, interval: t.interval });
          remaining -= opt.total;
          usedCats.add(t.category);
          break;
        }
      }
    }
    setGeneratedPackage(result);
  }

  const totalPackagePrice = generatedPackage?.reduce((s, p) => s + p.totalPrice, 0) ?? 0;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7">
        <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>PRICING</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>패키지 자동 생성</h1>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={CARD}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #eaecf2' }}>
              <p style={{ fontSize: '0.65rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 2, fontWeight: 500 }}>BUDGET</p>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>예산 설정</h3>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', color: '#8892a4' }}>예산</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#6366f1' }}>{formatWon(budget)}</span>
              </div>
              <input type="range" min={500000} max={10000000} step={100000} value={budget} onChange={e => setBudget(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#6366f1' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.65rem', color: '#c8cdd8' }}>50만원</span>
                <span style={{ fontSize: '0.65rem', color: '#c8cdd8' }}>1,000만원</span>
              </div>
            </div>
          </div>

          <div style={CARD}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #eaecf2' }}>
              <p style={{ fontSize: '0.65rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 2, fontWeight: 500 }}>CONCERNS</p>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>피부 고민</h3>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input type="text" value={concernInput} onChange={e => setConcernInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (concernInput.trim() && !concerns.includes(concernInput.trim())) { setConcerns(prev => [...prev, concernInput.trim()]); setConcernInput(''); } } }}
                  placeholder="예: 모공, 흉터, 기미..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e6ef', fontSize: '0.82rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#e2e6ef')} />
                <button onClick={() => { if (concernInput.trim() && !concerns.includes(concernInput.trim())) { setConcerns(p => [...p, concernInput.trim()]); setConcernInput(''); }}}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #eaecf2', background: '#f8f9fc', color: '#4a5568', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>추가</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                {concerns.map(c => (
                  <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1', fontSize: '0.75rem', fontWeight: 500 }}>
                    {c}
                    <button onClick={() => setConcerns(p => p.filter(x => x !== c))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc', fontSize: '0.75rem', padding: 0 }}>✕</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {suggestions.map(c => (
                  <button key={c} onClick={() => setConcerns(p => [...p, c])}
                    style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid #e2e6ef', background: '#fff', color: '#8892a4', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                    + {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <motion.button onClick={generatePackage} disabled={concerns.length === 0} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            style={{ padding: '12px', borderRadius: 10, border: 'none', background: concerns.length === 0 ? '#f0f1f5' : '#1a1d27', color: concerns.length === 0 ? '#c8cdd8' : '#fff', fontSize: '0.88rem', fontWeight: 600, cursor: concerns.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            최적 패키지 생성
          </motion.button>
        </div>

        <div>
          {generatedPackage === null ? (
            <div style={{ ...CARD, padding: '60px 0', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#c8cdd8' }}>예산과 고민을 입력 후 생성해주세요.</p>
            </div>
          ) : generatedPackage.length === 0 ? (
            <div style={{ ...CARD, padding: '60px 0', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#c8cdd8' }}>조건에 맞는 시술을 찾을 수 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={CARD}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #eaecf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>추천 패키지</h3>
                  <span style={{ fontSize: '0.72rem', color: '#6366f1', background: '#f0f0ff', padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>총 {formatWon(totalPackagePrice)}</span>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                  {generatedPackage.map((item, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      style={{ padding: '12px 14px', borderRadius: 8, background: '#f8f9fc', border: '1px solid #eaecf2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1a1d27', marginBottom: 2 }}>{item.name}</p>
                          <p style={{ fontSize: '0.68rem', color: '#b0b8cc' }}>{getCategoryName(item.category)} · {item.interval}주 간격</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#6366f1' }}>{formatWon(item.totalPrice)}</p>
                          <p style={{ fontSize: '0.68rem', color: '#b0b8cc' }}>{item.sessions}회 ({formatWon(item.unitPrice)}/회)</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {item.concerns.map(c => (
                          <span key={c} style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 10, background: concerns.some(uc => c.includes(uc) || uc.includes(c)) ? '#f0f0ff' : '#f0f1f5', color: concerns.some(uc => c.includes(uc) || uc.includes(c)) ? '#6366f1' : '#8892a4' }}>{c}</span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div style={{ ...CARD, padding: '14px 18px' }}>
                {[
                  { label: '예산', value: formatWon(budget), color: '#4a5568' },
                  { label: '패키지 합계', value: formatWon(totalPackagePrice), color: '#1a1d27' },
                  { label: '잔여 예산', value: formatWon(budget - totalPackagePrice), color: '#10b981' },
                ].map((row, i) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: i > 0 ? '6px 0 0' : '0', borderTop: i === 2 ? '1px solid #eaecf2' : 'none', marginTop: i === 2 ? 8 : 0 }}>
                    <span style={{ fontSize: '0.8rem', color: '#8892a4' }}>{row.label}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: i === 2 ? 700 : 500, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
