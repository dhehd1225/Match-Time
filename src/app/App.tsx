import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

import MainLayout from './components/MainLayout';
import MatchList from './components/pages/MatchList';
import MatchDetail from './components/pages/MatchDetail';
import LineupBuilder from './components/pages/LineupBuilder';
import LineupDetail from './components/pages/LineupDetail';
import TeamManagement from './components/pages/TeamManagement';
import Auth from './components/pages/Auth';
import Onboarding from './components/pages/Onboarding';
import { TeamCreate } from './components/pages/TeamCreate';
import { MyPage } from './components/pages/MyPage';
import { TeamJoin } from './components/pages/TeamJoin';
import KakaoCallback from './components/pages/KakaoCallback';
import Chat from './components/pages/Chat';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/oauth/kakao/callback" element={<KakaoCallback />} />

          {/* 로그인 필요, 팀 불필요 */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/team/create" element={<ProtectedRoute><TeamCreate /></ProtectedRoute>} />
          <Route path="/team/join" element={<ProtectedRoute><TeamJoin /></ProtectedRoute>} />

          {/* 메인 서비스 (로그인만 필요) */}
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/matches" replace />} />
            <Route path="matches" element={<MatchList />} />
            <Route path="matches/:id" element={<MatchDetail />} />
            <Route path="lineup" element={<LineupBuilder />} />
            <Route path="lineup/:id" element={<LineupDetail />} />
            <Route path="team" element={<TeamManagement />} />
            <Route path="chat" element={<Chat />} />
            <Route path="mypage" element={<MyPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
