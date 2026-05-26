'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearSession } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  {
    href: '/customers', label: '고객 관리',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <circle cx="19" cy="7" r="2"/><path d="M19 13c2 0 3 1.34 3 3v2"/>
      </svg>
    ),
  },
  {
    href: '/appointments', label: '시술 등록',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
      </svg>
    ),
  },
  {
    href: '/schedule', label: '스케줄 관리',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01"/>
      </svg>
    ),
  },
  {
    href: '/pricing', label: '가격 관리',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
    sub: [
      { href: '/pricing', label: '시술 가격 관리' },
      { href: '/pricing/builder', label: '패키지 자동 생성' },
    ],
  },
  {
    href: '/photos', label: '피부 사진',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    ),
  },
  {
    href: '/reviews', label: '리뷰 관리',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10h8M8 14h4"/>
      </svg>
    ),
  },
  {
    href: '/kakao', label: '카카오톡',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: '/settings', label: '설정',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // 현재 경로에 해당하는 서브메뉴 자동 열기
  const toggleMenu = (href: string) => {
    setOpenMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <aside
      className="w-52 flex flex-col shrink-0"
      style={{ height: '100vh', position: 'sticky', top: 0, background: '#ffffff', borderRight: '1px solid #eaecf2' }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #eaecf2' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ background: '#1a1d27' }}>
            N
          </div>
          <div>
            <h1 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1d27', margin: 0, letterSpacing: '-0.01em' }}>노실장</h1>
            <p style={{ fontSize: '0.6rem', color: '#b0b8cc', margin: 0, letterSpacing: '0.1em' }}>ADMIN</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5" style={{ overflowY: 'auto' }}>
        <p style={{ fontSize: '0.6rem', color: '#b0b8cc', letterSpacing: '0.15em', padding: '4px 10px 8px', fontWeight: 500 }}>MENU</p>
        {NAV.map(({ href, label, icon, sub }, i) => {
          const isParentActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
            >
                  {sub ? (
                <button
                  onClick={() => toggleMenu(href)}
                  className="w-full mb-0.5"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                >
                  <div
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm relative transition-all duration-100"
                    style={{
                      color: isParentActive ? '#1a1d27' : '#8892a4',
                      background: isParentActive ? '#f0f1f5' : 'transparent',
                      fontWeight: isParentActive ? 500 : 400,
                    }}
                    onMouseEnter={e => { if (!isParentActive) { (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; (e.currentTarget as HTMLElement).style.color = '#4a5568'; }}}
                    onMouseLeave={e => { if (!isParentActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8892a4'; }}}
                  >
                    {isParentActive && (
                      <motion.div
                        layoutId="sidebarActive"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full"
                        style={{ background: '#1a1d27' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span style={{ color: isParentActive ? '#1a1d27' : 'inherit', flexShrink: 0 }}>{icon}</span>
                    <span style={{ fontSize: '0.8rem', flex: 1 }}>{label}</span>
                    <motion.svg
                      width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      animate={{ rotate: (openMenus[href] ?? isParentActive) ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ flexShrink: 0, opacity: 0.5 }}
                    >
                      <path d="M9 18l6-6-6-6"/>
                    </motion.svg>
                  </div>
                </button>
              ) : (
                <Link href={href} className="block mb-0.5">
                  <div
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm relative transition-all duration-100"
                    style={{
                      color: isParentActive ? '#1a1d27' : '#8892a4',
                      background: isParentActive ? '#f0f1f5' : 'transparent',
                      fontWeight: isParentActive ? 500 : 400,
                    }}
                    onMouseEnter={e => { if (!isParentActive) { (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; (e.currentTarget as HTMLElement).style.color = '#4a5568'; }}}
                    onMouseLeave={e => { if (!isParentActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8892a4'; }}}
                  >
                    {isParentActive && (
                      <motion.div
                        layoutId="sidebarActive"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full"
                        style={{ background: '#1a1d27' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span style={{ color: isParentActive ? '#1a1d27' : 'inherit', flexShrink: 0 }}>{icon}</span>
                    <span style={{ fontSize: '0.8rem' }}>{label}</span>
                  </div>
                </Link>
              )}

              {/* Sub menu */}
              <AnimatePresence initial={false}>
                {sub && (openMenus[href] ?? isParentActive) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', marginBottom: 4, marginLeft: 10 }}
                  >
                    {sub.map(s => {
                      const subActive = pathname === s.href;
                      return (
                        <Link key={s.href} href={s.href} className="block">
                          <div
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 10px 6px 14px',
                              borderLeft: `2px solid ${subActive ? '#6366f1' : '#eaecf2'}`,
                              color: subActive ? '#6366f1' : '#8892a4',
                              fontSize: '0.75rem',
                              fontWeight: subActive ? 500 : 400,
                              borderRadius: '0 6px 6px 0',
                              background: subActive ? '#f0f0ff' : 'transparent',
                              marginBottom: 2,
                              transition: 'all 0.1s',
                            }}
                            onMouseEnter={e => { if (!subActive) { (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; (e.currentTarget as HTMLElement).style.color = '#4a5568'; }}}
                            onMouseLeave={e => { if (!subActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8892a4'; }}}
                          >
                            {s.label}
                          </div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </nav>

      <div className="px-3 py-4" style={{ borderTop: '1px solid #eaecf2', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #eaecf2',
            background: 'transparent', color: '#8892a4', fontSize: '0.75rem', cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8f9fc'; (e.currentTarget as HTMLElement).style.color = '#4a5568'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8892a4'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          로그아웃
        </button>
        <p style={{ fontSize: '0.6rem', color: '#c8cdd8', paddingLeft: 2 }}>v1.0.0</p>
      </div>
    </aside>
  );
}
