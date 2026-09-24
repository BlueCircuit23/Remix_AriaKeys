import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, Search, Globe, ChevronDown, Music, Award } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  searchMetadata?: any;
}

interface MaestroChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MaestroChatModal: React.FC<MaestroChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Greetings, maestro! I am Maestro Aria, your personal conservatory piano professor and AI mentor. How may I assist your musical journey today? Ask me about harmonic progressions, fingerings, piano technique, or latest concert repertoire!'
    }
  ]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [useSearch, setUseSearch] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          model,
          useSearch
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: data.reply,
            searchMetadata: data.searchMetadata
          }
        ]);
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: `Error: ${data.error || 'Failed to get response from Maestro.'}` }
        ]);
      }
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `Connection error: ${err.message || 'Unable to reach server.'}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-[#181b24] border border-[#00d2ff]/30 w-full max-w-2xl h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252a38] flex items-center justify-between bg-[#13161f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00d2ff] to-[#7928ca] flex items-center justify-center shadow-lg shadow-[#00d2ff]/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-white text-lg flex items-center gap-2">
                Maestro AI Studio <Sparkles className="w-4 h-4 text-[#00d2ff]" />
              </h2>
              <p className="text-xs text-[#94a3b8]">Interactive Conservatory Professor with Google Search Grounding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-[#252a38] text-[#94a3b8] hover:text-white hover:bg-[#32384a] flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Model & Search toggle */}
        <div className="px-6 py-2.5 bg-[#111319] border-b border-[#252a38] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#94a3b8]">AI Model:</span>
            <select
              value={model}
              onChange={(e: any) => setModel(e.target.value)}
              className="bg-[#181b24] text-white border border-[#252a38] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00d2ff]"
            >
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Balanced & Fast)</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Harmonic Analysis)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra-Low Latency)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-[#181b24] px-3 py-1.5 rounded-lg border border-[#252a38] hover:border-[#00d2ff]/50 transition-all">
            <input
              type="checkbox"
              checked={useSearch}
              onChange={(e) => setUseSearch(e.target.checked)}
              className="rounded accent-[#00d2ff]"
            />
            <Globe className="w-3.5 h-3.5 text-[#00d2ff]" />
            <span className="text-white font-medium">Google Search Grounding</span>
          </label>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user'
                  ? 'bg-[#00d2ff] text-[#111319] font-bold shadow-md shadow-[#00d2ff]/30'
                  : 'bg-[#7928ca] text-white shadow-md shadow-[#7928ca]/30'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#00d2ff] text-[#111319] font-medium rounded-tr-none'
                  : 'bg-[#252a38] text-[#e1e2ea] rounded-tl-none border border-[#32384a]'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {msg.searchMetadata?.groundingChunks && (
                  <div className="mt-3 pt-2 border-t border-[#32384a]/60 text-xs text-[#94a3b8] flex flex-wrap gap-2">
                    <span className="flex items-center gap-1 text-[#00d2ff] font-medium">
                      <Search className="w-3 h-3" /> Grounded in Google Search:
                    </span>
                    {msg.searchMetadata.groundingChunks.map((chunk: any, i: number) => (
                      chunk.web?.uri ? (
                        <a
                          key={i}
                          href={chunk.web.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#181b24] text-[#00d2ff] hover:underline px-2 py-0.5 rounded truncate max-w-[200px]"
                        >
                          {chunk.web.title || chunk.web.uri}
                        </a>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#7928ca] text-white flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#252a38] text-[#94a3b8] px-4 py-3 rounded-2xl rounded-tl-none text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00d2ff] animate-spin" /> Maestro Aria is formulating musical wisdom...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-4 bg-[#13161f] border-t border-[#252a38] flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Bach counterpoint, Rachmaninoff fingering, or request repertoire..."
            className="flex-1 bg-[#181b24] text-white border border-[#252a38] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00d2ff] transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#00d2ff] to-[#7928ca] text-[#111319] hover:opacity-90 disabled:opacity-50 flex items-center justify-center shadow-lg shadow-[#00d2ff]/20 transition-all font-bold"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </form>

      </div>
    </div>
  );
};
