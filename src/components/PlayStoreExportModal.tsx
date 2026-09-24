import React, { useState } from 'react';
import { X, Smartphone, Download, CheckCircle, ExternalLink, ShieldCheck, Code, Globe, Terminal } from 'lucide-react';

interface PlayStoreExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayStoreExportModal: React.FC<PlayStoreExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pwa' | 'capacitor' | 'metadata'>('pwa');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#181b24] border border-[#00d2ff]/40 w-full max-w-2xl h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252a38] flex items-center justify-between bg-[#13161f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-[#00d2ff] flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Smartphone className="w-5 h-5 text-[#111319]" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-white text-lg flex items-center gap-2">
                Google Play Store Publisher Kit <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </h2>
              <p className="text-xs text-[#94a3b8]">Package & submit AriaKeys to the Google Play Store as a Native Android App or PWA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-[#252a38] text-[#94a3b8] hover:text-white hover:bg-[#32384a] flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#252a38] bg-[#111319] px-6 gap-6">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pwa' ? 'border-[#00d2ff] text-[#00d2ff]' : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> PWA / TWA Install
          </button>
          <button
            onClick={() => setActiveTab('capacitor')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'capacitor' ? 'border-[#00d2ff] text-[#00d2ff]' : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Capacitor Android APK
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'metadata' ? 'border-[#00d2ff] text-[#00d2ff]' : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Store Listing Assets
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-[#e1e2ea]">
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#13161f] border border-[#252a38] space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Progressive Web App (PWA) Ready
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  AriaKeys is fully configured with Web App Manifest, responsive viewport, offline capability, and high-performance AudioWorklet synthesis. Users on Android can install directly from Chrome via "Add to Home Screen" or Trusted Web Activity (TWA).
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#00d2ff]">Publishing via Trusted Web Activity (TWA):</h4>
                <ol className="list-decimal list-inside space-y-2 text-xs text-[#94a3b8] pl-2">
                  <li>Deploy your production build to your hosting domain (HTTPS required).</li>
                  <li>Use <span className="text-white font-mono">Bubblewrap CLI</span> or Google Play Bubblewrap to wrap your PWA into an Android App Bundle (.aab).</li>
                  <li>Upload the signed `.aab` file to the Google Play Console under Production.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'capacitor' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#13161f] border border-[#252a38] space-y-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00d2ff]" /> Native Android Wrapper (Capacitor)
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  To bundle AriaKeys into a native Android application with full hardware MIDI USB/Bluetooth access:
                </p>
              </div>

              <div className="bg-[#111319] p-4 rounded-xl font-mono text-xs text-[#00d2ff] space-y-2 border border-[#252a38]">
                <p>npm install @capacitor/core @capacitor/cli</p>
                <p>npx cap init AriaKeys com.ariakeys.atelier</p>
                <p>npm run build</p>
                <p>npx cap add android</p>
                <p>npx cap open android</p>
              </div>
              <p className="text-xs text-[#94a3b8]">Once opened in Android Studio, click <span className="text-white font-semibold">Build &gt; Build Bundle(s) / APK(s) &gt; Build Bundle(s) (.aab)</span> to generate your Google Play Store ready artifact.</p>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#13161f] border border-[#252a38] space-y-3">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider text-[#00d2ff]">Google Play Listing Information</h3>
                <div className="space-y-2 text-xs">
                  <p><strong className="text-white">App Name:</strong> AriaKeys - Precision Piano Atelier</p>
                  <p><strong className="text-white">Short Description:</strong> Interactive piano atelier & AI conservatory with waterfall visualization.</p>
                  <p><strong className="text-white">Category:</strong> Education / Music & Audio</p>
                  <p><strong className="text-white">Content Rating:</strong> Everyone (E)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#252a38] bg-[#13161f] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#00d2ff] text-[#111319] font-bold text-xs hover:bg-[#00bfe6] transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
