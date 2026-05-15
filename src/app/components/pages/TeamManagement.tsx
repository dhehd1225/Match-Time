import { useState, useEffect, useRef } from 'react';
import { Search, UserMinus, X, Camera, Save, Trash2, PlusCircle, Hash, Copy, Check, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { Match } from '../../../lib/types';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { TeamMember } from '../../../lib/types';

const positionColors: Record<string, string> = {
  GK: 'text-yellow-500',
  DF: 'text-blue-400',
  MF: 'text-emerald-400',
  FW: 'text-red-400',
};

const emojis = ['⚽', '🐆', '🦅', '🐯', '🦁', '💙', '⚡', '🔥', '🐉', '⭐'];

export default function TeamManagement() {
  const { team, user, isTeamCreator, refreshProfile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('전체');
  const positions = ['전체', 'GK', 'DF', 'MF', 'FW'];

  const navigate = useNavigate();
  const [teamRecord, setTeamRecord] = useState({ win: 0, draw: 0, lose: 0 });
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [showRecord, setShowRecord] = useState(false);

  // 팀 생성/가입
  const [showTeamModal, setShowTeamModal] = useState<'create' | 'join' | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('⚽');
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinRequests, setJoinRequests] = useState<{ id: string; name: string; userId: string }[]>([]);

  // 팀 편집
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const openEditModal = () => {
    if (!team) return;
    setEditName(team.name || '');
    setEditLogo(team.logo?.startsWith('http') ? '' : (team.logo || '⚽'));
    setEditLogoFile(null);
    setEditLogoPreview(team.logo?.startsWith('http') ? team.logo : null);
    setShowEditModal(true);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditLogoFile(file);
    setEditLogo('');
    const reader = new FileReader();
    reader.onload = () => setEditLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveTeam = async () => {
    if (!team || !user || !editName.trim()) return;
    setEditSaving(true);

    let logoValue = editLogo || '⚽';

    if (editLogoFile) {
      const fileExt = editLogoFile.name.split('.').pop();
      const fileName = `${team.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(fileName, editLogoFile);
      if (uploadError) {
        toast.error('로고 업로드에 실패했습니다.');
        setEditSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('team-logos')
        .getPublicUrl(fileName);
      logoValue = urlData.publicUrl;
    } else if (editLogoPreview?.startsWith('http')) {
      logoValue = editLogoPreview;
    }

    const { error } = await supabase.from('teams').update({
      name: editName.trim(),
      logo: logoValue,
    }).eq('id', team.id);

    if (error) {
      toast.error('저장 실패: ' + error.message);
    } else {
      await refreshProfile();
      toast.success('팀 정보가 수정되었습니다.');
      setShowEditModal(false);
    }
    setEditSaving(false);
  };

  // 가입 요청 조회
  const fetchJoinRequests = async () => {
    if (!team || !user || !isTeamCreator) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'team_join')
      .eq('title', '팀 가입 요청')
      .eq('related_id', team.id)
      .eq('status', 'pending');
    if (data) {
      setJoinRequests(data.map(n => {
        const parts = n.description?.split('::') || [];
        const name = parts[1]?.split('님이')[0] || '유저';
        return { id: n.id, userId: parts[0] || '', name };
      }));
    }
  };

  const handleJoinAction = async (reqId: string, reqUserId: string, action: 'accept' | 'reject') => {
    if (!team) return;
    if (action === 'accept') {
      await supabase.from('team_members').insert({ team_id: team.id, user_id: reqUserId, role: 'member' });
      await supabase.from('notifications').insert({
        user_id: reqUserId, type: 'team_join', title: '팀 가입 승인',
        description: `${team.name} 가입이 승인되었습니다!`, related_id: team.id,
      });
      toast.success('가입을 승인했습니다.');
      fetchMembers();
    } else {
      await supabase.from('notifications').insert({
        user_id: reqUserId, type: 'team_join', title: '팀 가입 거절',
        description: `${team.name} 가입이 거절되었습니다.`, related_id: team.id,
      });
      toast.success('가입을 거절했습니다.');
    }
    await supabase.from('notifications').delete().eq('id', reqId);
    setJoinRequests(prev => prev.filter(r => r.id !== reqId));
  };

  const getTeamCode = (id: string) => id.replace(/-/g, '').substring(0, 6).toUpperCase();

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    setCreating(true);
    const { data: teamData, error } = await supabase
      .from('teams')
      .insert({ name: newTeamName.trim(), logo: newTeamLogo, created_by: user.id })
      .select('id')
      .single();
    if (error || !teamData) { toast.error('팀 생성에 실패했습니다.'); setCreating(false); return; }
    await supabase.from('team_members').insert({ team_id: teamData.id, user_id: user.id, role: 'president' });
    await refreshProfile();
    setCreating(false);
    setCreatedCode(getTeamCode(teamData.id));
  };

  const handleJoinTeam = async () => {
    if (!user || !joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) { setJoinError('6자리 팀 코드를 입력해주세요.'); return; }
    setJoining(true); setJoinError('');
    const { data: allTeams } = await supabase.from('teams').select('*');
    const matched = allTeams?.find(t => t.id.replace(/-/g, '').substring(0, 6).toUpperCase() === code);
    if (!matched) { setJoinError('해당 코드의 팀을 찾을 수 없습니다.'); setJoining(false); return; }
    const { data: existing } = await supabase.from('team_members').select('id').eq('team_id', matched.id).eq('user_id', user.id).maybeSingle();
    if (existing) { setJoinError('이미 가입된 팀입니다.'); setJoining(false); return; }
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
    await supabase.from('notifications').insert({
      user_id: matched.created_by, type: 'team_join', title: '팀 가입 요청',
      description: `${user.id}::${profile?.name || '유저'}님이 ${matched.name} 팀에 가입을 요청했습니다.`,
      related_id: matched.id,
    });
    toast.success(`${matched.name} 팀에 가입 요청을 보냈습니다.`);
    setJoining(false); setShowTeamModal(null); setJoinCode('');
  };

  const handleDeleteTeam = async () => {
    if (!team || !user) return;
    if (!confirm('정말 이 팀을 삭제하시겠습니까?\n모든 팀원, 경기, 기록이 삭제됩니다.')) return;
    try {
      const { data: homeMatches } = await supabase.from('matches').select('id').eq('home_team_id', team.id);
      if (homeMatches?.length) {
        const ids = homeMatches.map(m => m.id);
        await supabase.from('match_events').delete().in('match_id', ids);
        await supabase.from('match_attendance').delete().in('match_id', ids);
        await supabase.from('lineups').delete().in('match_id', ids);
        await supabase.from('notifications').delete().in('related_id', ids);
        await supabase.from('matches').delete().eq('home_team_id', team.id);
      }
      await supabase.from('matches').update({ away_team_id: null, status: 'open' }).eq('away_team_id', team.id);
      const { data: rooms } = await supabase.from('chat_rooms').select('id').or(`team_id.eq.${team.id},team_a_id.eq.${team.id},team_b_id.eq.${team.id}`);
      if (rooms?.length) {
        await supabase.from('chat_messages').delete().in('room_id', rooms.map(r => r.id));
        await supabase.from('chat_rooms').delete().in('id', rooms.map(r => r.id));
      }
      await supabase.from('team_members').delete().eq('team_id', team.id);
      const { error } = await supabase.from('teams').delete().eq('id', team.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('팀이 삭제되었습니다.');
    } catch {
      toast.error('팀 삭제에 실패했습니다.');
    }
  };

  const handleLeaveTeam = async () => {
    if (!team || !user) return;
    if (!confirm(`${team.name} 팀에서 탈퇴하시겠습니까?`)) return;
    await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', user.id);
    await refreshProfile();
    toast.success(`${team.name} 팀에서 탈퇴했습니다.`);
  };

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (memberUserId === user?.id) return;
    if (!confirm(`${memberName}님을 팀에서 제거하시겠습니까?`)) return;
    const { error, count } = await supabase.from('team_members').delete({ count: 'exact' }).eq('team_id', team!.id).eq('user_id', memberUserId);
    if (error) {
      console.error('팀원 제거 에러:', error);
      toast.error(`제거 실패: ${error.message}`);
      return;
    }
    if (count === 0) {
      toast.error('제거할 팀원을 찾을 수 없습니다. RLS 정책을 확인해주세요.');
      return;
    }
    fetchMembers();
    toast.success(`${memberName}님을 제거했습니다.`);
  };

  const fetchMembers = async () => {
    if (!team) { setLoading(false); return; }
    const { data } = await supabase
      .from('team_members')
      .select('*, profile:profiles(*)')
      .eq('team_id', team.id)
      .order('joined_at', { ascending: true });

    if (data) setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
    fetchJoinRequests();

    if (!team) return;

    // 팀 전적 계산 + 매치 히스토리
    const fetchRecord = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('status', 'completed')
        .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
        .order('date', { ascending: false });
      if (matches) {
        let win = 0, draw = 0, lose = 0;
        for (const m of matches) {
          if (m.home_score === null || m.away_score === null) continue;
          const isHome = m.home_team_id === team.id;
          const my = isHome ? m.home_score : m.away_score;
          const opp = isHome ? m.away_score : m.home_score;
          if (my > opp) win++;
          else if (my === opp) draw++;
          else lose++;
        }
        setTeamRecord({ win, draw, lose });
        setMatchHistory(matches);
      }
    };
    fetchRecord();

    const channel = supabase
      .channel('team-members-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${team.id}` }, () => {
        fetchMembers();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [team]);

  const filteredMembers = members.filter(m => {
    const name = m.profile?.name || '';
    const pos = m.profile?.position || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = selectedPosition === '전체' || pos === selectedPosition;
    return matchesSearch && matchesPosition;
  });

  const topScorer = members.length > 0 ? members.reduce((prev, c) => (prev.goals > c.goals) ? prev : c) : null;
  const topAssist = members.length > 0 ? members.reduce((prev, c) => (prev.assists > c.assists) ? prev : c) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3]">
        <div className="px-4 py-3 border-b border-[#E5E2DC]"><div className="bg-[#E5E2DC] rounded w-24 h-5 animate-pulse" /></div>
        <div className="p-4 space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3">
              <div className="w-5 h-4 bg-[#E5E2DC] rounded animate-pulse" />
              <div className="w-20 h-4 bg-[#E5E2DC] rounded animate-pulse" />
              <div className="w-8 h-3 bg-[#E5E2DC] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F3] pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E5E2DC] px-4 pt-4 pb-3 flex items-end justify-between">
        <h1 className="font-title text-[30px] text-[#111] leading-none">TEAM</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowTeamModal('join'); setJoinCode(''); setJoinError(''); }}
            className="px-3 py-1.5 bg-[#F0EEE9] rounded-lg text-xs font-bold text-[#555]">팀 가입</button>
          <button onClick={() => { setShowTeamModal('create'); setNewTeamName(''); setNewTeamLogo('⚽'); setCreatedCode(null); }}
            className="px-3 py-1.5 bg-[#111] rounded-lg text-xs font-bold text-white flex items-center gap-1"><PlusCircle size={12} />팀 생성</button>
        </div>
      </div>
      <div className="px-4 pt-3 pb-2">
        <div onClick={isTeamCreator ? openEditModal : undefined}
          className={`flex items-center gap-3 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3 ${isTeamCreator ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}>
          {team?.logo?.startsWith('http') ? (
            <img src={team.logo} alt="" className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#F0EEE9] flex items-center justify-center text-xl">
              {team?.logo || '⚽'}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-base font-bold text-[#111]">{team?.name || '팀'}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-[#888]">선수 {members.length}명{isTeamCreator ? ' · 탭하여 수정' : ''}</p>
              {team && (
                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(getTeamCode(team.id)); toast.success('팀 코드가 복사되었습니다'); }}
                  className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded text-[#888] hover:text-[#555] bg-[#E5E2DC]">
                  <Copy size={10} />{getTeamCode(team.id)}
                </button>
              )}
            </div>
          </div>
          {isTeamCreator ? (
            <button onClick={(e) => { e.stopPropagation(); handleDeleteTeam(); }}
              className="p-2 text-[#CCC] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={16} />
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); handleLeaveTeam(); }}
              className="p-2 text-[#CCC] hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
              <LogOut size={16} />
            </button>
          )}
        </div>
        <button onClick={() => setShowRecord(true)}
          className="mt-2 w-full py-2.5 bg-[#F0EEE9] rounded-xl text-sm font-bold text-[#555] hover:scale-[1.02] active:scale-[0.98] transition-transform">
          {teamRecord.win}승 {teamRecord.draw}무 {teamRecord.lose}패
        </button>
      </div>

      {/* 가입 요청 (팀장만) */}
      {isTeamCreator && joinRequests.length > 0 && (
        <div className="px-4 pb-3">
          <h3 className="text-sm font-bold text-[#111] mb-2">가입 요청 <span className="text-[#C8102E]">{joinRequests.length}</span></h3>
          <div className="space-y-2">
            {joinRequests.map(req => (
              <div key={req.id} className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#F0EEE9] rounded-full flex items-center justify-center text-sm font-bold text-[#888]">
                  {req.name.charAt(0)}
                </div>
                <span className="flex-1 text-sm font-bold text-[#111]">{req.name}</span>
                <button onClick={() => handleJoinAction(req.id, req.userId, 'reject')}
                  className="p-1.5 rounded-lg text-[#CCC] hover:text-red-500 hover:bg-red-50">
                  <X size={16} />
                </button>
                <button onClick={() => handleJoinAction(req.id, req.userId, 'accept')}
                  className="p-1.5 rounded-lg text-[#CCC] hover:text-emerald-500 hover:bg-emerald-50">
                  <Check size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <div className="bg-[#F0EEE9] p-3 rounded-lg text-center">
          <p className="text-[10px] text-[#888] mb-1">득점왕</p>
          <p className="font-bold text-sm text-[#111]">{topScorer?.profile?.name || '-'}</p>
          <p className="text-xs text-red-400">{topScorer ? `${topScorer.goals}골` : '-'}</p>
        </div>
        <div className="bg-[#F0EEE9] p-3 rounded-lg text-center">
          <p className="text-[10px] text-[#888] mb-1">도움왕</p>
          <p className="font-bold text-sm text-[#111]">{topAssist?.profile?.name || '-'}</p>
          <p className="text-xs text-emerald-400">{topAssist ? `${topAssist.assists}개` : '-'}</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="px-4 mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCC]" size={16} />
          <input
            type="text"
            placeholder="선수 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#F0EEE9] border-none rounded-lg text-[#111] text-sm placeholder:text-[#CCC] focus:outline-none focus:ring-1 focus:ring-[#111]/30"
          />
        </div>
        <div className="flex gap-2">
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => setSelectedPosition(pos)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedPosition === pos
                  ? 'bg-[#111] text-white'
                  : 'bg-[#F0EEE9] text-[#555]'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div className="px-4 space-y-2">
        {filteredMembers.map(member => {
          const profile = member.profile;
          return (
            <div key={member.id} className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-3 flex items-center gap-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 bg-[#F0EEE9] rounded-full flex items-center justify-center text-[#888] font-bold text-sm shrink-0">
                  {profile?.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-[#111]">{profile?.name || '이름 없음'}</p>
                  <span className={`text-[10px] font-bold ${positionColors[profile?.position || 'MF']}`}>{profile?.position || 'MF'}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-[#888]">{member.appearances}경기</span>
                  <span className="text-[11px] text-red-400">{member.goals}골</span>
                  <span className="text-[11px] text-emerald-400">{member.assists}도움</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#CCC]">#{profile?.back_number || '-'}</span>
                {isTeamCreator && member.user_id !== user?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id, profile?.name || '팀원')}
                    className="p-1.5 text-[#CCC] hover:text-red-400 transition-colors"
                    title="팀원 제거"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <p className="text-center text-[#CCC] py-8 text-sm">
            {members.length === 0 ? '팀원이 없습니다' : '검색 결과가 없습니다'}
          </p>
        )}
      </div>

      {/* 팀 편집 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-[430px] border-t border-[#E5E2DC]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#111]">팀 정보 수정</h3>
              <button onClick={() => setShowEditModal(false)} className="text-[#888]"><X size={18} /></button>
            </div>

            {/* 로고 */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative mb-3">
                <div className="w-20 h-20 bg-[#F0EEE9] rounded-full flex items-center justify-center border-2 border-[#E5E2DC] overflow-hidden">
                  {editLogoPreview ? (
                    <img src={editLogoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{editLogo}</span>
                  )}
                </div>
                <button onClick={() => logoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#111] rounded-full flex items-center justify-center">
                  <Camera size={12} className="text-white" />
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFileChange} className="hidden" />
              </div>
              {editLogoPreview ? (
                <button onClick={() => { setEditLogoFile(null); setEditLogoPreview(null); setEditLogo('⚽'); }}
                  className="text-xs text-[#888] underline mb-3">이모지로 변경</button>
              ) : (
                <div className="flex justify-center gap-2 mb-3 flex-wrap">
                  {emojis.map(e => (
                    <button key={e} onClick={() => { setEditLogo(e); setEditLogoFile(null); setEditLogoPreview(null); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${editLogo === e ? 'bg-[#111] ring-2 ring-[#333]' : 'bg-[#F0EEE9] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 이름 */}
            <div className="mb-5">
              <label className="text-xs font-bold text-[#CCC] mb-1.5 block">팀 이름</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full p-3 bg-[#F0EEE9] border-none rounded-lg text-sm text-[#111] font-medium focus:ring-1 focus:ring-[#111]/30 outline-none" />
            </div>

            <button onClick={handleSaveTeam} disabled={!editName.trim() || editSaving}
              className="w-full bg-[#111] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              <Save size={16} /> {editSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 전적 모달 */}
      {showRecord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowRecord(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-[430px] border-t border-[#E5E2DC] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-base font-bold text-[#111]">경기 기록</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#888]">{teamRecord.win}승 {teamRecord.draw}무 {teamRecord.lose}패</span>
                <button onClick={() => setShowRecord(false)} className="text-[#888]"><X size={18} /></button>
              </div>
            </div>
            <div className="overflow-y-auto px-5 pb-5 space-y-2">
              {matchHistory.length > 0 ? matchHistory.map(m => {
                const isHome = m.home_team_id === team?.id;
                const my = isHome ? m.home_score : m.away_score;
                const opp = isHome ? m.away_score : m.home_score;
                const opponent = isHome ? m.away_team : m.home_team;
                const rl = my != null && opp != null ? (my > opp ? 'W' : my === opp ? 'D' : 'L') : '-';
                const rbg = rl === 'W' ? 'bg-[#111] text-white' : rl === 'D' ? 'bg-[#E5E2DC] text-[#888]' : 'bg-blue-50 text-blue-500';
                const fd = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                return (
                  <div key={m.id} className="bg-[#F7F6F3] rounded-xl p-3 flex items-center gap-3">
                    <span className={`text-[11px] font-black w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${rbg}`}>{rl}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{opponent?.logo || '⚽'}</span>
                        <span className="text-sm font-bold text-[#111] truncate">vs {opponent?.name || '상대'}</span>
                      </div>
                      <p className="text-[11px] text-[#CCC]">{fd(m.date)} · {m.stadium}</p>
                    </div>
                    <span className="text-lg font-black text-[#111] tabular-nums">{my ?? '-'} : {opp ?? '-'}</span>
                  </div>
                );
              }) : (
                <p className="text-sm text-[#CCC] py-8 text-center">아직 경기 기록이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 팀 생성/가입 모달 */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowTeamModal(null)}>
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-[430px] border-t border-[#E5E2DC]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#111]">{showTeamModal === 'create' ? '팀 생성' : '팀 가입'}</h3>
              <button onClick={() => setShowTeamModal(null)} className="text-[#888]"><X size={18} /></button>
            </div>

            {showTeamModal === 'create' && !createdCode && (
              <>
                <div className="flex justify-center gap-2 mb-4 flex-wrap">
                  {emojis.map(e => (
                    <button key={e} onClick={() => setNewTeamLogo(e)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${newTeamLogo === e ? 'bg-[#111] ring-2 ring-[#333]' : 'bg-[#F0EEE9]'}`}>{e}</button>
                  ))}
                </div>
                <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="팀 이름"
                  className="w-full p-3 bg-[#F0EEE9] border-none rounded-lg text-sm text-[#111] font-medium focus:ring-1 focus:ring-[#111]/30 outline-none mb-4" />
                <button onClick={handleCreateTeam} disabled={!newTeamName.trim() || creating}
                  className="w-full bg-[#111] text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50">
                  {creating ? '생성 중...' : '팀 만들기'}
                </button>
              </>
            )}

            {showTeamModal === 'create' && createdCode && (
              <div className="text-center py-4">
                <p className="text-sm text-[#888] mb-3">팀이 생성되었습니다! 아래 코드를 팀원에게 공유하세요.</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-2xl font-black tracking-widest text-[#111]">{createdCode}</span>
                  <button onClick={() => { navigator.clipboard.writeText(createdCode); toast.success('복사됨'); }}
                    className="p-1.5 text-[#888] hover:text-[#111]"><Copy size={16} /></button>
                </div>
                <button onClick={() => setShowTeamModal(null)}
                  className="w-full bg-[#111] text-white py-3 rounded-xl font-bold text-sm">확인</button>
              </div>
            )}

            {showTeamModal === 'join' && (
              <>
                <div className="relative mb-4">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCC]" size={16} />
                  <input type="text" value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                    placeholder="6자리 팀 코드 입력" maxLength={6}
                    className="w-full pl-9 pr-4 py-3 bg-[#F0EEE9] border-none rounded-lg text-sm text-[#111] font-bold tracking-widest uppercase focus:ring-1 focus:ring-[#111]/30 outline-none" />
                </div>
                {joinError && <p className="text-xs text-red-500 mb-3">{joinError}</p>}
                <button onClick={handleJoinTeam} disabled={joinCode.length < 6 || joining}
                  className="w-full bg-[#111] text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50">
                  {joining ? '요청 중...' : '가입 요청'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
