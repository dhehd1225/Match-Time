import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

function MatchTimeLogo() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left wing */}
      <path d="M60 35 Q45 20 30 15 Q35 30 38 45 Q40 55 45 60 Q50 52 55 45 Z" fill="#C4697A" opacity="0.7"/>
      <path d="M60 35 Q48 25 35 22 Q38 35 42 48 Q45 55 50 60 Q54 50 57 42 Z" fill="#7B2D3B"/>
      <path d="M60 55 Q50 45 40 40 Q42 50 46 58 Q48 62 52 65 Q55 60 58 55 Z" fill="#7B2D3B" opacity="0.8"/>
      {/* Right wing */}
      <path d="M60 35 Q75 20 90 15 Q85 30 82 45 Q80 55 75 60 Q70 52 65 45 Z" fill="#C4697A" opacity="0.7"/>
      <path d="M60 35 Q72 25 85 22 Q82 35 78 48 Q75 55 70 60 Q66 50 63 42 Z" fill="#7B2D3B"/>
      <path d="M60 55 Q70 45 80 40 Q78 50 74 58 Q72 62 68 65 Q65 60 62 55 Z" fill="#7B2D3B" opacity="0.8"/>
      {/* Center stem */}
      <path d="M57 60 L60 95 L63 60 Q62 55 60 50 Q58 55 57 60 Z" fill="#7B2D3B"/>
      {/* Small detail at top */}
      <circle cx="60" cy="30" r="3" fill="#C4697A"/>
    </svg>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devEmail, setDevEmail] = useState('test@kickoff.local');
  const [devPassword, setDevPassword] = useState('test1234');
  const [devName, setDevName] = useState('테스트유저');
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState('');

  const handleLogin = () => {
    if (window.Kakao && window.Kakao.isInitialized()) {
      window.Kakao.Auth.authorize({
        redirectUri: `${window.location.origin}/oauth/kakao/callback`,
      });
    }
  };

  const handleDevLogin = async () => {
    setDevLoading(true);
    setDevError('');

    // 로그인 시도
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });

    if (signInError) {
      // 로그인 실패 → 회원가입 시도
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: devEmail,
        password: devPassword,
        options: { data: { name: devName } },
      });

      if (signUpError) {
        setDevError(signUpError.message);
        setDevLoading(false);
        return;
      }
      signInData = signUpData;
    }

    // 프로필이 없으면 생성, 있으면 유지 (데이터 초기화 후에도 안전)
    if (signInData?.user) {
      await supabase.from('profiles').upsert({
        id: signInData.user.id,
        kakao_id: devEmail,
        name: devName,
        position: 'MF',
      }, { onConflict: 'id', ignoreDuplicates: true });
    }

    setDevLoading(false);
    navigate('/matches');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <MatchTimeLogo />
          </div>
          <h1 className="text-4xl font-black text-white mb-1 tracking-tight">Match Time</h1>
          <p className="text-[#C4697A] font-medium text-sm">"우리의 시간"</p>
        </div>

        <p className="text-gray-500 mb-12 text-sm">
          우리 팀의 모든 경기, 기록, 라인업을 한곳에서
        </p>

        <button
          onClick={handleLogin}
          className="w-full bg-[#FEE500] text-[#191919] py-4 rounded-xl font-bold flex items-center justify-center gap-3 mb-4 active:scale-95 transition-transform"
        >
          <MessageCircle className="fill-current" size={20} />
          카카오톡으로 시작하기
        </button>

        <p className="text-xs text-gray-600 px-4 leading-relaxed">
          로그인 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>

        {/* 개발용 테스트 로그인 */}
        <div className="mt-10 border-t border-white/5 pt-6">
          <button
            onClick={() => setShowDevLogin(!showDevLogin)}
            className="text-[10px] text-gray-600 hover:text-gray-400"
          >
            {showDevLogin ? '테스트 로그인 닫기' : '🔧 개발용 테스트 로그인'}
          </button>

          {showDevLogin && (
            <div className="mt-4 space-y-3 text-left">
              <input
                type="text"
                placeholder="이름"
                value={devName}
                onChange={e => setDevName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <input
                type="email"
                placeholder="이메일"
                value={devEmail}
                onChange={e => setDevEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={devPassword}
                onChange={e => setDevPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              {devError && <p className="text-red-400 text-xs">{devError}</p>}
              <button
                onClick={handleDevLogin}
                disabled={devLoading}
                className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold text-sm hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                {devLoading ? '처리 중...' : '테스트 계정 로그인 / 생성'}
              </button>
              <p className="text-[10px] text-gray-600 text-center">
                계정이 없으면 자동 생성됩니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
