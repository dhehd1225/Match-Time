import { useState, useEffect } from 'react';
import { UserCheck, ChevronDown, ChevronUp, ArrowLeft, Bell, Trophy, Check, X, Clock, Save, PlusCircle, Hash, Copy, Instagram, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
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
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

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
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const channel = supabase
      .channel('my-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
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

  const pendingCount = notifications.filter(n => n.status === 'pending').length;

  const handleAction = async (id: string, action: 'accepted' | 'rejected') => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;

    await supabase.from('notifications').update({ status: action }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: action } : n));

    if (action === 'accepted') {
      if (notif.type === 'match_request' && notif.related_id) {
        await supabase.from('matches').update({ status: 'confirmed' }).eq('id', notif.related_id);
      }
    } else if (action === 'rejected') {
      if (notif.type === 'match_request' && notif.related_id) {
        await supabase.from('matches').update({ away_team_id: null, status: 'open' }).eq('id', notif.related_id);
      }
    }
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

  // 팀 생성 처리
  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !user) return;
    setCreating(true);

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: newTeamName.trim(),
        logo: newTeamLogo,
        description: newTeamDesc.trim() || null,
        instagram: newTeamInsta.trim() || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (teamError || !teamData) {
      alert('팀 생성에 실패했습니다.');
      setCreating(false);
      return;
    }

    await supabase.from('team_members').insert({
      team_id: teamData.id,
      user_id: user.id,
      role: 'member',
    });

    await refreshProfile();
    setCreating(false);
    setCreatedCode(getTeamCode(teamData.id));
  };

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setNewTeamName('');
    setNewTeamDesc('');
    setNewTeamInsta('');
    setNewTeamLogo('\u26bd');
    setCreatedCode(null);
  };

  // 팀 가입 처리
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

    const { error: insertError } = await supabase
      .from('team_members')
      .insert({ team_id: matched.id, user_id: user.id, role: 'member' });

    if (insertError) {
      setJoinError('팀 가입에 실패했습니다.');
      setJoining(false);
      return;
    }

    await refreshProfile();
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
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400">
          <ArrowLeft size={22} />
        </button>
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
                    <span className="text-xl">{t.logo}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-white text-sm truncate">{t.name}</p>
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
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-[#0a0a0a] rounded-full flex items-center justify-center border border-white/10 text-3xl">
                      {newTeamLogo}
                    </div>
                  </div>
                  <div className="flex justify-center gap-1.5 flex-wrap">
                    {emojis.map(e => (
                      <button key={e} onClick={() => setNewTeamLogo(e)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-base ${newTeamLogo === e ? 'bg-[#7B2D3B] ring-2 ring-[#C4697A]' : 'bg-[#0a0a0a] border border-white/10'}`}>
                        {e}
                      </button>
                    ))}
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
                // 가입 완료
                <div className="text-center py-2">
                  <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-white font-bold mb-1">가입 완료!</p>
                  <p className="text-sm text-gray-400">{joinedTeamName}에 가입했습니다.</p>
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
              <div key={notif.id} className={`bg-[#111] rounded-2xl border p-4 transition-all ${
                notif.status === 'pending' ? 'border-white/10' : 'border-white/5 opacity-50'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-white">{notif.title}</span>
                      <span className="text-[10px] text-gray-600">{formatTime(notif.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2.5">{notif.description}</p>

                    {notif.status === 'pending' ? (
                      <div className="flex gap-2">
                        {notif.type === 'match_vote' ? (
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
                    ) : (
                      <span className={`text-[11px] font-medium ${
                        notif.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {notif.status === 'accepted' ? '수락됨' : '거절됨'}
                      </span>
                    )}
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
