import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin, Clock, Users, Trophy, TrendingUp, Check, X, Clock as ClockIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import myTeamLogo from 'figma:asset/image-1.png';

const performanceData = [
  { month: '1월', wins: 3, losses: 1 },
  { month: '2월', wins: 4, losses: 2 },
  { month: '3월', wins: 5, losses: 1 },
  { month: '4월', wins: 3, losses: 3 },
  { month: '5월', wins: 6, losses: 0 },
];

const rankingData = [
  { week: 'W1', rank: 8 },
  { week: 'W2', rank: 6 },
  { week: 'W3', rank: 5 },
  { week: 'W4', rank: 3 },
  { week: 'W5', rank: 2 },
];

const teamPlayers = [
  { id: 1, name: '김민수', status: null },
  { id: 2, name: '이준호', status: 'attending' },
  { id: 3, name: '박성훈', status: 'attending' },
  { id: 4, name: '최지훈', status: null },
  { id: 5, name: '정대현', status: 'not-attending' },
  { id: 6, name: '강태양', status: 'attending' },
  { id: 7, name: '윤재민', status: null },
  { id: 8, name: '한동수', status: 'attending' },
];

export default function MatchDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [myVote, setMyVote] = useState<'attending' | 'not-attending' | 'maybe' | null>(null);

  const match = {
    id,
    time: '18:00',
    date: '2026년 5월 10일 (토)',
    location: '서울 은평 월드컵경기장 보조구장',
    format: '11vs11',
    myTeam: '경축',
    opponent: '연세대 FC',
    myTeamLogo: 'figma:asset/image-1.png',
    opponentLogo: '🦅',
    myTeamWinRate: 68,
    opponentWinRate: 72,
    myTeamRank: 2,
    opponentRank: 3,
  };

  const handleVote = (vote: 'attending' | 'not-attending' | 'maybe') => {
    setMyVote(myVote === vote ? null : vote);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <button onClick={() => navigate(-1)} className="mb-4 p-2 hover:bg-white/20 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="text-center">
          <p className="text-sm text-red-100 mb-1">{match.date}</p>
          <h1 className="text-2xl font-bold mb-4">{match.time} 킥오프</h1>
        </div>
      </div>

      {/* Team Matchup */}
      <div className="bg-white p-6 mb-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 text-center">
            <div className="flex justify-center mb-2">
              <img src={myTeamLogo} alt={match.myTeam} className="w-16 h-16 object-contain" />
            </div>
            <h3 className="font-bold text-lg">{match.myTeam}</h3>
            <p className="text-sm text-gray-600">랭킹 #{match.myTeamRank}</p>
          </div>

          <div className="px-6">
            <div className="text-3xl font-bold text-gray-400">VS</div>
          </div>

          <div className="flex-1 text-center">
            <div className="text-5xl mb-2">{match.opponentLogo}</div>
            <h3 className="font-bold text-lg">{match.opponent}</h3>
            <p className="text-sm text-gray-600">랭킹 #{match.opponentRank}</p>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin size={16} />
            <span>{match.location}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Users size={16} />
            <span>{match.format}</span>
          </div>
        </div>
      </div>

      {/* Attendance Voting */}
      <div className="bg-white p-6 mb-4">
        <h3 className="font-bold text-lg mb-4">출석 투표</h3>
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => handleVote('attending')}
            className={`flex-1 py-3 rounded-lg border-2 transition-all ${
              myVote === 'attending'
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Check size={20} className="inline mr-2" />
            참여
          </button>
          <button
            onClick={() => handleVote('not-attending')}
            className={`flex-1 py-3 rounded-lg border-2 transition-all ${
              myVote === 'not-attending'
                ? 'bg-red-50 border-red-500 text-red-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <X size={20} className="inline mr-2" />
            불참
          </button>
          <button
            onClick={() => handleVote('maybe')}
            className={`flex-1 py-3 rounded-lg border-2 transition-all ${
              myVote === 'maybe'
                ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ClockIcon size={20} className="inline mr-2" />
            미정
          </button>
        </div>

        {/* Player Status List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">팀원 출석 현황</h4>
          {teamPlayers.map((player) => (
            <div key={player.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">{player.name}</span>
              <div>
                {player.status === 'attending' && (
                  <span className="text-green-600 text-sm flex items-center gap-1">
                    <Check size={16} /> 참여
                  </span>
                )}
                {player.status === 'not-attending' && (
                  <span className="text-red-600 text-sm flex items-center gap-1">
                    <X size={16} /> 불참
                  </span>
                )}
                {!player.status && (
                  <span className="text-gray-400 text-sm">미응답</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Statistics */}
      <div className="bg-white p-6 mb-4">
        <h3 className="font-bold text-lg mb-4">팀 전적 비교</h3>

        {/* Win Rate */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">{match.myTeam}</span>
            <span className="text-sm font-bold text-red-600">{match.myTeamWinRate}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-red-600 rounded-full"
              style={{ width: `${match.myTeamWinRate}%` }}
            />
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">{match.opponent}</span>
            <span className="text-sm font-bold text-blue-600">{match.opponentWinRate}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${match.opponentWinRate}%` }}
            />
          </div>
        </div>

        {/* Performance Chart */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">최근 전적 (우리 팀)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="wins" fill="#10b981" name="승" />
              <Bar dataKey="losses" fill="#ef4444" name="패" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ranking Trend */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">순위 추이</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={rankingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis reversed domain={[1, 10]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="rank"
                stroke="#2563eb"
                strokeWidth={3}
                name="순위"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Button */}
      <div className="px-4">
        <button className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all">
          경기 참여하기
        </button>
      </div>
    </div>
  );
}
