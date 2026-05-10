import { useState, useEffect, useRef } from 'react';
import { UserCheck, ChevronDown, ChevronUp, Bell, Trophy, Check, X, Clock, Save, PlusCircle, Hash, Copy, Instagram, AlertCircle, CheckCircle2, Trash2, Camera, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { trackEvent } from '../../../hooks/useAnalytics';
import { toast } from 'sonner';
import type { Notification } from '../../../lib/types';

function getTeamCode(teamId: string) {
  return teamId.replace(/-/g, '').substring(0, 6).toUpperCase();
}

export function MyPage() {
  const navigate = useNavigate();
  const { profile, user, membership, teams, team, setCurrentTeamId, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [position, setPosition] = useState('MF');
  const [backNumber, setBackNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);

  const [originalName, setOriginalName] = useState('');
  const [originalPosition, setOriginalPosition] = useState('');
  const [originalBackNumber, setOriginalBackNumber] = useState('');

  // 팀 생성 폼
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamInsta, setNewTeamInsta] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('\u26bd');
  const [newTeamLogoFile, setNewTeamLogoFile] = useState<File | null>(null);
  const [newTeamLogoPreview, setNewTeamLogoPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // 팀 가입 폼
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinedTeamName, setJoinedTeamName] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPosition(profile.position || 'MF');
      setBackNumber(profile.back_number?.toString() || '');
      setOriginalName(profile.name || '');
      setOriginalPosition(profile.position || 'MF');
      setOriginalBackNumber(profile.back_number?.toString() || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const channel = supabase
      .channel('my-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const hasChanges = name !== originalName || position !== originalPosition || backNumber !== originalBackNumber;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({
      name,
      position,
      back_number: backNumber ? parseInt(backNumber) : null,
    }).eq('id', user.id);
    setOriginalName(name);
    setOriginalPosition(position);
    setOriginalBackNumber(backNumber);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const pendingCount = notifications.length;

  const handleAction = async (id: string, action: 'accepted' | 'rejected') => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    // 즉시 UI에서 제거 (optimistic)
    setNotifications(prev => prev.filter(n => n.id !== id));

    // 알림 유형별 처리
    if (notif.type === 'match_request' && notif.related_id) {
      if (action === 'accepted') {
        await supabase.from('matches').update({ status: 'confirmed' }).eq('id', notif.related_id);
      } else {
        await supabase.from('matches').update({ away_team_id: null, status: 'open' }).eq('id', notif.related_id);
      }
    } else if (notif.type === 'team_join' && notif.related_id) {
      const requesterId = notif.description?.split('::')[0];
      if (action === 'accepted' && requesterId) {
        await supabase.from('team_members').insert({
          team_id: notif.related_id,
          user_id: requesterId,
          role: 'member',
        });
        // 요청자에게 승인 알림 발송
        const { data: teamInfo } = await supabase.from('teams').select('name').eq('id', notif.related_id).single();
        await supabase.from('notifications').insert({
          user_id: requesterId,
          type: 'team_join',
          title: '팀 가입 승인',
          description: `${teamInfo?.name || '팀'} 가입이 승인되었습니다!`,
          related_id: notif.related_id,
        });
      } else if (action === 'rejected' && requesterId) {
        const { data: teamInfo } = await supabase.from('teams').select('name').eq('id', notif.related_id).single();
        await supabase.from('notifications').insert({
          user_id: requesterId,
          type: 'team_join',
          title: '팀 가입 거절',
          description: `${teamInfo?.name || '팀'} 가입이 거절되었습니다.`,
          related_id: notif.related_id,
        });
      }
    } else if (notif.type === 'match_vote' && notif.related_id && user) {
      await supabase.from('match_attendance').upsert({
        match_id: notif.related_id,
        user_id: user.id,
        status: action === 'accepted' ? 'attending' : 'not-attending',
      }, { onConflict: 'match_id,user_id' });
    }

    // DB에서 삭제
    await supabase.from('notifications').update({ status: action }).eq('id', id);
    await supabase.from('notifications').delete().eq('id', id);
    trackEvent('notification_action', { type: notif.type, action });
  };

  const handleCopyCode = async (code: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedTeamId(id || '__created');
    setTimeout(() => setCopiedTeamId(null), 2000);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewTeamLogoFile(file);
    setNewTeamLogo('');
    const reader = new FileReader();
    reader.onload = () => setNewTeamLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // 팀 생성 처리
  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    setCreating(true);

    let logoValue = newTeamLogo || '\u26bd';

    if (newTeamLogoFile) {
      const fileExt = newTeamLogoFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(fileName, newTeamLogoFile);
      if (uploadError) {
        toast.error('로고 업로드에 실패했습니다.');
        setCreating(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('team-logos')
        .getPublicUrl(fileName);
      logoValue = urlData.publicUrl;
    }

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: newTeamName.trim(),
        logo: logoValue,
        description: newTeamDesc.trim() || null,
        instagram: newTeamInsta.trim() || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (teamError || !teamData) {
      toast.error('팀 생성에 실패했습니다.');
      setCreating(false);
      return;
    }

    await supabase.from('team_members').insert({
      team_id: teamData.id,
      user_id: user.id,
      role: 'president',
    });

    await refreshProfile();
    setCreating(false);
    setCreatedCode(getTeamCode(teamData.id));
    trackEvent('team_create', { name: newTeamName.trim() });
  };

  // 팀 삭제 (팀 생성자만)
  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('정말 이 팀을 삭제하시겠습니까?\n모든 팀원, 경기, 기록이 삭제됩니다.')) return;

    try {
      // 홈 매치 관련 데이터 정리
      const { data: homeMatches } = await supabase
        .from('matches')
        .select('id')
        .eq('home_team_id', teamId);

      if (homeMatches?.length) {
        const matchIds = homeMatches.map(m => m.id);
        await supabase.from('match_attendance').delete().in('match_id', matchIds);
        await supabase.from('lineups').delete().in('match_id', matchIds);
        await supabase.from('notifications').delete().in('related_id', matchIds);
        await supabase.from('matches').delete().eq('home_team_id', teamId);
      }

      // 어웨이로 등록된 매치 해제
      await supabase.from('matches').update({ away_team_id: null, status: 'open' }).eq('away_team_id', teamId);

      // 채팅방 정리 (team_id, team_a_id, team_b_id 모두 확인)
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .or(`team_id.eq.${teamId},team_a_id.eq.${teamId},team_b_id.eq.${teamId}`);
      if (rooms?.length) {
        const roomIds = rooms.map(r => r.id);
        await supabase.from('chat_messages').delete().in('room_id', roomIds);
        await supabase.from('chat_rooms').delete().in('id', roomIds);
      }

      // 팀 멤버 삭제
      await supabase.from('team_members').delete().eq('team_id', teamId);

      // 팀 삭제
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;

      await refreshProfile();
    } catch {
      toast.error('팀 삭제에 실패했습니다. 진행 중인 시합이 있다면 먼저 취소해주세요.');
    }
  };

  // 팀 탈퇴 (일반 멤버)
  const handleLeaveTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`${teamName} 팀에서 탈퇴하시겠습니까?`)) return;
    if (!user) return;
    await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', user.id);
    await refreshProfile();
    toast.success(`${teamName} 팀에서 탈퇴했습니다.`);
  };

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setNewTeamName('');
    setNewTeamDesc('');
    setNewTeamInsta('');
    setNewTeamLogo('\u26bd');
    setNewTeamLogoFile(null);
    setNewTeamLogoPreview(null);
    setCreatedCode(null);
  };

  // 팀 가입 요청 (팀장 수락 필요)
  const handleJoinTeam = async () => {
    if (!user || !joinCode.trim()) return;
    const normalizedCode = joinCode.trim().toUpperCase();
    if (normalizedCode.length < 6) {
      setJoinError('6자리 팀 코드를 입력해주세요.');
      return;
    }

    setJoining(true);
    setJoinError('');

    const { data: allTeams } = await supabase.from('teams').select('*');
    const matched = allTeams?.find(t =>
      t.id.replace(/-/g, '').substring(0, 6).toUpperCase() === normalizedCode
    );

    if (!matched) {
      setJoinError('해당 코드의 팀을 찾을 수 없습니다.');
      setJoining(false);
      return;
    }

    // 이미 가입된 팀인지 확인
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', matched.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      setJoinError('이미 가입된 팀입니다.');
      setJoining(false);
      return;
    }

    // 이미 가입 요청을 보냈는지 확인
    const { data: pendingNotifs } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'team_join')
      .eq('related_id', matched.id)
      .eq('status', 'pending');

    const alreadyRequested = pendingNotifs?.some(n => true) && pendingNotifs?.length;
    // 더 정확한 체크: description에 user.id가 포함되어 있는지 (이 사용자의 요청인지)
    if (alreadyRequested) {
      const { data: myPending } = await supabase
        .from('notifications')
        .select('id, description')
        .eq('type', 'team_join')
        .eq('related_id', matched.id)
        .eq('status', 'pending');
      if (myPending?.some(n => n.description?.startsWith(user.id))) {
        setJoinError('이미 가입 요청을 보냈습니다. 팀장의 수락을 기다려주세요.');
        setJoining(false);
        return;
      }
    }

    // 팀장에게 가입 요청 알림 발송
    await supabase.from('notifications').insert({
      user_id: matched.created_by,
      type: 'team_join',
      title: '팀 가입 요청',
      description: `${user.id}::${profile?.name || '유저'}님이 ${matched.name} 팀에 가입을 요청했습니다.`,
      related_id: matched.id,
    });

    setJoining(false);
    setJoinedTeamName(matched.name);
  };

  const resetJoinForm = () => {
    setShowJoinForm(false);
    setJoinCode('');
    setJoinError('');
    setJoinedTeamName('');
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일 전`;
  };

  const getIcon = (type: string) => {
    if (type === 'match_request') return <Trophy size={16} className="text-red-400" />;
    if (type === 'team_join') return <UserCheck size={16} className="text-blue-400" />;
    return <Clock size={16} className="text-emerald-400" />;
  };

  const emojis = ['\u26bd', '\ud83d\udc06', '\ud83e\udd85', '\ud83d\udc2f', '\ud83e\udd81', '\ud83d\udc99', '\u26a1', '\ud83d\udd25', '\ud83d\udc09', '\u2b50'];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <h1 className="text-lg font-bold text-white">마이 페이지</h1>
      </div>

      {/* Profile */}
      <div className="p-5">
        <div className="flex items-center gap-4 mb-6">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 bg-[#7B2D3B] rounded-full flex items-center justify-center text-white text-xl font-bold">
              {name?.charAt(0) || '?'}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{name || '이름 없음'}</h2>
            <p className="text-sm text-gray-500">{position} {backNumber ? `· #${backNumber}` : ''}</p>
          </div>
        </div>

        {/* Edit Info */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[10px] font-bold text-gray-600 mb-1.5 block">이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full p-3 bg-[#111] border border-white/10 rounded-xl text-sm text-white font-medium focus:ring-1 focus:ring-[#7B2D3B] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-600 mb-1.5 block">포지션</label>
              <select value={position} onChange={e => setPosition(e.target.value)}
                className="w-full p-3 bg-[#111] border border-white/10 rounded-xl text-sm text-white font-medium focus:ring-1 focus:ring-[#7B2D3B] outline-none appearance-none">
                <option value="FW" className="bg-[#1a1a1a] text-white">포워드(FW)</option>
                <option value="MF" className="bg-[#1a1a1a] text-white">미드필더(MF)</option>
                <option value="DF" className="bg-[#1a1a1a] text-white">수비수(DF)</option>
                <option value="GK" className="bg-[#1a1a1a] text-white">골키퍼(GK)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-600 mb-1.5 block">등번호</label>
              <input type="number" value={backNumber} onChange={e => setBackNumber(e.target.value)}
                className="w-full p-3 bg-[#111] border border-white/10 rounded-xl text-sm text-white font-medium focus:ring-1 focus:ring-[#7B2D3B] outline-none" />
            </div>
          </div>
          {hasChanges && (
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-[#7B2D3B] text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              {saving ? '저장 중...' : <><Save size={14} /> 프로필 저장</>}
            </button>
          )}
          {saved && !hasChanges && (
            <p className="text-center text-emerald-400 text-xs font-medium">저장 완료!</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#111] p-3 rounded-2xl text-center border border-white/5">
            <p className="text-[10px] text-gray-600 mb-1">득점</p>
            <p className="text-xl font-black text-[#7B2D3B]">{membership?.goals ?? 0}</p>
          </div>
          <div className="bg-[#111] p-3 rounded-2xl text-center border border-white/5">
            <p className="text-[10px] text-gray-600 mb-1">도움</p>
            <p className="text-xl font-black text-emerald-500">{membership?.assists ?? 0}</p>
          </div>
          <div className="bg-[#111] p-3 rounded-2xl text-center border border-white/5">
            <p className="text-[10px] text-gray-600 mb-1">평점</p>
            <p className="text-xl font-black text-blue-500">{membership?.rating ?? 0}</p>
          </div>
        </div>

        {/* My Teams */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white mb-3">내 팀</h3>
          {teams.length > 0 ? (
            <div className="space-y-2 mb-3">
              {teams.map(t => (
                <div key={t.id}
                  className={`flex items-center justify-between p-3 bg-[#111] rounded-2xl border transition-all ${
                    t.id === team?.id ? 'border-[#7B2D3B]/50' : 'border-white/5'
                  }`}
                >
                  <button
                    onClick={() => {
                      setCurrentTeamId(t.id);
                      navigate('/team');
                    }}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    {t.logo?.startsWith('http') ? (
                      <img src={t.logo} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-xl">{t.logo}</span>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-white text-sm truncate">{t.name}</p>
                        {t.created_by === user?.id && (
                          <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">팀장</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-600 flex items-center gap-1">
                        <Hash size={10} /> {getTeamCode(t.id)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyCode(getTeamCode(t.id), t.id)}
                      className="p-2 text-gray-500 hover:text-white transition-colors"
                      title="팀 코드 복사"
                    >
                      {copiedTeamId === t.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    {t.created_by === user?.id ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteTeam(t.id); }}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        title="팀 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLeaveTeam(t.id, t.name); }}
                        className="p-2 text-gray-500 hover:text-yellow-400 transition-colors"
                        title="팀 탈퇴"
                      >
                        <LogOut size={14} />
                      </button>
                    )}
                    {t.id === team?.id && (
                      <span className="text-[9px] bg-[#7B2D3B] text-white px-1.5 py-0.5 rounded-full">선택됨</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-3 py-2">아직 소속 팀이 없습니다</p>
          )}
        </div>

        {/* 팀 생성 */}
        <div className="mb-3">
          <button
            onClick={() => { setShowCreateForm(!showCreateForm); setShowJoinForm(false); resetJoinForm(); }}
            className="w-full flex items-center gap-3 p-4 bg-[#111] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform"
          >
            <PlusCircle size={20} className="text-[#7B2D3B]" />
            <div className="text-left flex-1">
              <p className="font-bold text-white text-sm">새로운 팀 생성하기</p>
              <p className="text-[11px] text-gray-500">팀을 만들고 코드를 공유하세요</p>
            </div>
            {showCreateForm ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
          </button>

          {showCreateForm && (
            <div className="mt-2 bg-[#111] rounded-2xl border border-white/5 p-4">
              {createdCode ? (
                // 생성 완료 - 코드 표시
                <div className="text-center py-2">
                  <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-white font-bold mb-1">팀 생성 완료!</p>
                  <p className="text-xs text-gray-500 mb-4">아래 코드를 팀원에게 공유하세요</p>
                  <div className="bg-[#0a0a0a] rounded-xl p-4 mb-3">
                    <p className="text-3xl font-black text-[#7B2D3B] tracking-[0.3em]">{createdCode}</p>
                  </div>
                  <button
                    onClick={() => handleCopyCode(createdCode)}
                    className="flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-white/5 rounded-xl text-sm text-gray-300 active:scale-95 transition-transform mb-3"
                  >
                    {copiedTeamId === '__created' ? <><Check size={14} className="text-emerald-400" /> 복사 완료</> : <><Copy size={14} /> 코드 복사</>}
                  </button>
                  <button onClick={resetCreateForm} className="text-xs text-gray-500 underline">닫기</button>
                </div>
              ) : (
                // 생성 폼
                <div className="space-y-3">
                  {/* 로고 선택 */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-16 h-16 bg-[#0a0a0a] rounded-full flex items-center justify-center border border-white/10 overflow-hidden">
                        {newTeamLogoPreview ? (
                          <img src={newTeamLogoPreview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">{newTeamLogo}</span>
                        )}
                      </div>
                      <button onClick={() => logoInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#7B2D3B] rounded-full flex items-center justify-center">
                        <Camera size={12} className="text-white" />
                      </button>
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFileChange} className="hidden" />
                    </div>
                    {newTeamLogoPreview ? (
                      <button onClick={() => { setNewTeamLogoFile(null); setNewTeamLogoPreview(null); setNewTeamLogo('\u26bd'); }}
                        className="text-xs text-gray-500 underline">이모지로 변경</button>
                    ) : (
                      <div className="flex justify-center gap-1.5 flex-wrap">
                        {emojis.map(e => (
                          <button key={e} onClick={() => { setNewTeamLogo(e); setNewTeamLogoFile(null); setNewTeamLogoPreview(null); }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-base ${newTeamLogo === e ? 'bg-[#7B2D3B] ring-2 ring-[#C4697A]' : 'bg-[#0a0a0a] border border-white/10'}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">팀 이름 *</label>
                    <input type="text" placeholder="팀 이름을 입력하세요" value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      className="w-full p-3 border border-white/10 rounded-xl bg-[#0a0a0a] text-white text-sm placeholder:text-gray-600 focus:ring-1 focus:ring-[#7B2D3B] outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">팀 설명 (선택)</label>
                    <textarea placeholder="우리 팀을 소개해주세요" value={newTeamDesc}
                      onChange={e => setNewTeamDesc(e.target.value)}
                      className="w-full p-3 border border-white/10 rounded-xl bg-[#0a0a0a] text-white text-sm placeholder:text-gray-600 h-20 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">인스타그램 (선택)</label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input type="text" placeholder="username" value={newTeamInsta}
                        onChange={e => setNewTeamInsta(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 border border-white/10 rounded-xl bg-[#0a0a0a] text-white text-sm placeholder:text-gray-600 outline-none" />
                    </div>
                  </div>
                  <button onClick={handleCreateTeam} disabled={!newTeamName.trim() || creating}
                    className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50">
                    {creating ? '생성 중...' : '팀 생성'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 팀 가입 */}
        <div className="mb-4">
          <button
            onClick={() => { setShowJoinForm(!showJoinForm); setShowCreateForm(false); resetCreateForm(); }}
            className="w-full flex items-center gap-3 p-4 bg-[#111] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform"
          >
            <Hash size={20} className="text-[#7B2D3B]" />
            <div className="text-left flex-1">
              <p className="font-bold text-white text-sm">팀 코드로 가입하기</p>
              <p className="text-[11px] text-gray-500">코드를 입력해 팀에 참여하세요</p>
            </div>
            {showJoinForm ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
          </button>

          {showJoinForm && (
            <div className="mt-2 bg-[#111] rounded-2xl border border-white/5 p-4">
              {joinedTeamName ? (
                // 가입 요청 완료
                <div className="text-center py-2">
                  <Clock size={40} className="text-yellow-400 mx-auto mb-3" />
                  <p className="text-white font-bold mb-1">가입 요청 완료!</p>
                  <p className="text-sm text-gray-400">{joinedTeamName} 팀장의 수락을 기다려주세요.</p>
                  <button onClick={resetJoinForm} className="text-xs text-gray-500 underline mt-3">닫기</button>
                </div>
              ) : (
                // 가입 폼
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 text-center">팀 생성자에게 받은 6자리 코드를 입력하세요</p>
                  <input
                    type="text"
                    placeholder="예: A3B5C7"
                    value={joinCode}
                    onChange={e => {
                      setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                      setJoinError('');
                    }}
                    maxLength={6}
                    className="w-full text-center text-2xl font-black tracking-[0.3em] p-3 border border-white/10 rounded-xl bg-[#0a0a0a] text-white placeholder:text-sm placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-600 focus:ring-1 focus:ring-[#7B2D3B] outline-none"
                  />
                  {joinError && (
                    <div className="flex items-center justify-center gap-2 text-red-400 text-xs">
                      <AlertCircle size={14} />
                      <span>{joinError}</span>
                    </div>
                  )}
                  <button onClick={handleJoinTeam} disabled={joinCode.length < 6 || joining}
                    className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50">
                    {joining ? '가입 중...' : '팀 가입'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={async () => { await signOut(); navigate('/auth'); }}
          className="w-full p-3 bg-white/5 rounded-2xl border border-white/5 text-gray-500 text-sm font-medium">
          로그아웃
        </button>
      </div>

      {/* 알림함 */}
      <div className="px-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-white" />
          <h3 className="font-bold text-white text-sm">알림함</h3>
          {pendingCount > 0 && (
            <span className="bg-[#7B2D3B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {pendingCount}
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">알림이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => (
              <div key={notif.id} className="bg-[#111] rounded-2xl border border-white/10 p-4 transition-all">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-white">{notif.title}</span>
                      <span className="text-[10px] text-gray-600">{formatTime(notif.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2.5">
                      {notif.type === 'team_join' && notif.description?.includes('::')
                        ? notif.description.split('::')[1]
                        : notif.description}
                    </p>

                    <div className="flex gap-2">
                      {notif.title === '팀 가입 승인' || notif.title === '팀 가입 거절' ? (
                        <button onClick={async () => {
                          setNotifications(prev => prev.filter(n => n.id !== notif.id));
                          await supabase.from('notifications').delete().eq('id', notif.id);
                          if (notif.title === '팀 가입 승인') await refreshProfile();
                        }}
                          className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white py-2 rounded-lg text-xs font-bold">
                          <Check size={13} /> 확인
                        </button>
                      ) : notif.type === 'match_vote' ? (
                        <>
                          <button onClick={() => handleAction(notif.id, 'accepted')}
                            className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-xs font-bold">
                            <Check size={13} /> 참여
                          </button>
                          <button onClick={() => handleAction(notif.id, 'rejected')}
                            className="flex-1 flex items-center justify-center gap-1 bg-[#7B2D3B]/20 text-red-400 py-2 rounded-lg text-xs font-bold">
                            <X size={13} /> 불참
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleAction(notif.id, 'accepted')}
                            className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-xs font-bold">
                            <Check size={13} /> 수락
                          </button>
                          <button onClick={() => handleAction(notif.id, 'rejected')}
                            className="flex-1 flex items-center justify-center gap-1 bg-[#7B2D3B]/20 text-red-400 py-2 rounded-lg text-xs font-bold">
                            <X size={13} /> 거절
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
