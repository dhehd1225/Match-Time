import { supabase } from '../lib/supabase';

let currentUserId: string | null = null;

export function setAnalyticsUser(userId: string | null) {
  currentUserId = userId;
}

export async function trackEvent(event: string, metadata?: Record<string, any>) {
  try {
    await supabase.from('analytics_events').insert({
      user_id: currentUserId,
      event,
      metadata: metadata || null,
    });
  } catch {
    // 트래킹 실패해도 앱에 영향 없음
  }
}
