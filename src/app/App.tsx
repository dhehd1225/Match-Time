import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import MainLayout from './components/MainLayout';
import MatchList from './components/pages/MatchList';
import MatchDetail from './components/pages/MatchDetail';
import LineupBuilder from './components/pages/LineupBuilder';
import LineupDetail from './components/pages/LineupDetail';
import TeamManagement from './components/pages/TeamManagement';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/matches" replace />} />
          <Route path="matches" element={<MatchList />} />
          <Route path="matches/:id" element={<MatchDetail />} />
          <Route path="lineup" element={<LineupBuilder />} />
          <Route path="lineup/:id" element={<LineupDetail />} />
          <Route path="team" element={<TeamManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
