import { useState } from 'react';
import { ArrowLeft, Search, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export function TeamJoin() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requestedTeamName, setRequestedTeamName] = useState('');

  const handleJoin = async () => {
    if (!user || !code.trim()) return;
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length < 6) {
      setError('6자리 팀 코드를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    const { data: allTeams } = await supabase.from('teams').select('*');
    const matched = allTeams?.find(t =>
      t.id.replace(/-/g, '').substring(0, 6).toUpperCase() === normalizedCode
    );

    if (!matched) {
      setError('해당 코드의 팀을 찾을 수 없습니다.');
      setSubmitting(false);
      return;
    }

    // 이미 가입됨
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', matched.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      setError('이미 가입된 팀입니다.');
      setSubmitting(false);
      return;
    }

    // 이미 요청을 보냈는지 확인
    const { data: pendingNotifs } = await supabase
      .from('notifications')
      .select('id, description')
      .eq('type', 'team_join')
      .eq('related_id', matched.id)
      .eq('status', 'pending');

    if (pendingNotifs?.some(n => n.description?.startsWith(user.id))) {
      setError('이미 가입 요청을 보냈습니다. 팀장의 수락을 기다려주세요.');
      setSubmitting(false);
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

    setSubmitting(false);
    setRequestedTeamName(matched.name);
  };

  // 요청 완료 화면
  if (requestedTeamName) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-6">
        <Clock size={64} className="text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">가입 요청 완료!</h2>
        <p className="text-gray-500 text-sm mb-2">{requestedTeamName}</p>
        <p className="text-gray-400 text-sm mb-8">팀장이 수락하면 가입이 완료됩니다.</p>
        <button
          onClick={() => navigate('/team')}
          className="w-full max-w-xs bg-[#7B2D3B] text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all"
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">팀 가입하기</h1>
      </div>

      <div className="p-6 flex flex-col items-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 mb-6">
          <Search size={28} className="text-[#7B2D3B]" />
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-2">팀 코드 입력</h2>
        <p className="text-sm text-gray-500 text-center mb-8">
          팀 생성자에게 받은 6자리 코드를 입력하세요.
        </p>

        <div className="w-full max-w-xs mb-4">
          <input
            type="text"
            placeholder="예: A3B5C7"
            value={code}
            onChange={e => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
              setError('');
            }}
            maxLength={6}
            className="w-full text-center text-2xl font-black tracking-[0.3em] p-4 border border-gray-200 rounded-xl bg-[#F5F3F0] text-gray-900 placeholder:text-gray-400 placeholder:text-base placeholder:tracking-normal placeholder:font-normal focus:ring-2 focus:ring-[#7B2D3B] outline-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={code.length < 6 || submitting}
          className="w-full max-w-xs bg-[#7B2D3B] text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? '요청 중...' : '가입 요청'}
        </button>
      </div>
    </div>
  );
}
