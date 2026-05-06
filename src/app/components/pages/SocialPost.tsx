import { useState, useRef } from 'react';
import { Download, Share2, RefreshCw, Calendar, MapPin, Users } from 'lucide-react';
import previewImage from 'figma:asset/_____2026-05-06_154820.png';

const templates = [
  {
    id: 1,
    name: '크림슨',
    bgColor: 'from-red-800 to-red-700',
    accentColor: 'text-white',
  },
  {
    id: 2,
    name: '아이보리',
    bgColor: 'from-amber-50 to-yellow-50',
    accentColor: 'text-gray-800',
    textColor: 'text-gray-900',
  },
  {
    id: 3,
    name: '블랙',
    bgColor: 'from-gray-900 to-black',
    accentColor: 'text-red-500',
  },
  {
    id: 4,
    name: '화이트',
    bgColor: 'from-white to-gray-100',
    accentColor: 'text-red-700',
    textColor: 'text-gray-900',
  },
];

const mockMatch = {
  date: '2026년 5월 10일 (토)',
  time: '18:00',
  location: '서울 은평 월드컵경기장 보조구장',
  teamA: '경축',
  teamB: '연세대 FC',
  logoA: 'figma:asset/image-1.png',
  logoB: '🦅',
};

const lineup = [
  { name: '김민수', number: 1, position: 'GK' },
  { name: '이준호', number: 2, position: 'DF' },
  { name: '박성훈', number: 3, position: 'DF' },
  { name: '최지훈', number: 4, position: 'DF' },
  { name: '정대현', number: 5, position: 'DF' },
  { name: '강태양', number: 6, position: 'MF' },
  { name: '윤재민', number: 7, position: 'MF' },
  { name: '한동수', number: 8, position: 'MF' },
  { name: '서준영', number: 9, position: 'FW' },
  { name: '오현우', number: 10, position: 'FW' },
  { name: '임태규', number: 11, position: 'FW' },
];

export default function SocialPost() {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [includeLineup, setIncludeLineup] = useState(true);
  const postRef = useRef<HTMLDivElement>(null);

  const template = templates.find(t => t.id === selectedTemplate.id) || templates[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Share2 size={28} />
          SNS 홍보물 제작
        </h1>
        <p className="text-sm text-red-100">인스타그램 피드용 이미지 생성</p>
      </div>

      {/* Template Selector */}
      <div className="px-4 mt-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">색상</h3>
        <div className="flex gap-2">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t)}
              className={`flex-1 p-2 rounded-lg border-2 transition-all ${
                selectedTemplate.id === t.id
                  ? 'border-red-600 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`h-8 bg-gradient-to-r ${t.bgColor} rounded mb-1`} />
              <p className="text-xs font-medium text-gray-700">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLineup}
              onChange={(e) => setIncludeLineup(e.target.checked)}
              className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-gray-900">선수 라인업 포함</span>
          </label>
        </div>
      </div>

      {/* Preview - Instagram 1:1 Format */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">미리보기 (1:1)</h3>
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <div
            ref={postRef}
            className="relative aspect-square overflow-hidden rounded-lg"
          >
            <img
              src={previewImage}
              alt="경기 결과"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mt-6 space-y-3">
        <button className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-md">
          <Download size={20} />
          이미지로 저장
        </button>
        <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md">
          <Share2 size={20} />
          인스타그램에 공유
        </button>
        <button className="w-full bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors">
          <RefreshCw size={20} />
          새로 만들기
        </button>
      </div>

      {/* Tips */}
      <div className="px-4 mt-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="font-semibold text-red-900 mb-2 text-sm">💡 공유 팁</h4>
          <ul className="text-xs text-red-800 space-y-1">
            <li>• 이미지는 1:1 비율로 인스타그램 피드에 최적화되어 있습니다</li>
            <li>• 해시태그를 활용하여 더 많은 사람들에게 도달하세요</li>
            <li>• 경기 24시간 전에 공유하면 참여율이 높아집니다</li>
            <li>• 팀 계정을 태그하여 함께 홍보하세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
