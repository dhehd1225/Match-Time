import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/types';

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        setNotifications(data);
        setPendingCount(data.filter(n => n.status === 'pending').length);
      }
    };

    load();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`notif:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        load(); // Reload on any change
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const updateStatus = async (id: string, status: 'accepted' | 'rejected') => {
    await supabase.from('notifications').update({ status }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status } : n));
    setPendingCount(prev => Math.max(0, prev - 1));
  };

  return { notifications, pendingCount, updateStatus };
}
