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
  const { profile, user, membership, memberships, teams, team, setCurrentTeamId, signOut, refreshProfile } = useAuth();
  // 권한 단일 소스: 각 팀별 'president' 여부 (created_by 폴백 포함)
  const isPresidentOf = (teamId: string) => {
    const m = memberships.find(mm => mm.team_id === teamId);
    if (m?.role === 'president') return true;
    const t = teams.find(tt => tt.id === teamId);
    return !!t && !!user && t.created_by === user.id;
  };
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
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);
    if (uploadError) {
      toast.error('이미지 업로드에 실패했습니다.');
      setAvatarUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
    await refreshProfile();
    setAvatarUploading(false);
    toast.success('프로필 사진이 변경되었습니다.');
  };

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
    const { error } = await supabase.from('profiles').update({
      name,
      position,
      back_number: backNumber ? parseInt(backNumber) : null,
    }).eq('id', user.id);

    if (error) {
      toast.error(`저장 실패: ${error.message}`);
      setSaving(false);
      return;
    }

    await refreshProfile();
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
      // match_request 알림은 이제 정보성 (수락/거절은 매치 상세에서)
      // 그냥 확인 처리만 함
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

    const { error: memberError } = await supabase.from('team_members').insert({
      team_id: teamData.id,
      user_id: user.id,
      role: 'president',
    });

    if (memberError) {
      toast.error('팀 멤버 등록에 실패했습니다.');
      setCreating(false);
      return;
    }

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
    <div className="min-h-screen bg-[#FAFAF8] pb-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-[#7B2D3B] to-[#5a1f2c] px-5 pt-5 pb-8 rounded-b-3xl">
        <h1 className="text-sm font-bold text-white/60 mb-3">마이 페이지</h1>
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-white/30" />
            ) : (
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white text-xl font-bold ring-2 ring-white/30">
                {name?.charAt(0) || '?'}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
              <Camera size={11} className="text-[#7B2D3B]" />
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{name || '이름 없음'}</h2>
            <p className="text-sm text-white/60">{position} {backNumber ? `· #${backNumber}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Stats - overlapping the header */}
      <div className="px-5 -mt-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white shadow-md p-4 rounded-2xl text-center border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">득점</p>
            <p className="text-2xl font-black text-[#7B2D3B]">{membership?.goals ?? 0}</p>
          </div>
          <div className="bg-white shadow-md p-4 rounded-2xl text-center border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">도움</p>
            <p className="text-2xl font-black text-emerald-500">{membership?.assists ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="px-5">

        {/* Edit Info */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 mb-1.5 block">이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full p-3 bg-[#F5F3F0] border border-gray-200 rounded-xl text-sm text-gray-900 font-medium focus:ring-1 focus:ring-[#7B2D3B] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 mb-1.5 block">포지션</label>
              <select value={position} onChange={e => setPosition(e.target.value)}
                className="w-full p-3 bg-[#F5F3F0] border border-gray-200 rounded-xl text-sm text-gray-900 font-medium focus:ring-1 focus:ring-[#7B2D3B] outline-none appearance-none">
                <option value="FW" className="bg-white text-gray-900">포워드(FW)</option>
                <option value="MF" className="bg-white text-gray-900">미드필더(MF)</option>
                <option value="DF" className="bg-white text-gray-900">수비수(DF)</option>
                <option value="GK" className="bg-white text-gray-900">골키퍼(GK)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 mb-1.5 block">등번호</label>
              <input type="number" value={backNumber} onChange={e => setBackNumber(e.target.value)}
                className="w-full p-3 bg-[#F5F3F0] border border-gray-200 rounded-xl text-sm text-gray-900 font-medium focus:ring-1 focus:ring-[#7B2D3B] outline-none" />
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

        {/* My Teams - 배너 스타일 */}
        <div className="mb-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">소속 팀</h3>
          {teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map(t => (
                <div key={t.id}
                  className={`relative overflow-hidden rounded-2xl p-4 ${
                    t.id === team?.id
                      ? 'bg-gradient-to-r from-[#7B2D3B] to-[#9e4a5c]'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {t.logo?.startsWith('http') ? (
                      <img src={t.logo} alt="" className={`w-11 h-11 rounded-full object-cover ${t.id === team?.id ? 'ring-2 ring-white/30' : ''}`} />
                    ) : (
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-2xl ${t.id === team?.id ? 'bg-white/20' : 'bg-[#F5F3F0]'}`}>
                        {t.logo}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${t.id === team?.id ? 'text-white' : 'text-gray-900'}`}>{t.name}</p>
                      <p className={`text-xs ${t.id === team?.id ? 'text-white/60' : 'text-gray-400'}`}>
                        {isPresidentOf(t.id) ? '팀장' : '팀원'}
                      </p>
                    </div>
                    {t.id === team?.id && (
                      <span className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full font-medium">현재 팀</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">아직 소속 팀이 없습니다</p>
          )}
        </div>

        {/* Logout */}
        <button onClick={async () => { await signOut(); navigate('/auth'); }}
          className="w-full p-3 bg-gray-100 rounded-xl text-gray-500 text-sm font-medium">
          로그아웃
        </button>
      </div>

      {/* 알림함 */}
      <div className="px-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-gray-900" />
          <h3 className="font-bold text-gray-900 text-sm">알림함</h3>
          {pendingCount > 0 && (
            <span className="bg-[#7B2D3B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {pendingCount}
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">알림이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => (
              <div key={notif.id} className="bg-white shadow-sm rounded-2xl border border-gray-200 p-4 transition-all relative">
                <button onClick={async () => {
                  setNotifications(prev => prev.filter(n => n.id !== notif.id));
                  await supabase.from('notifications').delete().eq('id', notif.id);
                }} className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 p-0.5">
                  <X size={14} />
                </button>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-gray-900">{notif.title}</span>
                      <span className="text-[10px] text-gray-400">{formatTime(notif.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2.5">
                      {notif.type === 'team_join' && notif.description?.includes('::')
                        ? notif.description.split('::')[1]
                        : notif.description}
                    </p>

                    <div className="flex gap-2">
                      {notif.title === '팀 가입 승인' || notif.title === '팀 가입 거절' || notif.type === 'match_request' ? (
                        <button onClick={async () => {
                          setNotifications(prev => prev.filter(n => n.id !== notif.id));
                          await supabase.from('notifications').delete().eq('id', notif.id);
                          if (notif.title === '팀 가입 승인') await refreshProfile();
                          // match_request 알림이면 매치 상세로 이동
                          if (notif.type === 'match_request' && notif.related_id) {
                            navigate(`/matches/${notif.related_id}`);
                          }
                        }}
                          className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-900 py-2 rounded-lg text-xs font-bold">
                          <Check size={13} /> {notif.type === 'match_request' ? '매치 보기' : '확인'}
                        </button>
                      ) : notif.type === 'match_vote' ? (
                        <>
                          <button onClick={async () => {
                            if (!user || !notif.related_id) return;
                            // 참여 상태 먼저 설정
                            const { data: existing } = await supabase
                              .from('match_attendance')
                              .select('id')
                              .eq('match_id', notif.related_id)
                              .eq('user_id', user.id)
                              .maybeSingle();
                            if (existing) {
                              await supabase.from('match_attendance')
                                .update({ status: 'attending' })
                                .eq('id', existing.id);
                            } else {
                              await supabase.from('match_attendance')
                                .insert({ match_id: notif.related_id, user_id: user.id, status: 'attending' });
                            }
                            setNotifications(prev => prev.filter(n => n.id !== notif.id));
                            await supabase.from('notifications').delete().eq('id', notif.id);
                            navigate(`/lineup/${notif.related_id}`);
                          }}
                            className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-xs font-bold">
                            <Check size={13} /> 참여 등록
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
