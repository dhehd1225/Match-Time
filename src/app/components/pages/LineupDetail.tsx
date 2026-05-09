import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, Users, Check, X, Plus, UserPlus, ArrowLeftRight, Copy, Send, MessageCircle } from 'lucide-react';
import JerseyIcon from '../JerseyIcon';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match } from '../../../lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PlayerInfo {
  id: string;
  name: string;
  number: number;
  position: string;
  status: 'attending' | 'not-attending' | null;
  type?: 'regular' | 'mercenary' | 'rookie';
}

type Quarter = '1Q' | '2Q' | '3Q' | '4Q';
const quarters: Quarter[] = ['1Q', '2Q', '3Q', '4Q'];

const formations: Record<string, { x: number; y: number }[]> = {
  '4-3-3': [{ x: 50, y: 90 },{ x: 20, y: 70 },{ x: 40, y: 70 },{ x: 60, y: 70 },{ x: 80, y: 70 },{ x: 30, y: 45 },{ x: 50, y: 45 },{ x: 70, y: 45 },{ x: 30, y: 20 },{ x: 50, y: 20 },{ x: 70, y: 20 }],
  '4-4-2': [{ x: 50, y: 90 },{ x: 20, y: 70 },{ x: 40, y: 70 },{ x: 60, y: 70 },{ x: 80, y: 70 },{ x: 20, y: 45 },{ x: 40, y: 45 },{ x: 60, y: 45 },{ x: 80, y: 45 },{ x: 40, y: 20 },{ x: 60, y: 20 }],
  '3-4-3': [{ x: 50, y: 90 },{ x: 30, y: 70 },{ x: 50, y: 70 },{ x: 70, y: 70 },{ x: 20, y: 45 },{ x: 40, y: 45 },{ x: 60, y: 45 },{ x: 80, y: 45 },{ x: 30, y: 20 },{ x: 50, y: 20 },{ x: 70, y: 20 }],
  '3-3-1': [{ x: 50, y: 90 },{ x: 25, y: 70 },{ x: 50, y: 70 },{ x: 75, y: 70 },{ x: 30, y: 45 },{ x: 50, y: 45 },{ x: 70, y: 45 },{ x: 50, y: 20 }],
};

const posColors: Record<string, string> = { GK: 'text-yellow-500', DF: 'text-blue-400', MF: 'text-emerald-400', FW: 'text-red-400' };

