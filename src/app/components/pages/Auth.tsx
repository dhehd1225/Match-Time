import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import logoSvg from '../../../assets/logo.svg';

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
    <div className="min-h-screen bg-[#F7F6F3] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <div className="flex justify-center mb-2">
            <img src={logoSvg} alt="Match Time" className="w-48 h-auto" />
          </div>
        </div>

        <p className="text-[#888] mb-12 text-sm">
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
        <div className="mt-10 border-t border-gray-200 pt-6">
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
                className="w-full bg-[#F5F3F0] border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <input
                type="email"
                placeholder="이메일"
                value={devEmail}
                onChange={e => setDevEmail(e.target.value)}
                className="w-full bg-[#F5F3F0] border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={devPassword}
                onChange={e => setDevPassword(e.target.value)}
                className="w-full bg-[#F5F3F0] border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              {devError && <p className="text-red-400 text-xs">{devError}</p>}
              <button
                onClick={handleDevLogin}
                disabled={devLoading}
                className="w-full bg-gray-100 text-gray-900 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
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
