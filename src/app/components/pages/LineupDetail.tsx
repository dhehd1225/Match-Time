import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, Users, X, Plus, Send, MessageCircle, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import LineupMembers from './LineupMembers';
import LineupFormation from './LineupFormation';
import LineupResult from './LineupResult';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match, MatchEvent } from '../../../lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PlayerInfo {
  id: string;
  name: string;
  number: number;
  position: string;
  status: 'attending' | 'not-attending' | null;
  type?: 'regular' | 'mercenary' | 'rookie';
  preferredPositions?: string[];
  desiredQuarters?: string[];
  goals?: number;
  assists?: number;
}

const ALL_POSITIONS = ['FW', 'MF', 'DF', 'GK'];

type Quarter = '1Q' | '2Q' | '3Q' | '4Q';
const quarters: Quarter[] = ['1Q', '2Q', '3Q', '4Q'];

const formations: Record<string, { x: number; y: number }[]> = {
  '4-3-3': [{ x: 50, y: 90 },{ x: 20, y: 70 },{ x: 40, y: 70 },{ x: 60, y: 70 },{ x: 80, y: 70 },{ x: 30, y: 45 },{ x: 50, y: 45 },{ x: 70, y: 45 },{ x: 30, y: 20 },{ x: 50, y: 20 },{ x: 70, y: 20 }],
  '4-4-2': [{ x: 50, y: 90 },{ x: 20, y: 70 },{ x: 40, y: 70 },{ x: 60, y: 70 },{ x: 80, y: 70 },{ x: 20, y: 45 },{ x: 40, y: 45 },{ x: 60, y: 45 },{ x: 80, y: 45 },{ x: 40, y: 20 },{ x: 60, y: 20 }],
  '3-4-3': [{ x: 50, y: 90 },{ x: 30, y: 70 },{ x: 50, y: 70 },{ x: 70, y: 70 },{ x: 20, y: 45 },{ x: 40, y: 45 },{ x: 60, y: 45 },{ x: 80, y: 45 },{ x: 30, y: 20 },{ x: 50, y: 20 },{ x: 70, y: 20 }],
  '3-3-1': [{ x: 50, y: 90 },{ x: 25, y: 70 },{ x: 50, y: 70 },{ x: 75, y: 70 },{ x: 30, y: 45 },{ x: 50, y: 45 },{ x: 70, y: 45 },{ x: 50, y: 20 }],
};

