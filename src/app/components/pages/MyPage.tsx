import { useState, useEffect } from 'react';
import { UserCheck, ChevronRight, ArrowLeft, Bell, Trophy, Check, X, Clock, Save, PlusCircle, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import type { Notification } from '../../../lib/types';

export function MyPage() {
  const navigate = useNavigate();
  const { profile, user, isPresident, membership, team, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [position, setPosition] = useState('MF');
  const [backNumber, setBackNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [originalName, setOriginalName] = useState('');
  const [originalPosition, setOriginalPosition] = useState('');
  const [originalBackNumber, setOriginalBackNumber] = useState('');

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

  // 알림 불러오기
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

    // 실시간 구독
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

    // 알림 상태 업데이트
    await supabase.from('notifications').update({ status: action }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: action } : n));

    if (action === 'accepted') {
      if (notif.type === 'match_request' && notif.related_id) {
        // 시합 신청 수락 → 매치 상태를 confirmed로
        await supabase.from('matches').update({ status: 'confirmed' }).eq('id', notif.related_id);
      } else if (notif.type === 'team_join' && notif.related_id && team) {
        // 팀 가입 수락 → 신청자(related_id = user_id)를 팀 멤버로 추가
        await supabase.from('team_members').upsert({
          team_id: team.id,
          user_id: notif.related_id,
          role: 'member',
        }, { onConflict: 'team_id,user_id' });
      }
    } else if (action === 'rejected') {
      if (notif.type === 'match_request' && notif.related_id) {
        // 시합 신청 거절 → away_team 제거, 상태를 open으로
        await supabase.from('matches').update({ away_team_id: null, status: 'open' }).eq('id', notif.related_id);
      }
    }
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{name || '이름 없음'}</h2>
              {isPresident && (
                <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">회장</span>
              )}
            </div>
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

        {/* Team Section */}
        {team ? (
          <button onClick={() => navigate('/team')}
            className="w-full flex items-center justify-between p-4 bg-[#111] rounded-2xl border border-white/5 group mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{team.logo}</span>
              <span className="font-bold text-white text-sm">{team.name}</span>
            </div>
            <ChevronRight size={18} className="text-gray-600 group-hover:text-[#7B2D3B] transition-colors" />
          </button>
        ) : (
          <div className="space-y-2 mb-3">
            <p className="text-xs text-gray-500 mb-2">아직 소속 팀이 없습니다</p>
            <button onClick={() => navigate('/team/create')}
              className="w-full flex items-center gap-3 p-4 bg-[#111] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform">
              <PlusCircle size={20} className="text-[#7B2D3B]" />
              <div className="text-left">
                <p className="font-bold text-white text-sm">새로운 팀 생성하기</p>
                <p className="text-[11px] text-gray-500">팀을 만들고 팀원을 모집하세요</p>
              </div>
            </button>
            <button onClick={() => navigate('/team/join')}
              className="w-full flex items-center gap-3 p-4 bg-[#111] rounded-2xl border border-white/5 active:scale-[0.98] transition-transform">
              <Search size={20} className="text-[#7B2D3B]" />
              <div className="text-left">
                <p className="font-bold text-white text-sm">팀 가입하기</p>
                <p className="text-[11px] text-gray-500">기존 팀을 찾아 가입 신청하세요</p>
              </div>
            </button>
          </div>
        )}

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
