import { useState, useRef, useEffect } from 'react';
import { Send, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChatMsg {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

export default function Chat() {
  const { user, team, profile } = useAuth();
  const [tab, setTab] = useState<'team' | 'captain'>('team');
  const [teamMsgs, setTeamMsgs] = useState<ChatMsg[]>([]);
  const [teamRoomId, setTeamRoomId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!team || !user) { setLoading(false); return; }

    const setupChat = async () => {
      // Find or create team chat room
      let { data: room } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('type', 'team')
        .eq('team_id', team.id)
        .maybeSingle();

      if (!room) {
        const { data: newRoom } = await supabase
          .from('chat_rooms')
          .insert({ type: 'team', team_id: team.id })
          .select('id')
          .single();
        room = newRoom;
      }

      if (!room) { setLoading(false); return; }
      setTeamRoomId(room.id);

      // Load messages
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles(name)')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true });

      if (msgs) {
        setTeamMsgs(msgs.map(m => ({
          id: m.id,
          sender: (m.sender as any)?.name || '알 수 없음',
          text: m.text,
          time: formatTime(m.created_at),
          isMe: m.sender_id === user.id,
        })));
      }

      // Real-time subscription
      const channel = supabase
        .channel(`team-chat-${room.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` }, async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;
          const { data: senderData } = await supabase.from('profiles').select('name').eq('id', msg.sender_id).single();
          setTeamMsgs(prev => [...prev, {
            id: msg.id,
            sender: senderData?.name || '알 수 없음',
            text: msg.text,
            time: formatTime(msg.created_at),
            isMe: false,
          }]);
        })
        .subscribe();

      setLoading(false);
      channelRef.current = channel;
    };

    setupChat();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [team, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [teamMsgs]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return `${diffDays}일 전`;
    if (diffDays === 1) return '어제';
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const sendTeamMsg = async () => {
    if (!input.trim() || !teamRoomId || !user) return;
    const text = input.trim();
    setInput('');

    const { data: msg } = await supabase.from('chat_messages').insert({
      room_id: teamRoomId,
      sender_id: user.id,
      text,
    }).select('id, created_at').single();

    if (msg) {
      setTeamMsgs(prev => [...prev, {
        id: msg.id,
        sender: profile?.name || '나',
        text,
        time: formatTime(msg.created_at),
        isMe: true,
      }]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="px-4 py-3 border-b border-white/5"><div className="w-16 h-5 bg-white/5 rounded animate-pulse" /></div>
        <div className="p-4 space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className={`flex ${i % 2 ? 'justify-start' : 'justify-end'}`}>
              <div className="space-y-1">
                {i % 2 ? <div className="w-10 h-3 bg-white/5 rounded animate-pulse ml-1" /> : null}
                <div className="w-44 h-10 bg-white/5 rounded-2xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <p className="text-gray-500 text-sm">팀에 가입하면 채팅을 이용할 수 있습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-0 sticky top-0 z-10 bg-[#0a0a0a]">
        <h1 className="text-2xl font-black text-white mb-3">채팅</h1>
        <div className="flex gap-1 bg-[#111] p-1 rounded-xl mb-3">
          <button onClick={() => setTab('team')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === 'team' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>
            <Users size={14} /> 팀 채팅
          </button>
        </div>
      </div>

      {/* Team Chat */}
      {tab === 'team' && (
        <>
          <div className="flex-1 overflow-auto px-4 space-y-3 pb-2">
            {teamMsgs.length === 0 && (
              <p className="text-center text-gray-600 py-12 text-sm">메시지가 없습니다. 첫 메시지를 보내보세요!</p>
            )}
            {teamMsgs.map(msg => (
              <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  {!msg.isMe && <p className="text-[10px] text-gray-500 mb-0.5 ml-1">{msg.sender}</p>}
                  <div className={`px-3 py-2 rounded-2xl ${msg.isMe ? 'bg-[#7B2D3B] text-white rounded-br-md' : 'bg-[#1a1a1a] text-gray-200 rounded-bl-md'}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <p className={`text-[9px] text-gray-600 mt-0.5 ${msg.isMe ? 'text-right mr-1' : 'ml-1'}`}>{msg.time}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-white/5">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTeamMsg()}
                placeholder="메시지 입력..."
                className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none" />
              <button onClick={sendTeamMsg} className="bg-[#7B2D3B] text-white p-2.5 rounded-xl active:scale-95 transition-transform">
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
