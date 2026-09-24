import React, { useState } from 'react';
import { X, Music, Sparkles, Wand2, Play, CheckCircle2, ArrowRight } from 'lucide-react';
import { Song } from '../types';

interface LyriaMusicGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSong: (song: Song) => void;
}

export const LyriaMusicGeneratorModal: React.FC<LyriaMusicGeneratorModalProps> = ({ isOpen, onClose, onLoadSong }) => {
  const [prompt, setPrompt] = useState('Melancholic Chopin-esque Nocturne in C# minor with warm felt piano acoustics and gentle rainfall ambiance');
  const [genre, setGenre] = useState('Classical');
  const [duration, setDuration] = useState<'clip' | 'pro'>('clip');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSong, setGeneratedSong] = useState<Song | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGeneratedSong(null);

    try {
      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, genre, duration })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const comp = data.composition;
        const newSong: Song = {
          id: `lyria-${Date.now()}`,
          title: comp.title || prompt.slice(0, 25),
          composer: comp.composer || 'Lyria-3 AI Atelier',
          key: comp.key || 'C Major',
          bpm: comp.bpm || 88,
          duration: duration === 'pro' ? '3:45' : '0:30',
          difficulty: 'Intermediate',
          genre: genre as any,
          artworkUrl: 'https://images.unsplash.com/photo-1520523839896-5aa42254c1e2?auto=format&fit=crop&q=80&w=800',
          altText: 'Lyria AI Generated Piano Composition',
          totalBars: 32,
          masteryPct: 0,
          pitchPrecision: 100,
          tempoStability: 100,
          isEditorPick: true,
          practicingNowCount: '1.4k practicing',
          notesSequence: comp.notesSequence || []
        };
        setGeneratedSong(newSong);
      } else {
        alert(`Generation failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error generating music: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayInStudio = () => {
    if (generatedSong) {
      onLoadSong(generatedSong);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#181b24] border border-[#7928ca]/40 w-full max-w-xl rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252a38] flex items-center justify-between bg-[#13161f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7928ca] to-[#ff007f] flex items-center justify-center shadow-lg shadow-[#7928ca]/30">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-white text-lg flex items-center gap-2">
                Lyria-3 AI Music Generator <Sparkles className="w-4 h-4 text-[#ff007f]" />
              </h2>
              <p className="text-xs text-[#94a3b8]">Create custom piano masterpieces instantly with Lyria-3 models</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-[#252a38] text-[#94a3b8] hover:text-white hover:bg-[#32384a] flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
              Composition Prompt / Vibe Description
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Epic cinematic piano concerto with soaring arpeggios and emotional resolution..."
              className="w-full bg-[#111319] text-white border border-[#252a38] rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#7928ca] transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                Musical Genre
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-[#111319] text-white border border-[#252a38] rounded-xl p-3 text-sm focus:outline-none focus:border-[#7928ca]"
              >
                <option value="Classical">Classical</option>
                <option value="Jazz & Blues">Jazz & Blues</option>
                <option value="Pop & Rock">Pop & Rock</option>
                <option value="Movie Soundtracks">Movie Soundtracks</option>
                <option value="Anime & Game">Anime & Game</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
                Lyria Model / Duration
              </label>
              <select
                value={duration}
                onChange={(e: any) => setDuration(e.target.value)}
                className="w-full bg-[#111319] text-white border border-[#252a38] rounded-xl p-3 text-sm focus:outline-none focus:border-[#7928ca]"
              >
                <option value="clip">lyria-3-clip-preview (Short Clip / 30s)</option>
                <option value="pro">lyria-3-pro-preview (Full-Length Track)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#7928ca] to-[#ff007f] text-white font-bold hover:opacity-90 disabled:opacity-50 shadow-lg shadow-[#7928ca]/30 flex items-center justify-center gap-2 transition-all"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                Composing with Lyria-3...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate AI Masterpiece
              </>
            )}
          </button>
        </form>

        {/* Generated Result Preview */}
        {generatedSong && (
          <div className="mx-6 mb-6 p-4 rounded-xl bg-[#13161f] border border-[#7928ca]/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{generatedSong.title}</h4>
                <p className="text-xs text-[#94a3b8]">{generatedSong.composer} • {generatedSong.key} • {generatedSong.bpm} BPM</p>
              </div>
            </div>

            <button
              onClick={handlePlayInStudio}
              className="px-4 py-2 rounded-lg bg-[#00d2ff] text-[#111319] font-bold text-xs hover:bg-[#00bfe6] flex items-center gap-1.5 shadow-md shadow-[#00d2ff]/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Play in Studio <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
