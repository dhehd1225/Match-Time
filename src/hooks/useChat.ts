import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ChatMessage } from '../lib/types';

export function useChat(roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) { setLoading(false); return; }

    // Load existing messages
    const loadMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles(id, name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
      setLoading(false);
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        // Fetch the full message with sender info
        const { data } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles(id, name, avatar_url)')
          .eq('id', payload.new.id)
          .single();

        if (data) {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data];
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const sendMessage = useCallback(async (text: string, senderId: string) => {
    if (!roomId || !text.trim()) return;
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_id: senderId,
      text: text.trim(),
    });
  }, [roomId]);

  return { messages, loading, sendMessage };
}
