import { supabase } from './supabase';

export type UserMap = Record<string, string>; // uid → displayName

export async function fetchUserMap(): Promise<UserMap> {
  const { data } = await supabase.from('users').select('id, nickname');
  const map: UserMap = {};
  for (const u of data ?? []) {
    // kakao:4910042793 → "신윤수-4910042793"
    const kakaoId = u.id.startsWith('kakao:') ? u.id.replace('kakao:', '') : u.id;
    map[u.id] = u.nickname ? `${u.nickname}-${kakaoId}` : kakaoId;
  }
  return map;
}

export function getDisplayName(uid: string, userMap: UserMap): string {
  if (userMap[uid]) return userMap[uid];
  // 매핑 없으면 uid 앞부분
  return uid.startsWith('kakao:') ? uid.replace('kakao:', '') : uid.slice(0, 12);
}
