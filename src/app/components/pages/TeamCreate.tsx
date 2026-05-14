import { useState, useRef } from 'react';
import { Instagram, ArrowLeft, Copy, Check, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

function getTeamCode(teamId: string) {
  return teamId.replace(/-/g, '').substring(0, 6).toUpperCase();
}

export function TeamCreate() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instagram, setInstagram] = useState('');
  const [logo, setLogo] = useState('\u26bd');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTeamCode, setCreatedTeamCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogo('');
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateTeam = async () => {
    if (!name.trim() || !user) return;
    setSubmitting(true);

    let logoValue = logo || '\u26bd';

    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(fileName, logoFile);
      if (uploadError) {
        toast.error('로고 업로드에 실패했습니다.');
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('team-logos')
        .getPublicUrl(fileName);
      logoValue = urlData.publicUrl;
    }

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        logo: logoValue,
        description: description.trim() || null,
        instagram: instagram.trim() || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (teamError || !teamData) {
      toast.error('팀 생성에 실패했습니다.');
      setSubmitting(false);
      return;
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamData.id,
        user_id: user.id,
        role: 'president',
      });

    if (memberError) {
      console.error('팀 멤버 추가 실패:', memberError);
    }

    setSubmitting(false);
    await refreshProfile();
    setCreatedTeamCode(getTeamCode(teamData.id));
  };

  const handleCopy = async () => {
    if (!createdTeamCode) return;
    try {
      await navigator.clipboard.writeText(createdTeamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = createdTeamCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const emojis = ['\u26bd', '\ud83d\udc06', '\ud83e\udd85', '\ud83d\udc2f', '\ud83e\udd81', '\ud83d\udc99', '\u26a1', '\ud83d\udd25', '\ud83d\udc09', '\u2b50'];

  if (createdTeamCode) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">
          {logoPreview ? (
            <img src={logoPreview} alt="" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            logo
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{name}</h2>
        <p className="text-gray-400 text-sm mb-8">팀이 생성되었습니다!</p>

        <div className="w-full max-w-xs bg-white rounded-2xl border border-gray-200 p-6 text-center mb-6">
          <p className="text-xs text-gray-500 mb-3">팀 코드</p>
          <p className="text-4xl font-black text-[#7B2D3B] tracking-[0.3em] mb-4">{createdTeamCode}</p>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-600 active:scale-95 transition-transform"
          >
            {copied ? <><Check size={16} className="text-emerald-400" /> 복사 완료</> : <><Copy size={16} /> 코드 복사</>}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mb-8 leading-relaxed">
          이 코드를 팀원들에게 공유하면<br />
          코드 입력만으로 팀에 가입할 수 있습니다.
        </p>

        <button
          onClick={() => navigate('/team')}
          className="w-full max-w-xs bg-[#7B2D3B] text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all"
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-200">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">팀 생성</h1>
      </div>

      <div className="p-6">
        {/* 로고 선택 */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative mb-3">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{logo}</span>
              )}
            </div>
            <button onClick={() => logoInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#7B2D3B] rounded-full flex items-center justify-center">
              <Camera size={14} className="text-white" />
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFileChange} className="hidden" />
          </div>
          {logoPreview ? (
            <button onClick={() => { setLogoFile(null); setLogoPreview(null); setLogo('\u26bd'); }}
              className="text-xs text-gray-500 underline mb-4">이모지로 변경</button>
          ) : (
            <div className="flex justify-center gap-2 mb-8 flex-wrap">
              {emojis.map(e => (
                <button key={e} onClick={() => { setLogo(e); setLogoFile(null); setLogoPreview(null); }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${logo === e ? 'bg-[#7B2D3B] ring-2 ring-[#C4697A]' : 'bg-white border border-gray-200'}`}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-400 block mb-1">팀 이름 *</label>
            <input
              type="text"
              placeholder="팀 이름을 입력하세요"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-[#F5F3F0] text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#7B2D3B] outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-400 block mb-1">팀 설명 (선택)</label>
            <textarea
              placeholder="우리 팀을 소개해주세요"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-[#F5F3F0] text-gray-900 placeholder:text-gray-400 h-24 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-400 block mb-1">인스타그램 (선택)</label>
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="username"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-[#F5F3F0] text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleCreateTeam}
          disabled={!name.trim() || submitting}
          className="w-full bg-[#7B2D3B] text-white py-4 rounded-xl font-bold mt-8 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? '생성 중...' : '팀 생성'}
        </button>
      </div>
    </div>
  );
}
