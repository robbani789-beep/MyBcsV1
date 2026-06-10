import React, { useRef, useEffect } from 'react';
import { Subject, Topic, ChatMessage, TutorMode } from '../types';
import { Send, GraduationCap, MessagesSquare, Compass, Award } from 'lucide-react';

interface ChatPanelProps {
  activeSubject: Subject | null;
  activeTopic: Topic | null;
  messages: ChatMessage[];
  mode: TutorMode;
  onChangeMode: (mode: TutorMode) => void;
  isLoading: boolean;
  onSendMessage: (text: string) => void;
}

export default function ChatPanel({
  activeSubject,
  activeTopic,
  messages,
  mode,
  onChangeMode,
  isLoading,
  onSendMessage,
}: ChatPanelProps) {
  const [inputText, setInputText] = React.useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle textarea self-resizing
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || isLoading || !activeTopic) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Safe and super clean markdown visual sanitizer
  const parseMarkdownHtml = (text: string) => {
    // Escape standard HTML first for total security
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. Triple ticks pre code formats
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre class="bg-black/40 text-rose-300 font-mono text-[11px] p-3 rounded-lg my-2 overflow-x-auto border border-[#374151]/40 leading-relaxed">$1</pre>');

    // 2. Inline bold format (e.g. **keyword**)
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-400 font-bold">$1</strong>');

    // 3. Inline italic format (e.g. *emphasis*)
    escaped = escaped.replace(/\*(.*?)\*/g, '<em class="text-amber-400 font-medium not-italic">$1</em>');

    // 4. Inline code blocks (e.g. `const`)
    escaped = escaped.replace(/`(.*?)`/g, '<code class="bg-[#1f2937]/75 text-pink-400 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">$1</code>');

    // 5. Line break format
    escaped = escaped.replace(/\n/g, '<br />');

    return { __html: escaped };
  };

  return (
    <div id="chatWrap" className="flex flex-col h-full bg-[#0b0f19] overflow-hidden relative">
      {/* Active Header Panel */}
      <div className="p-4 bg-[#111827] border-b border-[#1f2937] flex items-center justify-between shrink-0 shadow-lg z-10">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">ACTIVE TOPIC STUDY ZONE</p>
          <h2 id="chatActiveTopicHeader" className="text-sm font-bold text-slate-100 truncate mt-0.5">
            {activeTopic ? (
              <span className="flex items-center gap-1.5">
                <span className="text-base shrink-0">{activeSubject?.icon}</span>
                <span className="text-slate-200">{activeSubject?.name}</span>
                <span className="text-slate-500 font-normal">›</span>
                <span className="text-blue-400 font-semibold">{activeTopic.name}</span>
              </span>
            ) : (
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-slate-500" />
                Select a topic from the sidebar to begin
              </span>
            )}
          </h2>
        </div>

        {/* Study Pedgagogy Modes Switch */}
        {activeTopic && (
          <div id="tutorModeStrip" className="flex bg-[#1f2937]/80 p-1 rounded-xl border border-[#374151]/50 gap-1 ml-3 shrink-0">
            <button
              onClick={() => onChangeMode('tutor')}
              title="🎓 Comprehensive Teacher mode"
              className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                mode === 'tutor'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Tutor
            </button>
            <button
              onClick={() => onChangeMode('socratic')}
              title="💬 Ask guiding questions to build deep memory"
              className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                mode === 'socratic'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessagesSquare className="w-3.5 h-3.5" />
              Socratic
            </button>
            <button
              onClick={() => onChangeMode('exam')}
              title="📝 MCQ prep & critical facts lists"
              className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                mode === 'exam'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Exam Coach
            </button>
          </div>
        )}
      </div>

      {/* Messages Feed */}
      <div
        id="chatMessagesFeed"
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {!activeTopic ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 mb-4 animate-pulse">
              <GraduationCap className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-slate-200 mb-1 leading-normal">Prepare for BCS Success</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Step up your learning with direct AI guidance. Add subjects, select topics, read materials, and test your knowledge!
            </p>
            <div className="p-3.5 bg-[#182235]/40 rounded-xl text-left border border-[#1f2937]/50 w-full">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Quick Guide</p>
              <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-3">
                <li>Configure your key at the top header bar</li>
                <li>Leverage the **🎓 Tutor** mode to explain complex topics</li>
                <li>Switch to **💬 Socratic** mode to trigger active thinking</li>
                <li>Tap **✨ Generate** in the right drawer for summaries, cards, and quizzes</li>
              </ul>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto animate-in fade-in-50 duration-500">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-3">
              <MessagesSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">Starting point: {activeTopic.name}</h4>
            <p className="text-[11px] text-slate-400 leading-normal mt-1.5 mb-4">
              Conversing resets memory context. Send a question below to initiate the session using your active **{mode.toUpperCase()}** teacher guidelines.
            </p>
            <div className="flex flex-col gap-1.5 w-full text-left">
              <button
                onClick={() => onSendMessage(`Explain the core syllabus of ${activeTopic.name} for BCS exams.`)}
                className="w-full text-left px-3 py-2 text-xs text-blue-300 rounded-lg hover:bg-blue-500/10 border border-[#374151]/40 bg-black/40 hover:border-blue-500/30 transition-all font-medium"
              >
                💡 Explain: "Core Syllabus overview & weightage"
              </button>
              <button
                onClick={() => onSendMessage(`What are the most commonly asked questions or key facts about ${activeTopic.name}?`)}
                className="w-full text-left px-3 py-2 text-xs text-blue-300 rounded-lg hover:bg-blue-500/10 border border-[#374151]/40 bg-black/40 hover:border-blue-500/30 transition-all font-medium"
              >
                💡 Query: "Most common MCQ topics"
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => {
              const isAi = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 select-none ${
                      isAi
                        ? 'bg-[#1e2535] border border-[#374151] text-blue-400 font-bold'
                        : 'bg-blue-600 text-white font-bold'
                    }`}
                  >
                    {isAi ? '🤖' : '👤'}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs inline-block leading-relaxed border shadow-md ${
                      isAi
                        ? 'bg-[#182235]/60 text-slate-100 border-[#374151]/50'
                        : 'bg-blue-600 border-blue-500 text-white shadow-blue-500/10'
                    }`}
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    <div
                      dangerouslySetInnerHTML={parseMarkdownHtml(msg.content)}
                      className="space-y-1.5"
                    />
                    <span
                      className={`block text-[9px] mt-1.5 text-right font-medium select-none ${
                        isAi ? 'text-slate-500' : 'text-blue-200'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Micro loading state animation */}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-center animate-pulse">
                <div className="w-7 h-7 rounded-full bg-[#1e2535] border border-[#374151] flex items-center justify-center text-xs text-blue-400 font-bold">
                  🤖
                </div>
                <div className="rounded-2xl px-4 py-3 bg-[#182235]/40 text-slate-300 border border-[#374151]/30">
                  <div className="flex gap-1.5 items-center py-1">
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce duration-300" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce duration-300" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce duration-300" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-3.5 bg-[#111827] border-t border-[#1f2937] shrink-0">
        <div className="max-w-3xl mx-auto flex items-end gap-2 p-1.5 bg-[#0b0f19] rounded-2xl border border-[#374151]/55 shadow-inner">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={!activeTopic}
            placeholder={
              activeTopic
                ? `Ask anything in ${mode === 'tutor' ? 'Tutor' : mode === 'socratic' ? 'Socratic hint' : 'Exam coach'} mode...`
                : 'Please select a topic on the left sidebar first...'
            }
            className="flex-1 min-w-0 bg-transparent text-xs text-slate-100 placeholder-slate-500 max-h-[120px] outline-none border-none p-2 font-medium leading-relaxed resize-none disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading || !activeTopic}
            className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-transforms hover:scale-105 active:scale-95 duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-md"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
        <div className="text-center text-[10px] text-slate-500 mt-1.5">
          Press **Enter** to send · **Shift + Enter** for a new line · Client calls are completely serverless and private!
        </div>
      </div>
    </div>
  );
}
