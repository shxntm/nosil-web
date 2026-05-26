'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { setSession } from '@/lib/auth';

const BALLS = [
  { size: 120, x: '15%', y: '20%', color: 'rgba(99,102,241,0.35)', duration: 7, delay: 0 },
  { size: 80, x: '60%', y: '10%', color: 'rgba(59,130,246,0.4)', duration: 9, delay: 1 },
  { size: 160, x: '75%', y: '55%', color: 'rgba(99,102,241,0.2)', duration: 11, delay: 0.5 },
  { size: 60, x: '30%', y: '65%', color: 'rgba(147,197,253,0.5)', duration: 8, delay: 2 },
  { size: 100, x: '50%', y: '80%', color: 'rgba(59,130,246,0.25)', duration: 10, delay: 1.5 },
  { size: 50, x: '85%', y: '25%', color: 'rgba(165,180,252,0.5)', duration: 6, delay: 0.8 },
  { size: 90, x: '10%', y: '80%', color: 'rgba(96,165,250,0.3)', duration: 12, delay: 3 },
];

export default function LoginPage() {
  const [hospitalName, setHospitalName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hospitalName.trim() || !password.trim()) {
      setError('병원 이름과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: dbError } = await supabase
      .from('hospital_auth')
      .select('password_hash, hospital_id')
      .eq('hospital_name', hospitalName.trim())
      .single();
    if (dbError || !data) {
      setError('등록되지 않은 병원 이름입니다.');
      setLoading(false);
      return;
    }
    if (data.password_hash === password) {
      setSession({ name: hospitalName.trim(), hospitalId: data.hospital_id });
      router.push('/');
    } else {
      setError('비밀번호가 올바르지 않습니다.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left: floating balls — 모바일에서는 상단 고정 높이, md 이상에서는 절반 */}
      <motion.div
        className="relative overflow-hidden md:w-1/2"
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #1a1d3a 100%)',
          minHeight: '220px',
          flex: '0 0 auto',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating balls */}
        {BALLS.map((b, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              background: b.color,
              left: b.x,
              top: b.y,
              filter: 'blur(1px)',
              boxShadow: `0 0 ${b.size * 0.6}px ${b.color}`,
            }}
            animate={{
              y: [0, -30, 10, -20, 0],
              x: [0, 10, -15, 5, 0],
              scale: [1, 1.05, 0.95, 1.02, 1],
            }}
            transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Logo */}
        <div className="absolute inset-0 flex flex-col justify-center items-center" style={{ zIndex: 10 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{ textAlign: 'center' }}
          >
            <Image
              src="/home-logo2.png"
              alt="노실장 로고"
              width={140}
              height={140}
              className="w-24 h-24 md:w-36 md:h-36"
              style={{ objectFit: 'contain', margin: '0 auto 12px', display: 'block' }}
            />

            <p style={{ fontSize: '0.78rem', color: 'rgba(148,163,184,0.6)', letterSpacing: '0.08em' }}>
              노실장 어드민            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right: login form */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-10 md:py-0"
        style={{ background: '#f5f6fa' }}
      >
        <motion.div
          className="w-full"
          style={{ maxWidth: 360 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.34, 1.1, 0.64, 1] }}
        >
          <div className="mb-8">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1a1d27', marginBottom: 6, letterSpacing: '-0.02em' }}>
              로그인
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#8892a4' }}>병원 관리 시스템에 오신 것을 환영합니다.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#4a5568', marginBottom: 6 }}>
                병원 이름
              </label>
              <input
                type="text"
                value={hospitalName}
                onChange={e => setHospitalName(e.target.value)}
                placeholder="병원명을 입력하세요"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #e2e6ef', background: '#ffffff',
                  color: '#1a1d27', fontSize: '0.88rem', outline: 'none',
                  transition: 'border-color 0.15s', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = '#e2e6ef')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#4a5568', marginBottom: 6 }}>
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid #e2e6ef', background: '#ffffff',
                  color: '#1a1d27', fontSize: '0.88rem', outline: 'none',
                  transition: 'border-color 0.15s', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = '#e2e6ef')}
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: '0.78rem', color: '#ef4444', paddingLeft: 2 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                width: '100%', padding: '11px', borderRadius: 10,
                background: loading ? '#9ca3af' : '#1a1d27', color: '#ffffff',
                fontSize: '0.88rem', fontWeight: 500, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em', fontFamily: 'inherit', marginTop: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}
                  />
                  로그인 중...
                </>
              ) : '로그인'}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#b0b8cc', marginTop: 28 }}>
            병원 관리 시스템 v1.0
          </p>
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#b0b8cc', marginTop: 12, lineHeight: 1.6 }}>
            로그인이 되지 않으시면 관리자에게 문의 바랍니다.<br />
            <a href="mailto:tmxkvnfmxm@gmail.com" style={{ color: '#6366f1', textDecoration: 'none' }}>tmxkvnfmxm@gmail.com</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
