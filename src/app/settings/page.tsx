'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
const CARD = { background: '#ffffff', border: '1px solid #eaecf2', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as const;

type Doctor = { id: number; name: string };

export default function SettingsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [addingDoctor, setAddingDoctor] = useState(false);
  const [deletingDoctorId, setDeletingDoctorId] = useState<number | null>(null);
  const [doctorFocused, setDoctorFocused] = useState(false);

  const hospitalId = getSession()?.hospitalId;

  useEffect(() => {
    if (!hospitalId) return;
    supabase.from('doctors').select('id, name').eq('hospital_id', hospitalId).order('created_at').then(({ data }) => {
      if (data) setDoctors(data);
    });
  }, [hospitalId]);

  async function handleAddDoctor() {
    if (!newDoctorName.trim() || !hospitalId) return;
    setAddingDoctor(true);
    const { data } = await supabase.from('doctors').insert({ hospital_id: hospitalId, name: newDoctorName.trim() }).select('id, name').single();
    if (data) setDoctors(prev => [...prev, data]);
    setNewDoctorName('');
    setAddingDoctor(false);
  }

  async function handleDeleteDoctor(id: number) {
    setDeletingDoctorId(id);
    await supabase.from('doctors').delete().eq('id', id);
    setDoctors(prev => prev.filter(d => d.id !== id));
    setDeletingDoctorId(null);
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7">
        <p style={{ fontSize: '0.7rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 4, fontWeight: 500 }}>SETTINGS</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1a1d27', letterSpacing: '-0.02em', margin: 0 }}>설정</h1>
      </motion.div>

      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Doctors */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={CARD}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #eaecf2' }}>
            <p style={{ fontSize: '0.65rem', color: '#b0b8cc', letterSpacing: '0.15em', marginBottom: 2, fontWeight: 500 }}>DOCTORS</p>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0 }}>원장 관리</h2>
          </div>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {doctors.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: '#c8cdd8', textAlign: 'center', padding: '8px 0' }}>등록된 원장이 없습니다.</p>
            )}
            {doctors.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, background: '#f8f9fc', border: '1px solid #eaecf2' }}>
                <span style={{ fontSize: '0.85rem', color: '#1a1d27', fontWeight: 500 }}>{d.name} 원장</span>
                <button onClick={() => handleDeleteDoctor(d.id)} disabled={deletingDoctorId === d.id}
                  style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #eaecf2', background: '#fff', color: deletingDoctorId === d.id ? '#c8cdd8' : '#f43f5e', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {deletingDoctorId === d.id ? '삭제 중…' : '삭제'}
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="text"
                value={newDoctorName}
                onChange={e => setNewDoctorName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddDoctor()}
                placeholder="원장 이름 입력"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${doctorFocused ? '#6366f1' : '#e2e6ef'}`, background: '#fff', fontSize: '0.85rem', color: '#1a1d27', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                onFocus={() => setDoctorFocused(true)}
                onBlur={() => setDoctorFocused(false)}
              />
              <button onClick={handleAddDoctor} disabled={addingDoctor || !newDoctorName.trim()}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: newDoctorName.trim() ? '#6366f1' : '#e2e6ef', color: newDoctorName.trim() ? '#fff' : '#b0b8cc', fontSize: '0.82rem', fontWeight: 500, cursor: newDoctorName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background 0.15s' }}>
                {addingDoctor ? '추가 중…' : '추가'}
              </button>
            </div>
          </div>
        </motion.div>


      </div>
    </div>
  );
}