export default function LineupDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, team, isPresident, profile } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'formation' | 'chat'>('members');
  const [formation, setFormation] = useState('4-3-3');
  const [activeQuarter, setActiveQuarter] = useState<Quarter>('1Q');
  const [myAttendance, setMyAttendance] = useState<'attending' | 'not-attending' | null>(null);

  const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);
  const [quarterLineups, setQuarterLineups] = useState<Record<Quarter, (string | null)[]>>({
    '1Q': [], '2Q': [], '3Q': [], '4Q': [],
  });
  const [selectedSlot, setSelectedSlot] = useState<{ type: 'field' | 'bench'; index: number } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPos, setNewPos] = useState('MF');
  const [newType, setNewType] = useState<'mercenary' | 'rookie'>('mercenary');

  // Chat
  interface ChatMsg { id: string; sender: string; text: string; time: string; isMe: boolean; }
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!id || !team) { setLoading(false); return; }

    const fetchAll = async () => {
      // Fetch match
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id)
        .single();
      if (matchData) setMatch(matchData);

      // Fetch team members + attendance
      const { data: membersData } = await supabase
        .from('team_members')
        .select('*, profile:profiles(*)')
        .eq('team_id', team.id);

      const { data: attData } = await supabase
        .from('match_attendance')
        .select('*')
        .eq('match_id', id);

      if (membersData) {
        const attMap = new Map<string, string>();
        attData?.forEach(a => attMap.set(a.user_id, a.status));

        const playersList: PlayerInfo[] = membersData.map(m => ({
          id: m.user_id,
          name: m.profile?.name || '이름 없음',
          number: m.profile?.back_number || 0,
          position: m.profile?.position || 'MF',
          status: (attMap.get(m.user_id) as any) || null,
          type: 'regular' as const,
        }));
        setPlayers(playersList);

        const attending = playersList.filter(p => p.status === 'attending');
        setAllPlayers(attending);

        // Initialize formation
        const f = matchData?.format?.includes('8') ? '3-3-1' : '4-3-3';
        setFormation(f);
        const pos = formations[f];
        const init = pos.map((_, i) => attending[i]?.id ?? null);
        setQuarterLineups({ '1Q': [...init], '2Q': [...init], '3Q': [...init], '4Q': [...init] });

        // My attendance
        if (user) {
          setMyAttendance((attMap.get(user.id) as any) || null);
        }
      }

      // Fetch/create chat room for this match
      let { data: room } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('type', 'match')
        .eq('match_id', id)
        .eq('team_id', team.id)
        .maybeSingle();

      if (!room) {
        const { data: newRoom } = await supabase
          .from('chat_rooms')
          .insert({ type: 'match', match_id: id, team_id: team.id })
          .select('id')
          .single();
        room = newRoom;
      }

      if (room) {
        setChatRoomId(room.id);
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles(name)')
          .eq('room_id', room.id)
          .order('created_at', { ascending: true });

        if (msgs) {
          setChatMsgs(msgs.map(m => ({
            id: m.id,
            sender: (m.sender as any)?.name || '알 수 없음',
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
            isMe: m.sender_id === user?.id,
          })));
        }

        // Real-time chat subscription
        const channel = supabase
          .channel(`match-chat-${room.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` }, async (payload) => {
            const msg = payload.new as any;
            if (msg.sender_id === user?.id) return;
            const { data: senderData } = await supabase.from('profiles').select('name').eq('id', msg.sender_id).single();
            setChatMsgs(prev => [...prev, {
              id: msg.id,
              sender: senderData?.name || '알 수 없음',
              text: msg.text,
              time: new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              isMe: false,
            }]);
          })
          .subscribe();

        setLoading(false);
        channelRef.current = channel;
      } else {
        setLoading(false);
      }
    };

    fetchAll();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [id, team, user]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs, activeTab]);

  const handleAttendance = async (status: 'attending' | 'not-attending') => {
    if (!user || !id) return;
    await supabase.from('match_attendance').upsert({
      match_id: id,
      user_id: user.id,
      status,
    }, { onConflict: 'match_id,user_id' });
    setMyAttendance(status);
    setPlayers(prev => prev.map(p => p.id === user.id ? { ...p, status } : p));
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !chatRoomId || !user) return;
    const text = chatInput.trim();
    setChatInput('');

    const { data: msg } = await supabase.from('chat_messages').insert({
      room_id: chatRoomId,
      sender_id: user.id,
      text,
    }).select('id, created_at').single();

    if (msg) {
      setChatMsgs(prev => [...prev, {
        id: msg.id,
        sender: profile?.name || '나',
        text,
        time: new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
      }]);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="text-gray-500 text-sm">로딩 중...</div></div>;
  }
  if (!match) return null;

  const opponent = match.home_team_id === team?.id ? match.away_team : match.home_team;
  const positions_arr = formations[formation] || formations['4-3-3'];
  const currentLineup = quarterLineups[activeQuarter];
  const fieldIds = new Set(currentLineup.filter((pid): pid is string => pid !== null));
  const benchPlayers = allPlayers.filter(p => !fieldIds.has(p.id));
  const getPlayer = (pid: string) => allPlayers.find(p => p.id === pid);
  const jerseyColor = (p: PlayerInfo) => p.type === 'mercenary' ? '#F59E0B' : p.type === 'rookie' ? '#3B82F6' : '#DC143C';

  const attendingPlayers = players.filter(p => p.status === 'attending');
  const notAttendingPlayers = players.filter(p => p.status === 'not-attending');
  const pendingPlayers = players.filter(p => p.status === null);

  const handleFieldTap = (i: number) => {
    if (!selectedSlot) { setSelectedSlot({ type: 'field', index: i }); return; }
    if (selectedSlot.type === 'field' && selectedSlot.index === i) { setSelectedSlot(null); return; }
    const nl = [...currentLineup];
    if (selectedSlot.type === 'field') { [nl[selectedSlot.index], nl[i]] = [nl[i], nl[selectedSlot.index]]; }
    else { const bp = benchPlayers[selectedSlot.index]; if (bp) nl[i] = bp.id; }
    setQuarterLineups(prev => ({ ...prev, [activeQuarter]: nl }));
    setSelectedSlot(null);
  };

  const handleBenchTap = (i: number) => {
    if (!selectedSlot) { setSelectedSlot({ type: 'bench', index: i }); return; }
    if (selectedSlot.type === 'bench' && selectedSlot.index === i) { setSelectedSlot(null); return; }
    if (selectedSlot.type === 'field') {
      const nl = [...currentLineup]; const bp = benchPlayers[i]; if (bp) nl[selectedSlot.index] = bp.id;
      setQuarterLineups(prev => ({ ...prev, [activeQuarter]: nl }));
    }
    setSelectedSlot(null);
  };

  const handleFormationChange = (f: string) => {
    setFormation(f);
    const np = formations[f] || formations['4-3-3'];
    setQuarterLineups(prev => {
      const u = { ...prev };
      for (const q of quarters) { const o = prev[q]; u[q] = np.length > o.length ? [...o, ...Array(np.length - o.length).fill(null)] : o.slice(0, np.length); }
      return u;
    });
    setSelectedSlot(null);
  };

  const handleAddPlayer = () => {
    if (!newName.trim() || !newNumber.trim()) return;
    const p: PlayerInfo = { id: `temp-${Date.now()}`, name: newName.trim(), number: parseInt(newNumber), position: newPos, status: 'attending', type: newType };
    setAllPlayers(prev => [...prev, p]);
    setNewName(''); setNewNumber(''); setNewPos('MF'); setNewType('mercenary'); setShowAddModal(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-8">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5 sticky top-0 z-10 bg-[#0a0a0a]">
        <button onClick={() => navigate('/lineup')} className="p-1 text-gray-400"><ArrowLeft size={22} /></button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{opponent?.logo || '⚽'}</span>
          <div>
            <p className="font-bold text-white text-sm">vs {opponent?.name || '상대 미정'}</p>
            <p className="text-[11px] text-gray-500">{formatDate(match.date)} {match.time?.slice(0, 5)}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-2 flex items-center gap-4 text-xs text-gray-500 border-b border-white/5">
        <span className="flex items-center gap-1"><MapPin size={11} />{match.stadium}</span>
        <span className="flex items-center gap-1"><Users size={11} />{match.format}</span>
      </div>

      {/* My Attendance */}
      {user && (
        <div className="px-4 pt-3">
          <div className="flex gap-2">
            <button onClick={() => handleAttendance('attending')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold ${myAttendance === 'attending' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
              <Check size={14} className="inline mr-1" />참여
            </button>
            <button onClick={() => handleAttendance('not-attending')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold ${myAttendance === 'not-attending' ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
              <X size={14} className="inline mr-1" />불참
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 pt-3 flex gap-1 bg-[#111] mx-4 mt-3 p-1 rounded-xl">
        <button onClick={() => setActiveTab('members')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold ${activeTab === 'members' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>팀원</button>
        <button onClick={() => setActiveTab('formation')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold ${activeTab === 'formation' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>포메이션</button>
        <button onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${activeTab === 'chat' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>
          <MessageCircle size={12} />채팅</button>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="px-4 py-4 space-y-4">
          {[
            { title: '참여', players: attendingPlayers, dot: 'bg-emerald-500', label: () => <span className="text-emerald-400 text-[11px]">참여</span> },
            { title: '불참', players: notAttendingPlayers, dot: 'bg-[#7B2D3B]', label: () => <span className="text-red-400 text-[11px]">불참</span> },
            { title: '미응답', players: pendingPlayers, dot: 'bg-gray-600', label: () => <span className="text-gray-600 text-[11px]">미응답</span> },
          ].filter(g => g.players.length > 0).map(group => (
            <div key={group.title}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
                <span className="text-xs font-semibold text-gray-400">{group.title} ({group.players.length})</span>
              </div>
              <div className="space-y-1">
                {group.players.map(player => (
                  <div key={player.id} className="flex items-center justify-between bg-[#111] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-gray-500 w-5 text-center">{player.number}</span>
                      <span className="text-sm text-white">{player.name}</span>
                      <span className={`text-[10px] font-bold ${posColors[player.position]}`}>{player.position}</span>
                    </div>
                    {group.label()}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <p className="text-center text-gray-600 py-8 text-sm">팀원 정보가 없습니다</p>
          )}
        </div>
      )}

      {/* Formation Tab */}
      {activeTab === 'formation' && (
        <div className="px-4 py-4">
          <div className="flex gap-2 mb-3">
            {quarters.map(q => (
              <button key={q} onClick={() => { setActiveQuarter(q); setSelectedSlot(null); }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold ${activeQuarter === q ? 'bg-[#7B2D3B] text-white' : 'bg-[#111] text-gray-500 border border-white/5'}`}>{q}</button>
            ))}
          </div>

          {activeQuarter !== '1Q' && (
            <div className="flex gap-2 mb-3">
              {quarters.filter(q => q !== activeQuarter).map(q => (
                <button key={q} onClick={() => setQuarterLineups(prev => ({ ...prev, [activeQuarter]: [...prev[q]] }))}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white/5 rounded-lg text-[11px] text-gray-500">
                  <Copy size={10} />{q} 복사
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-3">
            {Object.keys(formations).map(f => (
              <button key={f} onClick={() => handleFormationChange(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${formation === f ? 'bg-[#7B2D3B] text-white' : 'bg-white/5 text-gray-500'}`}>{f}</button>
            ))}
          </div>

          {selectedSlot && (
            <div className="mb-3 bg-yellow-500/10 rounded-xl px-3 py-2 flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-yellow-500" />
              <span className="text-xs text-yellow-400">교체할 선수를 선택하세요</span>
              <button onClick={() => setSelectedSlot(null)} className="ml-auto text-yellow-500"><X size={14} /></button>
            </div>
          )}

          {/* Field */}
          <div className="relative bg-gradient-to-b from-green-700 to-green-600 rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <div className="absolute inset-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-white/20 rounded-full" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-20 border-2 border-white/20 border-b-0" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-20 border-2 border-white/20 border-t-0" />
            </div>
            <div className="absolute top-2 left-2 bg-black/30 text-white/70 px-2 py-0.5 rounded text-[10px] font-medium">{activeQuarter} · {formation}</div>

            {positions_arr.map((pos, idx) => {
              const pid = currentLineup[idx]; const player = pid != null ? getPlayer(pid) : null;
              const isSel = selectedSlot?.type === 'field' && selectedSlot.index === idx;
              return (
                <div key={`${activeQuarter}-${idx}`} onClick={() => handleFieldTap(idx)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${isSel ? 'scale-110 z-10' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                  {player ? (
                    <div className="flex flex-col items-center">
                      <div className={`${isSel ? 'ring-2 ring-yellow-400 rounded-xl' : ''}`}>
                        <JerseyIcon number={player.number} primaryColor={jerseyColor(player)} secondaryColor="#000" size="md" />
                      </div>
                      <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${isSel ? 'bg-yellow-400 text-black' : 'bg-white text-gray-900'}`}>{player.name}</div>
                      {player.type !== 'regular' && (
                        <span className={`text-[8px] px-1 rounded-full mt-0.5 font-bold ${player.type === 'mercenary' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>
                          {player.type === 'mercenary' ? '용병' : '신입'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className={`w-10 h-12 border-2 border-dashed rounded flex items-center justify-center ${isSel ? 'border-yellow-400 bg-yellow-400/20' : 'border-white/30 bg-white/10'}`}>
                      <Plus className="text-white/50" size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bench */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">교체 <span className="text-gray-500 font-normal">{benchPlayers.length}명</span></span>
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 bg-[#7B2D3B] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">
                <UserPlus size={12} /> 추가
              </button>
            </div>
            {benchPlayers.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {benchPlayers.map((p, i) => {
                  const isSel = selectedSlot?.type === 'bench' && selectedSlot.index === i;
                  return (
                    <div key={p.id} onClick={() => handleBenchTap(i)}
                      className={`flex-shrink-0 w-[68px] flex flex-col items-center p-2 rounded-xl border cursor-pointer ${isSel ? 'border-yellow-400 bg-yellow-500/10' : 'border-white/5 bg-[#111]'}`}>
                      <JerseyIcon number={p.number} primaryColor={jerseyColor(p)} secondaryColor="#000" size="sm" />
                      <span className="text-[10px] font-medium mt-1 text-gray-300 truncate w-full text-center">{p.name}</span>
                      <span className={`text-[9px] font-bold ${posColors[p.position]}`}>{p.position}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center py-4">모든 선수 배치 완료</p>
            )}
          </div>

          <div className="mt-3 bg-[#111] rounded-xl border border-white/5 p-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">{activeQuarter} 배치</span>
            <span className="text-xs font-bold text-white">{currentLineup.filter(p => p !== null).length}/{positions_arr.length}명</span>
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0" style={{ height: 'calc(100vh - 280px)' }}>
          <div className="flex-1 overflow-auto px-4 pt-3 space-y-3 pb-2">
            {chatMsgs.length === 0 && (
              <p className="text-center text-gray-600 py-8 text-sm">메시지가 없습니다. 첫 메시지를 보내보세요!</p>
            )}
            {chatMsgs.map(msg => (
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
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="메시지 입력..."
                className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none" />
              <button onClick={sendChat}
                className="bg-[#7B2D3B] text-white p-2.5 rounded-xl active:scale-95 transition-transform">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#111] rounded-t-2xl p-5 w-full max-w-[430px] border-t border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">선수 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500"><X size={18} /></button>
            </div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setNewType('mercenary')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${newType === 'mercenary' ? 'bg-amber-500 text-white' : 'bg-white/5 text-gray-500'}`}>용병</button>
              <button onClick={() => setNewType('rookie')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${newType === 'rookie' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-500'}`}>신입</button>
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="이름"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 mb-3 focus:outline-none" />
            <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="등번호" type="number"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 mb-3 focus:outline-none" />
            <div className="flex gap-2 mb-4">
              {['GK', 'DF', 'MF', 'FW'].map(p => (
                <button key={p} onClick={() => setNewPos(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold ${newPos === p ? 'bg-[#7B2D3B] text-white' : 'bg-white/5 text-gray-500'}`}>{p}</button>
              ))}
            </div>
            <button onClick={handleAddPlayer} disabled={!newName.trim() || !newNumber.trim()}
              className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-30">추가하기</button>
          </div>
        </div>
      )}
    </div>
  );
}
