import { useState, useEffect, useRef } from 'react';
import { Download, Share2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import type { Match } from '../../../lib/types';
import previewImage from 'figma:asset/_____2026-05-06_154820.png';

const templates = [
  { id: 1, name: '크림슨', bgColor: 'from-red-800 to-red-700', accentColor: 'text-white' },
  { id: 2, name: '아이보리', bgColor: 'from-amber-50 to-yellow-50', accentColor: 'text-gray-800', textColor: 'text-gray-900' },
  { id: 3, name: '블랙', bgColor: 'from-gray-900 to-black', accentColor: 'text-red-500' },
  { id: 4, name: '화이트', bgColor: 'from-white to-gray-100', accentColor: 'text-red-700', textColor: 'text-gray-900' },
];

export default function SocialPost() {
  const { team } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [includeLineup, setIncludeLineup] = useState(true);
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const postRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!team) return;
    const fetchNextMatch = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(1)
        .single();
      if (data) setNextMatch(data);
    };
    fetchNextMatch();
  }, [team]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8">
      <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Share2 size={28} />
          SNS 홍보물 제작
        </h1>
        <p className="text-sm text-red-100">인스타그램 피드용 이미지 생성</p>
      </div>

      <div className="px-4 mt-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">색상</h3>
        <div className="flex gap-2">
          {templates.map(t => (
            <button key={t.id} onClick={() => setSelectedTemplate(t)}
              className={`flex-1 p-2 rounded-lg border-2 transition-all ${
                selectedTemplate.id === t.id ? 'border-red-600 shadow-md' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <div className={`h-8 bg-gradient-to-r ${t.bgColor} rounded mb-1`} />
              <p className="text-xs font-medium text-gray-700">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={includeLineup} onChange={(e) => setIncludeLineup(e.target.checked)}
              className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500" />
            <span className="text-sm font-medium text-gray-900">선수 라인업 포함</span>
          </label>
        </div>
      </div>

      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">미리보기 (1:1)</h3>
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <div ref={postRef} className="relative aspect-square overflow-hidden rounded-lg">
            <img src={previewImage} alt="경기 결과" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {nextMatch && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">다음 경기</p>
            <p className="text-sm font-bold text-gray-900">
              {nextMatch.home_team?.name} vs {nextMatch.away_team?.name || '상대 미정'}
            </p>
            <p className="text-xs text-gray-500">{nextMatch.date} {nextMatch.time?.slice(0, 5)} · {nextMatch.stadium}</p>
          </div>
        </div>
      )}

      <div className="px-4 mt-6 space-y-3">
        <button className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-md">
          <Download size={20} /> 이미지로 저장
        </button>
        <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md">
          <Share2 size={20} /> 인스타그램에 공유
        </button>
        <button className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors">
          <RefreshCw size={20} /> 새로 만들기
        </button>
      </div>
    </div>
  );
}
