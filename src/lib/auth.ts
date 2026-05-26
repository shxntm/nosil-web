import Cookies from 'js-cookie';

const KEY = 'nosil_session';

export type Session = { name: string; hospitalId: number };

export function getSession(): Session | null {
  try {
    const raw = Cookies.get(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session) {
  Cookies.set(KEY, JSON.stringify(session), { expires: 30, sameSite: 'strict' });
}

export function clearSession() {
  Cookies.remove(KEY);
}
