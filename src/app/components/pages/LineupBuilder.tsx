import { useNavigate } from 'react-router';
import { Calendar, MapPin, Clock, Users, ChevronRight } from 'lucide-react';

const scheduledMatches = [
  {
    id: 1,
    date: '5월 10일 (토)',
    time: '17:00',
    location: '서울 도봉 커뮤니티 스포츠센터',
    opponent: '서울대 FC',
    opponentLogo: '🐉',
    format: '11vs11',
    confirmedPlayers: 9,
    totalPlayers: 11,
    formation: '4-3-3',
  },
  {
    id: 2,
    date: '5월 11일 (일)',
    time: '17:00',
    location: '서울 송파 올림픽공원 축구장',
    opponent: '연세대 FC',
    opponentLogo: '🦅',
    format: '11vs11',
    confirmedPlayers: 11,
    totalPlayers: 11,
    formation: '4-4-2',
  },
  {
    id: 3,
    date: '5월 12일 (월)',
    time: '18:00',
    location: '서울 은평 월드컵경기장 보조구장',
    opponent: '고려대 United',
    opponentLogo: '🐯',
    format: '11vs11',
    confirmedPlayers: 7,
    totalPlayers: 11,
    formation: '4-3-3',
  },
  {
    id: 4,
    date: '5월 13일 (화)',
    time: '18:00',
    location: '경기 성남 탄천종합운동장',
    opponent: '성균관대 SC',
    opponentLogo: '🦁',
    format: '8vs8',
    confirmedPlayers: 5,
    totalPlayers: 8,
    formation: '3-3-1',
  },
  {
    id: 5,
    date: '5월 14일 (수)',
    time: '18:00',
    location: '서울 강동 천호공원 축구장',
    opponent: '한양대 FC',
    opponentLogo: '⚡',
    format: '11vs11',
    confirmedPlayers: 11,
    totalPlayers: 11,
    formation: '3-4-3',
  },
];

export default function LineupBuilder() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-700 to-red-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold">라인업</h1>
          <p className="text-sm text-red-100">경기별 라인업을 확인하세요</p>
        </div>
      </header>

      {/* Match List */}
      <div className="px-4 py-4 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-900">예정된 경기</h3>
          <span className="text-sm text-gray-500">{scheduledMatches.length}경기</span>
        </div>

        <div className="space-y-3">
          {scheduledMatches.map((match) => {
            const isFull = match.confirmedPlayers >= match.totalPlayers;
            return (
              <div
                key={match.id}
                onClick={() => navigate(`/lineup/${match.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-red-200 transition-all overflow-hidden"
              >
                <div className="p-4">
                  {/* Date & Formation */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold text-sm">
                        {match.date}
                      </div>
                      <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-sm font-semibold">
                        {match.time}
                      </div>
                    </div>
                    <div className="bg-gray-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                      {match.formation}
                    </div>
                  </div>

                  {/* Opponent */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{match.opponentLogo}</div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">vs {match.opponent}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-gray-500">
                        <MapPin size={13} />
                        <span className="text-xs">{match.location}</span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>

                  {/* Player Count */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-700">
                        참여 확정 <span className={`font-bold ${isFull ? 'text-green-600' : 'text-red-600'}`}>{match.confirmedPlayers}</span>/{match.totalPlayers}명
                      </span>
                    </div>
                    {isFull ? (
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">인원 완료</span>
                    ) : (
                      <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">{match.totalPlayers - match.confirmedPlayers}명 부족</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