export default function LineupDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, team, profile, isTeamCreator } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const validTabs = ['members', 'formation', 'chat', 'result'] as const;
  const hashTab = window.location.hash.replace('#', '') as typeof validTabs[number];
  const [activeTab, setActiveTabState] = useState<'members' | 'formation' | 'chat' | 'result'>(
    validTabs.includes(hashTab) ? hashTab : 'members'
  );
  const setActiveTab = (tab: 'members' | 'formation' | 'chat' | 'result') => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };
  const [formation, setFormation] = useState('4-3-3');
  const [activeQuarter, setActiveQuarter] = useState<Quarter>('1Q');
  const [myAttendance, setMyAttendance] = useState<'attending' | 'not-attending' | null>(null);

  const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);
  const [quarterLineups, setQuarterLineups] = useState<Record<Quarter, (string | null)[]>>({
    '1Q': [], '2Q': [], '3Q': [], '4Q': [],
  });
  const [selectedSlot, setSelectedSlot] = useState<{ type: 'field' | 'bench'; index: number } | null>(null);
  const [jerseyPrimary, setJerseyPrimary] = useState('#DC143C');
  const [jerseySecondary] = useState('#000000');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPos, setNewPos] = useState('MF');
  const [newType, setNewType] = useState<'mercenary' | 'rookie'>('mercenary');
  const [autoLoading, setAutoLoading] = useState(false);

  // 참여 선호도 모달
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [prefPositions, setPrefPositions] = useState<string[]>([]);
  const [prefQuarters, setPrefQuarters] = useState<string[]>(['1Q', '2Q', '3Q', '4Q']);

  // 결과 입력
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');
  interface GoalEntry { scorer_id: string; assister_id: string; minute: string; }
  const [goalEntries, setGoalEntries] = useState<GoalEntry[]>([]);
  const [savedEvents, setSavedEvents] = useState<MatchEvent[]>([]);
  const [resultSaving, setResultSaving] = useState(false);

  // Chat
  interface ChatMsg { id: string; sender: string; text: string; time: string; isMe: boolean; }
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lineupChannelRef = useRef<RealtimeChannel | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // 선수 포지션에 맞는 슬롯에 배치
  const smartPlace = (players: PlayerInfo[], fm: string, slotCount: number): (string | null)[] => {
    const lineup: (string | null)[] = Array(slotCount).fill(null);
    const parts = fm.split('-').map(Number);
    const used = new Set<string>();

    const getSlotRange = (pos: string): number[] => {
      const ranges: number[] = [];
      let start = 0;
      if (pos === 'GK') return [0];
      start = 1;
      if (pos === 'DF') { for (let i = start; i < start + parts[0]; i++) ranges.push(i); return ranges; }
      start += parts[0];
      if (pos === 'MF') { for (let i = start; i < start + parts[1]; i++) ranges.push(i); return ranges; }
      start += parts[1];
      for (let i = start; i < slotCount; i++) ranges.push(i);
      return ranges;
    };

    // 1차: 포지션 매칭
    for (const p of players) {
      if (used.has(p.id)) continue;
      const slots = getSlotRange(p.position);
      const emptySlot = slots.find(s => lineup[s] === null);
      if (emptySlot !== undefined) { lineup[emptySlot] = p.id; used.add(p.id); }
    }
    // 2차: 남은 선수 빈 슬롯에
    for (const p of players) {
      if (used.has(p.id)) continue;
      const emptySlot = lineup.findIndex(s => s === null);
      if (emptySlot !== -1) { lineup[emptySlot] = p.id; used.add(p.id); }
    }
    return lineup;
  };

  useEffect(() => {
    if (!id || !team) { setLoading(false); return; }

    // 이전 채널 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

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
        const attMap = new Map<string, any>();
        attData?.forEach(a => attMap.set(a.user_id, a));

        const playersList: PlayerInfo[] = membersData.map(m => {
          const att = attMap.get(m.user_id);
          return {
            id: m.user_id,
            name: m.profile?.name || '이름 없음',
            number: m.profile?.back_number || 0,
            position: m.profile?.position || 'MF',
            status: att?.status || null,
            type: 'regular' as const,
            preferredPositions: att?.preferred_positions || [],
            desiredQuarters: att?.desired_quarters ?? ['1Q', '2Q', '3Q', '4Q'],
            goals: m.goals || 0,
            assists: m.assists || 0,
          };
        });
        setPlayers(playersList);

        const attending = playersList.filter(p => p.status === 'attending');
        // localStorage에서 임시 선수 복원
        let tempPlayers: PlayerInfo[] = [];
        try {
          const saved = localStorage.getItem(`temp_players_${id}`);
          if (saved) tempPlayers = JSON.parse(saved);
        } catch { /* ignore */ }
        setAllPlayers([...attending, ...tempPlayers]);

        // DB에서 저장된 라인업 불러오기
        const { data: savedLineups } = await supabase
          .from('lineups')
          .select('*')
          .eq('match_id', id);

        if (savedLineups && savedLineups.length > 0) {
          // 저장된 라인업이 있으면 그것 사용
          const savedFormation = savedLineups[0].formation || '4-3-3';
          setFormation(savedFormation);
          const newQuarterLineups: Record<Quarter, (string | null)[]> = { '1Q': [], '2Q': [], '3Q': [], '4Q': [] };
          for (const sl of savedLineups) {
            const q = sl.quarter as Quarter;
            newQuarterLineups[q] = sl.positions as (string | null)[];
          }
          // 저장 안 된 쿼터는 기본값
          const pos = formations[savedFormation];
          for (const q of quarters) {
            if (newQuarterLineups[q].length === 0) {
              newQuarterLineups[q] = smartPlace(attending, savedFormation, pos.length);
            }
          }
          setQuarterLineups(newQuarterLineups);
        } else {
          // 저장된 라인업 없으면 기본 초기화
          const f = matchData?.format?.includes('8') ? '3-3-1' : '4-3-3';
          setFormation(f);
          const pos = formations[f];
          if (isTeamCreator) {
            // 팀장만 자동 배치
            const init = smartPlace(attending, f, pos.length);
            setQuarterLineups({ '1Q': [...init], '2Q': [...init], '3Q': [...init], '4Q': [...init] });
          } else {
            // 팀원은 빈 슬롯
            const empty = pos.map(() => null);
            setQuarterLineups({ '1Q': [...empty], '2Q': [...empty], '3Q': [...empty], '4Q': [...empty] });
          }
        }

        // My attendance + preferences
        if (user) {
          const myAtt = attMap.get(user.id);
          setMyAttendance(myAtt?.status || null);
          if (myAtt?.preferred_positions?.length) setPrefPositions(myAtt.preferred_positions);
          if (myAtt?.desired_quarters?.length) setPrefQuarters(myAtt.desired_quarters);

          // 참여 중인데 선호 포지션 미설정 → 자동으로 선호도 모달 띄우기
          if (myAtt?.status === 'attending' && (!myAtt.preferred_positions || myAtt.preferred_positions.length === 0)) {
            const isPast = new Date(`${matchData?.date}T${matchData?.time || '00:00'}`) < new Date();
            if (!isPast && matchData?.status !== 'completed') {
              setShowPrefModal(true);
            }
          }
        }
      }

      // 저장된 결과 불러오기
      if (matchData) {
        if (matchData.home_score !== null) setHomeScore(String(matchData.home_score));
        if (matchData.away_score !== null) setAwayScore(String(matchData.away_score));

        const { data: events } = await supabase
          .from('match_events')
          .select('*, scorer:profiles!match_events_scorer_id_fkey(id, name), assister:profiles!match_events_assister_id_fkey(id, name)')
          .eq('match_id', id)
          .order('minute', { ascending: true });

        if (events && events.length > 0) {
          setSavedEvents(events);
          setGoalEntries(events.map(e => ({
            scorer_id: e.scorer_id || '',
            assister_id: e.assister_id || '',
            minute: e.minute ? String(e.minute) : '',
          })));
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
          .channel(`match-chat-${room.id}-${Date.now()}`)
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

    // 라인업 실시간 구독 (팀장이 저장하면 팀원에게 즉시 반영)
    const lineupChannel = supabase
      .channel(`lineup-${id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lineups', filter: `match_id=eq.${id}` }, async () => {
        const { data: savedLineups } = await supabase
          .from('lineups')
          .select('*')
          .eq('match_id', id);
        if (savedLineups && savedLineups.length > 0) {
          const savedFormation = savedLineups[0].formation || '4-3-3';
          setFormation(savedFormation);
          const newQL: Record<Quarter, (string | null)[]> = { '1Q': [], '2Q': [], '3Q': [], '4Q': [] };
          for (const sl of savedLineups) {
            newQL[sl.quarter as Quarter] = sl.positions as (string | null)[];
          }
          const pos = formations[savedFormation];
          for (const q of quarters) {
            if (newQL[q].length === 0) newQL[q] = Array(pos.length).fill(null);
          }
          setQuarterLineups(newQL);
        }
      })
      .subscribe();
    lineupChannelRef.current = lineupChannel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (lineupChannelRef.current) {
        supabase.removeChannel(lineupChannelRef.current);
        lineupChannelRef.current = null;
      }
    };
  }, [id, team, user]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs, activeTab]);

  // 골 기록 변경 시 우리팀 스코어 자동 계산
  useEffect(() => {
    if (!match || !team) return;
    const myGoalCount = goalEntries.filter(e => e.scorer_id).length;
    const isHome = match.home_team_id === team.id;
    if (isHome) setHomeScore(String(myGoalCount));
    else setAwayScore(String(myGoalCount));
  }, [goalEntries, match, team]);

  const saveAttendance = async (matchId: string, userId: string, newStatus: string, prefs?: { preferred_positions: string[]; desired_quarters: string[] }) => {
    // 기존 레코드 삭제 후 새로 삽입
    await supabase.from('match_attendance').delete().eq('match_id', matchId).eq('user_id', userId);

    const row: Record<string, any> = { match_id: matchId, user_id: userId, status: newStatus };
    if (prefs) {
      row.preferred_positions = prefs.preferred_positions;
      row.desired_quarters = prefs.desired_quarters;
    }

    const { error } = await supabase.from('match_attendance').insert(row);
    if (error) {
      toast.error('저장 실패: ' + error.message);
      return false;
    }
    return true;
  };

  const handleAttendance = async (status: 'attending' | 'not-attending') => {
    if (!user || !id) return;
    if (status === 'attending') {
      setShowPrefModal(true);
      return;
    }
    const ok = await saveAttendance(id, user.id, status);
    if (!ok) return;
    setMyAttendance(status);
    setPrefPositions([]);
    setPrefQuarters(['1Q', '2Q', '3Q', '4Q']);
    setPlayers(prev => prev.map(p => p.id === user.id ? { ...p, status } : p));
    setAllPlayers(prev => prev.filter(p => p.id !== user.id));
    toast.success('불참 처리되었습니다.');
  };

  const handleSubmitPreference = async () => {
    if (!user || !id) return;
    const ok = await saveAttendance(id, user.id, 'attending', {
      preferred_positions: prefPositions,
      desired_quarters: prefQuarters,
    });
    if (!ok) return;
    setMyAttendance('attending');
    const updatedPlayer = players.find(p => p.id === user.id);
    if (updatedPlayer) {
      const newP = { ...updatedPlayer, status: 'attending' as const, preferredPositions: prefPositions, desiredQuarters: prefQuarters };
      setPlayers(prev => prev.map(p => p.id === user.id ? newP : p));
      setAllPlayers(prev => {
        const exists = prev.find(p => p.id === user.id);
        if (exists) return prev.map(p => p.id === user.id ? newP : p);
        return [...prev, newP];
      });
    }
    setShowPrefModal(false);
    toast.success('참여 등록 완료!');
  };

  const togglePrefPosition = (pos: string) => {
    setPrefPositions(prev => {
      if (prev.includes(pos)) return prev.filter(p => p !== pos);
      if (prev.length >= 3) return prev;
      return [...prev, pos];
    });
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
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" /><div className="space-y-1"><div className="w-24 h-4 bg-gray-200 rounded animate-pulse" /><div className="w-32 h-3 bg-gray-200 rounded animate-pulse" /></div></div>
        </div>
        <div className="px-4 pt-4 space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 bg-white shadow-sm rounded-xl border border-gray-200 p-3">
              <div className="w-5 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-8 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!match) return null;

  const isPast = new Date(`${match.date}T${match.time || '00:00'}`) < new Date();
  const opponent = match.home_team_id === team?.id ? match.away_team : match.home_team;
  const currentLineup = quarterLineups[activeQuarter];
  const fieldIds = new Set(currentLineup.filter((pid): pid is string => pid !== null));
  const benchPlayers = allPlayers.filter(p => !fieldIds.has(p.id));

  const handleFieldTap = (i: number) => {
    if (!isTeamCreator) return;
    if (!selectedSlot) { setSelectedSlot({ type: 'field', index: i }); return; }
    if (selectedSlot.type === 'field' && selectedSlot.index === i) { setSelectedSlot(null); return; }
    const nl = [...currentLineup];
    if (selectedSlot.type === 'field') { [nl[selectedSlot.index], nl[i]] = [nl[i], nl[selectedSlot.index]]; }
    else { const bp = benchPlayers[selectedSlot.index]; if (bp) nl[i] = bp.id; }
    setQuarterLineups(prev => ({ ...prev, [activeQuarter]: nl }));
    setSelectedSlot(null);
  };

  const handleBenchTap = (i: number) => {
    if (!isTeamCreator) return;
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

  const handleSaveLineup = async () => {
    if (!id || !user) return;
    const upserts = quarters.map(q => ({
      match_id: id,
      quarter: q,
      formation,
      positions: quarterLineups[q],
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('lineups').upsert(upserts, { onConflict: 'match_id,quarter' });
    if (error) {
      toast.error('저장 실패: ' + error.message);
    } else {
      toast.success('라인업이 저장되었습니다!');
    }
  };

  const handleSaveResult = async () => {
    if (!id || !user || !match || !team) return;
    setResultSaving(true);

    const hScore = parseInt(homeScore) || 0;
    const aScore = parseInt(awayScore) || 0;
    const wasAlreadyCompleted = match.status === 'completed';

    // 1. 스코어 저장 + 상태 completed로 변경
    await supabase.from('matches').update({
      home_score: hScore,
      away_score: aScore,
      status: 'completed',
    }).eq('id', id);

    // 2. 기존 이벤트 삭제 후 새로 삽입
    await supabase.from('match_events').delete().eq('match_id', id);

    const validEntries = goalEntries.filter(e => e.scorer_id);
    if (validEntries.length > 0) {
      const events = validEntries.map(e => ({
        match_id: id,
        team_id: team.id,
        scorer_id: e.scorer_id || null,
        assister_id: e.assister_id || null,
        minute: e.minute ? parseInt(e.minute) : null,
      }));
      await supabase.from('match_events').insert(events);
    }

    // 3. team_members 스탯 업데이트 (최초 저장 시에만 — 중복 카운트 방지)
    if (!wasAlreadyCompleted) {
      const attendingIds = allPlayers.filter(p => p.type === 'regular').map(p => p.id);
      for (const uid of attendingIds) {
        const { data: tm } = await supabase
          .from('team_members')
          .select('id, appearances, goals, assists')
          .eq('team_id', team.id)
          .eq('user_id', uid)
          .maybeSingle();
        if (tm) {
          const goalCount = validEntries.filter(e => e.scorer_id === uid).length;
          const assistCount = validEntries.filter(e => e.assister_id === uid).length;
          await supabase.from('team_members').update({
            appearances: (tm.appearances || 0) + 1,
            goals: (tm.goals || 0) + goalCount,
            assists: (tm.assists || 0) + assistCount,
          }).eq('id', tm.id);
        }
      }
    }

    setMatch(prev => prev ? { ...prev, status: 'completed', home_score: hScore, away_score: aScore } : prev);
    setResultSaving(false);
    toast.success('경기 결과가 저장되었습니다!');
  };

  const handleAutoLineup = () => {
    if (allPlayers.length === 0) { toast.error('참여 선수가 없습니다.'); return; }
    setAutoLoading(true);

    const posArr = formations[formation] || formations['4-3-3'];
    const isFirstQuarter = activeQuarter === '1Q';

    // 해당 쿼터를 희망하는 선수 우선 필터
    const wantsThisQ = allPlayers.filter(p =>
      !p.desiredQuarters || p.desiredQuarters.length === 0 || p.desiredQuarters.includes(activeQuarter)
    );
    const others = allPlayers.filter(p =>
      p.desiredQuarters && p.desiredQuarters.length > 0 && !p.desiredQuarters.includes(activeQuarter)
    );

    // 1Q는 스탯(골+도움) 높은 순, 나머지는 그냥 순서대로
    const sorted = isFirstQuarter
      ? [...wantsThisQ].sort((a, b) => ((b.goals || 0) + (b.assists || 0)) - ((a.goals || 0) + (a.assists || 0)))
      : [...wantsThisQ];
    const pool = [...sorted, ...others];

    // 슬롯별 포지션 매핑
    const getSlotPos = (idx: number): string => {
      if (idx === 0) return 'GK';
      const parts = formation.split('-').map(Number);
      let count = 1;
      if (idx < count + parts[0]) return 'DF';
      count += parts[0];
      if (idx < count + parts[1]) return 'MF';
      return 'FW';
    };

    const newLineup: (string | null)[] = posArr.map(() => null);
    const used = new Set<string>();

    // 1차: 1순위 희망 포지션으로 배치
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const pref1 = p.preferredPositions?.[0] || p.position;
      for (let i = 0; i < posArr.length; i++) {
        if (newLineup[i] === null && getSlotPos(i) === pref1) {
          newLineup[i] = p.id; used.add(p.id); break;
        }
      }
    }

    // 2차: 2순위 희망 포지션
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const pref2 = p.preferredPositions?.[1];
      if (!pref2) continue;
      for (let i = 0; i < posArr.length; i++) {
        if (newLineup[i] === null && getSlotPos(i) === pref2) {
          newLineup[i] = p.id; used.add(p.id); break;
        }
      }
    }

    // 3차: 기본 포지션으로 배치
    for (const p of pool) {
      if (used.has(p.id)) continue;
      for (let i = 0; i < posArr.length; i++) {
        if (newLineup[i] === null && getSlotPos(i) === p.position) {
          newLineup[i] = p.id; used.add(p.id); break;
        }
      }
    }

    // 4차: 남은 선수 아무 빈 슬롯
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const emptyIdx = newLineup.findIndex(s => s === null);
      if (emptyIdx !== -1) { newLineup[emptyIdx] = p.id; used.add(p.id); }
    }

    setQuarterLineups(prev => ({ ...prev, [activeQuarter]: newLineup }));
    toast.success('자동 배치 완료!');
    setAutoLoading(false);
  };

  const handleAddPlayer = () => {
    if (!newName.trim() || !newNumber.trim()) return;
    const p: PlayerInfo = { id: `temp-${Date.now()}`, name: newName.trim(), number: parseInt(newNumber), position: newPos, status: 'attending', type: 'regular' };
    setAllPlayers(prev => {
      const updated = [...prev, p];
      // 임시 선수 localStorage 저장
      if (id) {
        const tempPlayers = updated.filter(pl => pl.id.startsWith('temp-'));
        localStorage.setItem(`temp_players_${id}`, JSON.stringify(tempPlayers));
      }
      return updated;
    });
    setNewName(''); setNewNumber(''); setNewPos('MF'); setShowAddModal(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  const handleRemovePlayer = (playerId: string) => {
    setAllPlayers(prev => {
      const updated = prev.filter(p => p.id !== playerId);
      if (id) {
        const tempPlayers = updated.filter(p => p.id.startsWith('temp-'));
        localStorage.setItem(`temp_players_${id}`, JSON.stringify(tempPlayers));
      }
      return updated;
    });
    setQuarterLineups(prev => {
      const u = { ...prev };
      for (const q of quarters) {
        u[q] = prev[q].map(pid => pid === playerId ? null : pid);
      }
      return u;
    });
    toast.success('선수가 제거되었습니다.');
  };

  return (
    <div className={`bg-[#FAFAF8] ${activeTab === 'chat' ? 'min-h-screen pb-36' : 'min-h-screen pb-8'}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200 sticky top-0 z-10 bg-[#FAFAF8]">
        <button onClick={() => navigate('/lineup')} className="p-1 text-gray-400"><ArrowLeft size={22} /></button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{opponent?.logo || '⚽'}</span>
          <div>
            <p className="font-bold text-gray-900 text-sm">vs {opponent?.name || '상대 미정'}</p>
            <p className="text-[11px] text-gray-500">{formatDate(match.date)} {match.time?.slice(0, 5)}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-2 flex items-center gap-4 text-xs text-gray-500 border-b border-gray-200">
        <span className="flex items-center gap-1"><MapPin size={11} />{match.stadium}</span>
        <span className="flex items-center gap-1"><Users size={11} />{match.format}</span>
      </div>

      {/* My Attendance - 상태 표시 + 변경 토글 (과거 시합에는 숨김) */}
      {user && !isPast && match.status !== 'completed' && (
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between bg-white shadow-sm rounded-xl border border-gray-200 px-4 py-2.5">
            <div className="flex items-center gap-2">
              {myAttendance === 'attending' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-emerald-400">참여 중</span>
                </>
              ) : myAttendance === 'not-attending' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-red-400">불참</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span className="text-sm font-medium text-gray-400">미응답</span>
                </>
              )}
            </div>
            <button
              onClick={() => handleAttendance(myAttendance === 'attending' ? 'not-attending' : 'attending')}
              className="text-xs text-gray-500 px-3 py-1.5 rounded-lg bg-gray-100 active:scale-95 transition-all"
            >
              {myAttendance === 'attending' ? '불참으로 변경' : '참여로 변경'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 pt-3 flex gap-1 bg-white shadow-sm mx-4 mt-3 p-1 rounded-xl">
        <button onClick={() => setActiveTab('members')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold ${activeTab === 'members' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>팀원</button>
        <button onClick={() => setActiveTab('formation')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold ${activeTab === 'formation' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>포메이션</button>
        <button onClick={() => setActiveTab('result')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${activeTab === 'result' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>
          <ClipboardCheck size={12} />결과</button>
        <button onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${activeTab === 'chat' ? 'bg-[#7B2D3B] text-white' : 'text-gray-500'}`}>
          <MessageCircle size={12} />채팅</button>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <LineupMembers
          players={players}
          allPlayers={allPlayers}
          isTeamCreator={isTeamCreator}
          onRemovePlayer={handleRemovePlayer}
          onShowAddModal={() => setShowAddModal(true)}
        />
      )}

      {/* Formation Tab */}
      {activeTab === 'formation' && (
        <LineupFormation
          activeQuarter={activeQuarter} setActiveQuarter={setActiveQuarter}
          quarterLineups={quarterLineups} setQuarterLineups={setQuarterLineups}
          formation={formation} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot}
          jerseyPrimary={jerseyPrimary} setJerseyPrimary={setJerseyPrimary} jerseySecondary={jerseySecondary}
          allPlayers={allPlayers} isTeamCreator={isTeamCreator}
          autoLoading={autoLoading} fieldRef={fieldRef}
          handleFieldTap={handleFieldTap} handleBenchTap={handleBenchTap}
          handleFormationChange={handleFormationChange} handleSaveLineup={handleSaveLineup}
          handleAutoLineup={handleAutoLineup} onShowAddModal={() => setShowAddModal(true)}
        />
      )}

      {/* Result Tab */}
      {activeTab === 'result' && (
        <LineupResult
          homeLabel={match.home_team_id === team?.id ? (team?.name || '') : (match.home_team?.name || '')}
          awayLabel={match.home_team_id === team?.id ? (match.away_team?.name || '상대') : (team?.name || '')}
          homeScore={homeScore} awayScore={awayScore}
          setHomeScore={setHomeScore} setAwayScore={setAwayScore}
          goalEntries={goalEntries} setGoalEntries={setGoalEntries}
          allPlayers={allPlayers} isTeamCreator={isTeamCreator}
          resultSaving={resultSaving} handleSaveResult={handleSaveResult}
          matchCompleted={match.status === 'completed' && match.home_score !== null}
        />
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <>
          <div className="px-4 pt-3 space-y-3 pb-2">
            {chatMsgs.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">메시지가 없습니다. 첫 메시지를 보내보세요!</p>
            )}
            {chatMsgs.map(msg => (
              <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  {!msg.isMe && <p className="text-[10px] text-gray-500 mb-0.5 ml-1">{msg.sender}</p>}
                  <div className={`px-3 py-2 rounded-2xl ${msg.isMe ? 'bg-[#7B2D3B] text-white rounded-br-md' : 'bg-[#F5F3F0] text-gray-700 rounded-bl-md'}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                  <p className={`text-[9px] text-gray-400 mt-0.5 ${msg.isMe ? 'text-right mr-1' : 'ml-1'}`}>{msg.time}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="fixed left-0 right-0 max-w-[430px] mx-auto p-3 border-t border-gray-200 bg-white/95 backdrop-blur-md z-20" style={{ bottom: '7.5rem' }}>
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="메시지 입력..."
                className="flex-1 bg-[#F5F3F0] border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" />
              <button onClick={sendChat}
                className="bg-[#7B2D3B] text-white p-2.5 rounded-xl active:scale-95 transition-transform">
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Preference Modal */}
      {showPrefModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowPrefModal(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-[430px] border-t border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">참여 선호도 설정</h3>
              <button onClick={() => setShowPrefModal(false)} className="text-gray-500"><X size={18} /></button>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">희망 포지션 <span className="text-violet-400">(순서대로 우선순위, 최대 3개)</span></p>
              <div className="flex gap-2">
                {ALL_POSITIONS.map(pos => {
                  const idx = prefPositions.indexOf(pos);
                  const selected = idx !== -1;
                  const labels: Record<string, string> = { FW: 'FW', MF: 'MF', DF: 'DF', GK: 'GK' };
                  return (
                    <button key={pos} onClick={() => togglePrefPosition(pos)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold relative ${
                        selected ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {labels[pos]}
                      {selected && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-violet-600 rounded-full text-[9px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {prefPositions.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {prefPositions.map((pos, i) => {
                    const labels: Record<string, string> = { FW: 'FW', MF: 'MF', DF: 'DF', GK: 'GK' };
                    return <span key={pos} className="text-[10px] text-violet-400">{i > 0 && ' → '}{i + 1}순위 {labels[pos] || pos}</span>;
                  })}
                </div>
              )}
            </div>

            <div className="mb-5">
              <p className="text-xs text-gray-400 mb-2">뛰고 싶은 쿼터 <span className="text-blue-400">(복수 선택 가능)</span></p>
              <div className="flex gap-2">
                {quarters.map(q => {
                  const selected = prefQuarters.includes(q);
                  return (
                    <button key={q} onClick={() => setPrefQuarters(prev =>
                      selected ? prev.filter(p => p !== q) : [...prev, q]
                    )}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${
                        selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {q}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={handleSubmitPreference}
              className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
              참여 등록
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-[430px] border-t border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">선수 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500"><X size={18} /></button>
            </div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="이름"
              className="w-full bg-[#F5F3F0] border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 mb-3 focus:outline-none" />
            <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="등번호" type="number"
              className="w-full bg-[#F5F3F0] border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 mb-3 focus:outline-none" />
            <div className="flex gap-2 mb-4">
              {['GK', 'DF', 'MF', 'FW'].map(p => (
                <button key={p} onClick={() => setNewPos(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold ${newPos === p ? 'bg-[#7B2D3B] text-white' : 'bg-gray-100 text-gray-500'}`}>{p}</button>
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
