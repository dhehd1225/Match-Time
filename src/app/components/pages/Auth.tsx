import { MessageCircle } from 'lucide-react';

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
  const handleLogin = () => {
    if (window.Kakao && window.Kakao.isInitialized()) {
      window.Kakao.Auth.authorize({
        redirectUri: `${window.location.origin}/oauth/kakao/callback`,
      });
    }
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
      </div>
    </div>
  );
}
