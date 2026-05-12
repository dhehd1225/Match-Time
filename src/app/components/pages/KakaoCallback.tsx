import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../lib/supabase';

export default function KakaoCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('로그인 중...');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error || !code) {
        navigate('/auth');
        return;
      }

      try {
        // 1. 카카오 인가 코드 → 액세스 토큰 교환
        setStatus('카카오 인증 중...');
        const tokenRes = await fetch('/api/kauth/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: import.meta.env.VITE_KAKAO_JS_KEY || '6b153d32f9af37375d6ff7e1d1164ef2',
            redirect_uri: `${window.location.origin}/oauth/kakao/callback`,
            code,
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('토큰 교환 실패');

        // 2. 카카오 유저 정보 가져오기
        setStatus('사용자 정보 확인 중...');
        const userRes = await fetch('/api/kapi/v2/user/me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const kakaoUser = await userRes.json();
        console.log('카카오 유저 정보:', JSON.stringify(kakaoUser, null, 2));
        const kakaoId = String(kakaoUser.id);
        const kakaoName =
          kakaoUser.kakao_account?.profile?.nickname ||
          kakaoUser.properties?.nickname ||
          kakaoUser.kakao_account?.name ||
          '유저';
        const kakaoAvatar =
          kakaoUser.kakao_account?.profile?.profile_image_url ||
          kakaoUser.properties?.profile_image ||
          null;

        // 3. Supabase 로그인/회원가입
        setStatus('로그인 처리 중...');
        const email = `kakao_${kakaoId}@kickoff.local`;
        const password = `kickoff_kakao_${kakaoId}_auth`;

        // 먼저 로그인 시도
        let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email, password,
        });

        let isNewUser = false;

        if (signInError) {
          // 로그인 실패 → 회원가입
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email, password,
            options: {
              data: { kakao_id: kakaoId, name: kakaoName, avatar_url: kakaoAvatar },
            },
          });

          if (signUpError) throw signUpError;
          signInData = signUpData;
          isNewUser = true;

          // 프로필 생성
          if (signUpData.user) {
            await supabase.from('profiles').upsert({
              id: signUpData.user.id,
              kakao_id: kakaoId,
              name: kakaoName,
              avatar_url: kakaoAvatar,
              position: 'MF',
            });
          }
        }

        // 4. 기존 유저도 프로필 동기화 (카카오 이름/사진 변경 반영)
        if (!isNewUser && signInData?.user) {
          await supabase.from('profiles').upsert({
            id: signInData.user.id,
            kakao_id: kakaoId,
            name: kakaoName,
            avatar_url: kakaoAvatar,
          });
        }

        navigate('/matches');
      } catch (err: any) {
        console.error('로그인 오류:', err);
        setStatus(`로그인 실패: ${err?.message || String(err)}`);
        setTimeout(() => navigate('/auth'), 5000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">{status}</p>
      </div>
    </div>
  );
}
