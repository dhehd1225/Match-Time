import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, Users, Send, Check, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { trackEvent } from '../../../hooks/useAnalytics';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match, MatchApplication } from '../../../lib/types';
import { MatchDetailSkeleton } from '../Skeleton';

export default function MatchDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, team, isTeamCreator } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [applications, setApplications] = useState<MatchApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const fetchMatch = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
      .eq('id', id)
      .single();
    if (data) setMatch(data);
    setLoading(false);
  };

  const fetchApplications = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('match_applications')
      .select('*, team:teams(*)')
      .eq('match_id', id)
      .in('status', ['pending']);
    if (data) setApplications(data);
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchMatch();
    fetchApplications();

    const matchChannel = supabase
      .channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => {
        fetchMatch();
      })
      .subscribe();

    const appChannel = supabase
      .channel(`match-apps-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_applications', filter: `match_id=eq.${id}` }, () => {
        fetchApplications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(appChannel);
    };
  }, [id]);

  /* 시합 신청 → match_applications에 삽입 */
  const handleApply = async () => {
    if (!match || !team || !user) return;
    setApplying(true);

    const { error } = await supabase.from('match_applications').insert({
      match_id: match.id,
      team_id: team.id,
      applied_by: user.id,
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('이미 신청한 매치입니다.');
      } else {
        toast.error('신청에 실패했습니다.');
      }
      setApplying(false);
      return;
    }

    trackEvent('match_apply', { match_id: match.id });

    // 홈팀 생성자에게 알림
    const { data: homeTeam } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', match.home_team_id)
      .single();

    if (homeTeam) {
      await supabase.from('notifications').insert({
        user_id: homeTeam.created_by,
        type: 'match_request',
        title: '시합 신청',
        description: `${team.name}이(가) 시합을 신청했습니다.`,
        related_id: match.id,
      });
    }

    setApplying(false);
    fetchApplications();
  };

  /* 신청 취소 (away팀이 철회) */
  const handleWithdraw = async () => {
    if (!match || !team) return;
    if (!confirm('시합 신청을 취소하시겠습니까?')) return;

    await supabase
      .from('match_applications')
      .update({ status: 'withdrawn' })
      .eq('match_id', match.id)
      .eq('team_id', team.id);

    toast.success('신청이 취소되었습니다.');
    trackEvent('match_withdraw', { match_id: match.id });
    fetchApplications();
  };

  /* 신청 수락 → 매치 확정 */
  const handleAcceptApp = async (app: MatchApplication) => {
    if (!match) return;

    // 매치 확정
    const { error } = await supabase
      .from('matches')
      .update({ away_team_id: app.team_id, status: 'confirmed' })
      .eq('id', match.id);

    if (error) { toast.error('수락 실패'); return; }

    // 이 신청 수락 처리
    await supabase
      .from('match_applications')
      .update({ status: 'accepted' })
      .eq('id', app.id);

    // 나머지 pending 신청 모두 거절
    await supabase
      .from('match_applications')
      .update({ status: 'rejected' })
      .eq('match_id', match.id)
      .neq('id', app.id)
      .eq('status', 'pending');

    // 수락된 팀 팀장에게 알림
    const { data: acceptedTeam } = await supabase
      .from('teams').select('created_by').eq('id', app.team_id).single();
    if (acceptedTeam) {
      await supabase.from('notifications').insert({
        user_id: acceptedTeam.created_by,
        type: 'match_request',
        title: '시합 신청 수락',
        description: '상대 팀이 시합 신청을 수락했습니다!',
        related_id: match.id,
      });
    }

    // away팀 멤버들에게 참여 투표 알림 발송
    const { data: awayMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', app.team_id);

    if (awayMembers) {
      const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
      const notifs = awayMembers.map(m => ({
        user_id: m.user_id,
        type: 'match_vote' as const,
        title: '시합 참여 투표',
        description: `${formatDate(match.date)} ${match.time?.slice(0, 5)} ${match.stadium}에서 시합이 확정되었습니다.`,
        related_id: match.id,
      }));
      if (notifs.length > 0) {
        await supabase.from('notifications').insert(notifs);
      }
    }

    toast.success('매치가 확정되었습니다!');
    trackEvent('match_accept_app', { match_id: match.id });
  };

  /* 신청 거절 */
  const handleRejectApp = async (app: MatchApplication) => {
    await supabase
      .from('match_applications')
      .update({ status: 'rejected' })
      .eq('id', app.id);

    // 거절된 팀 팀장에게 알림
    const { data: rejectedTeam } = await supabase
      .from('teams').select('created_by').eq('id', app.team_id).single();
    if (rejectedTeam) {
      await supabase.from('notifications').insert({
        user_id: rejectedTeam.created_by,
        type: 'match_request',
        title: '시합 신청 거절',
        description: '상대 팀이 시합 신청을 거절했습니다.',
        related_id: match.id,
      });
    }

    toast.success('신청을 거절했습니다.');
    fetchApplications();
  };

  /* 매치 취소 (confirmed → open) */
  const handleCancelMatch = async () => {
    if (!match || !team || !user) return;
    if (!confirm('확정된 매치를 취소하시겠습니까? 상대팀에게 알림이 전송됩니다.')) return;

    const otherTeamId = match.home_team_id === team.id ? match.away_team_id : match.home_team_id;

    await supabase
      .from('matches')
      .update({ away_team_id: null, status: 'open' })
      .eq('id', match.id);

    await supabase.from('lineups').delete().eq('match_id', match.id);

    // 해당 매치의 모든 applications 초기화
    await supabase
      .from('match_applications')
      .update({ status: 'rejected' })
      .eq('match_id', match.id);

    toast.success('매치가 취소되었습니다.');
    trackEvent('match_cancel', { match_id: match.id });

    if (otherTeamId) {
      const { data: otherTeam } = await supabase
        .from('teams').select('created_by').eq('id', otherTeamId).single();
      if (otherTeam) {
        await supabase.from('notifications').insert({
          user_id: otherTeam.created_by,
          type: 'match_request',
          title: '매치 취소',
          description: `${team.name}이(가) 매치를 취소했습니다.`,
          related_id: match.id,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <div className="px-4 py-3 border-b border-gray-200"><div className="bg-gray-200 rounded w-32 h-5 animate-pulse" /></div>
        <MatchDetailSkeleton />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-gray-500 text-sm">매치를 찾을 수 없습니다</div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  };

  const isMyTeamHome = team?.id === match.home_team_id;
  const isMyTeamAway = team?.id === match.away_team_id;
  const myApplication = applications.find(a => a.team_id === team?.id);
  const hasPendingApp = myApplication?.status === 'pending';
  const pendingApps = applications.filter(a => a.status === 'pending');
  const canApply = team && isTeamCreator && !isMyTeamHome && match.status === 'open' && !hasPendingApp;

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-8">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200 sticky top-0 z-10 bg-[#FAFAF8]">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400">
          <ArrowLeft size={22} />
        </button>
        <span className="text-sm text-gray-500">{formatDate(match.date)} {match.time?.slice(0, 5)}</span>
      </div>

      {/* VS */}
      <div className="px-4 py-6">
        <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            {/* Home */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-[#7B2D3B]/20 rounded-2xl flex items-center justify-center overflow-hidden">
                {match.home_team?.logo?.startsWith('http') ? (
                  <img src={match.home_team.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{match.home_team?.logo || '⚽'}</span>
                )}
              </div>
              <p className="font-bold text-gray-900 text-sm">{match.home_team?.name || '홈팀'}</p>
            </div>

            <div className="px-4">
              <p className="text-2xl font-black text-gray-400">VS</p>
            </div>

            {/* Away */}
            <div className="flex-1 text-center">
              {match.away_team && (match.status === 'confirmed' || match.status === 'completed') ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-2 bg-blue-500/20 rounded-2xl flex items-center justify-center overflow-hidden">
                    {match.away_team.logo?.startsWith('http') ? (
                      <img src={match.away_team.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{match.away_team.logo || '⚽'}</span>
                    )}
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{match.away_team.name}</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-2 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl text-gray-400">?</span>
                  </div>
                  <p className="text-sm text-gray-500">상대 모집중</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-1 text-gray-500 text-xs"><MapPin size={12} />{match.stadium}</div>
            <div className="flex items-center gap-1 text-gray-500 text-xs"><Users size={12} />{match.format}</div>
          </div>
        </div>

        {/* 시합 신청 버튼 */}
        {canApply && (
          <div className="mt-3">
            <button onClick={handleApply} disabled={applying}
              className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
              <Send size={16} /> {applying ? '신청 중...' : '시합 신청하기'}
            </button>
          </div>
        )}

        {/* 신청 완료 + 취소 버튼 */}
        {hasPendingApp && (
          <div className="mt-3 space-y-2">
            <div className="bg-emerald-500/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2">
              <Check size={16} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">시합 신청 완료 — 상대팀 수락 대기 중</span>
            </div>
            {isTeamCreator && (
              <button onClick={handleWithdraw}
                className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <X size={16} /> 신청 취소
              </button>
            )}
          </div>
        )}

        {/* 완료된 매치 - 결과 표시 */}
        {match.status === 'completed' && match.home_score !== null && (
          <div className="mt-3 space-y-2">
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-[10px] text-gray-500 font-bold mb-2">최종 결과</p>
              <p className="text-3xl font-black text-gray-900">{match.home_score} : {match.away_score}</p>
            </div>
            {(isMyTeamHome || isMyTeamAway) && (
              <button onClick={() => navigate(`/lineup/${match.id}`)}
                className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Users size={16} /> 경기 상세 보기
              </button>
            )}
          </div>
        )}

        {/* 매치 확정 상태 */}
        {match.status === 'confirmed' && (
          <div className="mt-3 space-y-2">
            <div className="bg-emerald-500/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2">
              <Check size={16} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">매치 확정</span>
            </div>
            {(isMyTeamHome || isMyTeamAway) && (
              <>
                <button onClick={() => navigate(`/lineup/${match.id}`)}
                  className="w-full bg-[#7B2D3B] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  <Users size={16} /> 라인업 관리
                </button>
                {isTeamCreator && (
                  <button onClick={handleCancelMatch}
                    className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                    <X size={16} /> 매치 취소
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 신청 팀 목록 - 매치 생성자만 */}
      {isMyTeamHome && isTeamCreator && match.status === 'open' && (
        <div className="px-4 mb-4">
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3">
              신청 팀 <span className="text-gray-500 font-normal">({pendingApps.length})</span>
            </h3>
            {pendingApps.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">아직 신청한 팀이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {pendingApps.map(app => (
                  <div key={app.id} className="flex items-center justify-between bg-[#F5F3F0] rounded-xl p-3">
                    <div className="flex items-center gap-2.5">
                      {app.team?.logo?.startsWith('http') ? (
                        <img src={app.team.logo} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-xl">{app.team?.logo || '⚽'}</span>
                      )}
                      <span className="text-sm font-bold text-gray-900">{app.team?.name || '팀'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleAcceptApp(app)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold active:scale-95 transition-transform">
                        <Check size={13} /> 수락
                      </button>
                      <button onClick={() => handleRejectApp(app)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#7B2D3B]/20 text-red-400 rounded-lg text-xs font-bold active:scale-95 transition-transform">
                        <X size={13} /> 거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match Info */}
      <div className="px-4 mb-4">
        <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 text-sm mb-3">매치 정보</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">날짜</span>
              <span className="text-xs text-gray-900">{formatDate(match.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">시간</span>
              <span className="text-xs text-gray-900">{match.time?.slice(0, 5)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">구장</span>
              <span className="text-xs text-gray-900">{match.stadium}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">지역</span>
              <span className="text-xs text-gray-900">{match.region || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">실력</span>
              <span className="text-xs text-gray-900">{match.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">포맷</span>
              <span className="text-xs text-gray-900">{match.format}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">상태</span>
              <span className="text-xs text-gray-900">
                {match.status === 'open' ? '모집중' : match.status === 'confirmed' ? '확정' : match.status === 'completed' ? '완료' : '모집중'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 매치 삭제 */}
      {match.created_by === user?.id && (
        <div className="px-4 mb-4">
          <button
            onClick={async () => {
              if (!confirm('이 매치를 삭제하시겠습니까?')) return;
              await supabase.from('match_applications').delete().eq('match_id', match.id);
              await supabase.from('match_attendance').delete().eq('match_id', match.id);
              await supabase.from('lineups').delete().eq('match_id', match.id);
              await supabase.from('notifications').delete().eq('related_id', match.id);
              const { data: rooms } = await supabase.from('chat_rooms').select('id').eq('match_id', match.id);
              if (rooms?.length) {
                const roomIds = rooms.map(r => r.id);
                await supabase.from('chat_messages').delete().in('room_id', roomIds);
                await supabase.from('chat_rooms').delete().eq('match_id', match.id);
              }
              const { error } = await supabase.from('matches').delete().eq('id', match.id);
              if (error) {
                toast.error(`삭제 실패: ${error.message}`);
              } else {
                toast.success('매치가 삭제되었습니다.');
                navigate('/matches');
              }
            }}
            className="w-full py-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Trash2 size={16} /> 매치 삭제
          </button>
        </div>
      )}
    </div>
  );
}
