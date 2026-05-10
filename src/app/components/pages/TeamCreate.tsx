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
      console.error('\ud300 \uc0dd\uc131 \uc2e4\ud328:', teamError);
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
      console.error('\ud300 \uba64\ubc84 \ucd94\uac00 \uc2e4\ud328:', memberError);
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
      // fallback
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

  // \ud300 \ucf54\ub4dc \ud45c\uc2dc \ud654\uba74
  if (createdTeamCode) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">
          {logoPreview ? (
            <img src={logoPreview} alt="" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            logo
          )}
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{name}</h2>
        <p className="text-gray-400 text-sm mb-8">\ud300\uc774 \uc0dd\uc131\ub418\uc5c8\uc2b5\ub2c8\ub2e4!</p>

        <div className="w-full max-w-xs bg-[#111] rounded-2xl border border-white/10 p-6 text-center mb-6">
          <p className="text-xs text-gray-500 mb-3">\ud300 \ucf54\ub4dc</p>
          <p className="text-4xl font-black text-[#7B2D3B] tracking-[0.3em] mb-4">{createdTeamCode}</p>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-white/5 rounded-xl text-sm text-gray-300 active:scale-95 transition-transform"
          >
            {copied ? <><Check size={16} className="text-emerald-400" /> \ubcf5\uc0ac \uc644\ub8cc</> : <><Copy size={16} /> \ucf54\ub4dc \ubcf5\uc0ac</>}
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center mb-8 leading-relaxed">
          \uc774 \ucf54\ub4dc\ub97c \ud300\uc6d0\ub4e4\uc5d0\uac8c \uacf5\uc720\ud558\uba74<br />
          \ucf54\ub4dc \uc785\ub825\ub9cc\uc73c\ub85c \ud300\uc5d0 \uac00\uc785\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.
        </p>

        <button
          onClick={() => navigate('/mypage')}
          className="w-full max-w-xs bg-[#7B2D3B] text-white py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all"
        >
          \ud655\uc778
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-400">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-white">\ud300 \uc0dd\uc131</h1>
      </div>

      <div className="p-6">
        {/* 로고 선택 */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative mb-3">
            <div className="w-24 h-24 bg-[#111] rounded-full flex items-center justify-center border-2 border-white/10 overflow-hidden">
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${logo === e ? 'bg-[#7B2D3B] ring-2 ring-[#C4697A]' : 'bg-[#111] border border-white/10'}`}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-300 block mb-1">\ud300 \uc774\ub984 *</label>
            <input
              type="text"
              placeholder="\ud300 \uc774\ub984\uc744 \uc785\ub825\ud558\uc138\uc694"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-3 border border-white/10 rounded-xl bg-[#111] text-white placeholder:text-gray-600 focus:ring-2 focus:ring-[#7B2D3B] outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-300 block mb-1">\ud300 \uc124\uba85 (\uc120\ud0dd)</label>
            <textarea
              placeholder="\uc6b0\ub9ac \ud300\uc744 \uc18c\uac1c\ud574\uc8fc\uc138\uc694"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 border border-white/10 rounded-xl bg-[#111] text-white placeholder:text-gray-600 h-24 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-300 block mb-1">\uc778\uc2a4\ud0c0\uadf8\ub7a8 \uacc4\uc815 (\uc120\ud0dd)</label>
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="username"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-[#111] text-white placeholder:text-gray-600 outline-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleCreateTeam}
          disabled={!name.trim() || submitting}
          className="w-full bg-[#7B2D3B] text-white py-4 rounded-xl font-bold mt-8 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? '\uc0dd\uc131 \uc911...' : '\ud300 \uc0dd\uc131 \uc644\ub8cc'}
        </button>
      </div>
    </div>
  );
}
