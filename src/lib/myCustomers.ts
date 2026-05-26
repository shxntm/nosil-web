import { supabase } from './supabase';
import { getSession } from './auth';

/** 현재 로그인 병원의 고객 UID 목록 반환. 병원 미설정 시 null 반환 (전체) */
export async function getMyCustomerUids(): Promise<string[] | null> {
  const hospitalId = getSession()?.hospitalId;
  if (!hospitalId) return null;
  const { data } = await supabase
    .from('hospital_customers')
    .select('uid')
    .eq('hospital_id', hospitalId);
  return (data ?? []).map((r: { uid: string }) => r.uid);
}
