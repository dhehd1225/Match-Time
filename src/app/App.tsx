import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

// 레이아웃 및 기존 페이지 import
import MainLayout from './components/MainLayout';
import MatchList from './components/pages/MatchList';
import MatchDetail from './components/pages/MatchDetail';
import LineupBuilder from './components/pages/LineupBuilder';
import LineupDetail from './components/pages/LineupDetail';
import TeamManagement from './components/pages/TeamManagement';

// 새로운 페이지들 import (중괄호 없이 가져오도록 통일)
import Auth from './components/pages/Auth';
import Onboarding from './components/pages/Onboarding';
import TeamCreate from './components/pages/TeamCreate';
import MyPage from './components/pages/MyPage';

/**
 * App 컴포넌트: 전체 경로(Route) 구조 정의
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 인증 및 온보딩: 하단 탭 바가 없는 독립된 페이지들 */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/team/create" element={<TeamCreate />} />

        {/* 2. 메인 서비스: MainLayout으로 감싸져 있어 하단 탭 바가 항상 보임 */}
        <Route path="/" element={<MainLayout />}>
          {/* 기본 경로(/) 접속 시 경기 목록으로 자동 이동 */}
          <Route index element={<Navigate to="/matches" replace />} />
          
          {/* 경기 관련 페이지 */}
          <Route path="matches" element={<MatchList />} />
          <Route path="matches/:id" element={<MatchDetail />} />
          
          {/* 라인업 관련 페이지 */}
          <Route path="lineup" element={<LineupBuilder />} />
          <Route path="lineup/:id" element={<LineupDetail />} />
          
          {/* 팀 및 개인 관리 페이지 */}
          <Route path="team" element={<TeamManagement />} />
          <Route path="mypage" element={<MyPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}