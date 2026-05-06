import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import MainLayout from './components/MainLayout';
import MatchList from './components/pages/MatchList';
import MatchDetail from './components/pages/MatchDetail';
import LineupBuilder from './components/pages/LineupBuilder';
import TeamManagement from './components/pages/TeamManagement';
import Rankings from './components/pages/Rankings';
import SocialPost from './components/pages/SocialPost';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/matches" replace />} />
          <Route path="matches" element={<MatchList />} />
          <Route path="matches/:id" element={<MatchDetail />} />
          <Route path="lineup" element={<LineupBuilder />} />
          <Route path="team" element={<TeamManagement />} />
          <Route path="rankings" element={<Rankings />} />
          <Route path="social" element={<SocialPost />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
