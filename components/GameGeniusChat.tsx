
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const GameGeniusChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Systems online. Advanced reasoning active. State your query." }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const currentMessages: Message[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(currentMessages);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const conversationHistory = currentMessages
        .filter((msg, index) => !(index === 0 && msg.role === 'model'))
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: conversationHistory,
        config: {
          systemInstruction: `You are an advanced AI assistant with strong reasoning, verification, and problem-solving skills.
Behavior Rules:
- Think carefully before answering.
- Verify facts and logic internally.
- Avoid guessing.
- If unsure, state assumptions clearly.
- Do not expose internal chain-of-thought.
- Provide a clear, structured explanation.
- Do not use bolding (**) or stars in your text. Keep it clean and minimal.

Response Style:
1. Start with a short direct answer.
2. Follow with a clear step-by-step explanation (using simple numbered points).
3. End with a concise conclusion or recommendation.`,
          thinkingConfig: { thinkingBudget: 2048 },
        },
      });

      const aiText = response.text?.replace(/\*\*/g, '') || "Request failed.";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Diagnostic error: Connection failed." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-2 w-72 h-96 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="px-3 py-2 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">Advanced AI Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="text-neutral-600 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide text-[11px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[95%] rounded px-3 py-2 leading-normal whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-cyan-900/40 text-cyan-100 border border-cyan-800/50' : 'bg-neutral-800 text-neutral-300 border border-neutral-700/50'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 px-2">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                <span className="text-[9px] text-neutral-600 uppercase tracking-widest ml-1">Reasoning</span>
              </div>
            )}
          </div>

          <div className="p-2 border-t border-neutral-800 bg-neutral-950">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Input query..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-cyan-700 transition-colors pr-8"
              />
              <button onClick={handleSend} disabled={isLoading} className="absolute right-2 text-cyan-600 hover:text-cyan-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)} className="group flex items-center gap-2">
        <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Expert Diagnostic</span>
        <div className="w-10 h-10 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-lg hover:border-cyan-500 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </button>
    </div>
  );
};

export default GameGeniusChat;
