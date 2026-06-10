import React, { useState, useEffect } from 'react';
import { Subject, Topic, TopicMaterials, Flashcard, QuizQuestion, Subtopic } from '../types';
import { Sparkles, ArrowLeft, ArrowRight, BookOpen, Layers, CheckSquare, PencilLine, Check, Printer, FileText } from 'lucide-react';

interface RightPanelProps {
  activeSubject: Subject | null;
  activeTopic: Topic | null;
  activeSubtopic?: Subtopic | null;
  materials: TopicMaterials | undefined;
  isLoading: boolean;
  onGenerateMaterial: (type: 'summary' | 'flashcards' | 'quiz') => void;
  onSaveNotes: (notes: string) => void;
  onMarkTopicMastered: () => void;
}

export default function RightPanel({
  activeSubject,
  activeTopic,
  activeSubtopic,
  materials,
  isLoading,
  onGenerateMaterial,
  onSaveNotes,
  onMarkTopicMastered,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'notes'>('summary');
  const displayedName = activeSubtopic ? activeSubtopic.name : (activeTopic ? activeTopic.name : '');
  
  // Flashcards state
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<{ [qIdx: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Local Notes state
  const [localNotes, setLocalNotes] = useState('');
  const [isNotesSaved, setIsNotesSaved] = useState(false);

  // ────────────────────────────────────────────────────────
  // PDF EXPORT / STUDY KIT PRINT GENERATION ENGINE
  // ────────────────────────────────────────────────────────
  const handleExportPDF = (scope: 'topic' | 'subject') => {
    if (!activeSubject) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to view and download your Study PDF!');
      return;
    }

    let contentHtml = '';

    if (scope === 'topic') {
      const summaryText = (materials?.summary || '')
        .replace(/### (.*?)\n/g, '<h4 class="subhead">$1</h4>')
        .replace(/## (.*?)\n/g, '<h3 class="head">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/- (.*?)\n/g, '<li>$1</li>')
        .replace(/\n/g, '<br />');

      const cards = materials?.flashcards || [];
      const quizzes = materials?.quiz || [];
      const scratchNotes = materials?.notes || '';

      contentHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${activeSubject.name} - ${displayedName} - Study Kit</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #2c3e50;
                line-height: 1.6;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                background-color: #ffffff;
              }
              .header {
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 15px;
                margin-bottom: 25px;
              }
              .tag {
                display: inline-block;
                background-color: #ebf8ff;
                color: #2b6cb0;
                font-size: 11px;
                font-weight: bold;
                padding: 3px 8px;
                border-radius: 4px;
                text-transform: uppercase;
                margin-bottom: 8px;
              }
              h1 {
                font-size: 26px;
                margin: 5px 0;
                color: #1a365d;
              }
              h2 {
                font-size: 18px;
                color: #2b6cb0;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 5px;
                margin-top: 30px;
                margin-bottom: 12px;
                page-break-after: avoid;
              }
              h3.head {
                font-size: 14px;
                color: #2d3748;
                margin-top: 15px;
                margin-bottom: 5px;
              }
              h4.subhead {
                font-weight: bold;
                color: #4a5568;
                font-size: 12px;
                margin: 10px 0 5px 0;
              }
              p, li {
                font-size: 13px;
                color: #4a5568;
              }
              .content-box {
                background-color: #f7fafc;
                border: 1px solid #edf2f7;
                border-radius: 8px;
                padding: 15px;
                font-size: 13px;
                margin-bottom: 20px;
              }
              .flashcard-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                margin-bottom: 20px;
              }
              .flashcard-table th, .flashcard-table td {
                border: 1px solid #e2e8f0;
                padding: 10px;
                font-size: 12px;
                text-align: left;
              }
              .flashcard-table th {
                background-color: #edf2f7;
                color: #2d3748;
                font-weight: bold;
              }
              .quiz-box {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
                background-color: #fff;
                page-break-inside: avoid;
              }
              .option {
                display: block;
                padding: 6px;
                margin: 3px 0;
                background-color: #f7fafc;
                border: 1px solid #edf2f7;
                border-radius: 4px;
                font-size: 12px;
              }
              .option.correct {
                background-color: #f0fff4;
                border-color: #c6f6d5;
                color: #22543d;
                font-weight: bold;
              }
              .explanation {
                margin-top: 8px;
                background-color: #fffaf0;
                border-left: 3px solid #dd6b20;
                color: #7b341e;
                padding: 8px;
                border-radius: 4px;
                font-size: 11px;
              }
              .scratchpad {
                background-color: #fffff0;
                border: 1px dashed #d69e2e;
                border-radius: 8px;
                padding: 15px;
                font-size: 12.5px;
                min-height: 80px;
                white-space: pre-wrap;
              }
              .footer {
                margin-top: 45px;
                text-align: center;
                font-size: 11px;
                color: #a0aec0;
                border-top: 1px solid #e2e8f0;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <span class="tag">BCS Smart Study Guide</span>
              <h1>${displayedName}</h1>
              <p style="margin: 0; font-size: 13px; color: #718096">
                Subject: <strong>${activeSubject.name}</strong> &bull; Generated Study Lab Material Booklet
              </p>
            </div>

            <h2>1. Deep Study Summary</h2>
            ${materials?.summary ? `
              <div class="content-box">
                ${summaryText}
              </div>
            ` : '<p style="color: #a0aec0; font-style: italic;">No AI Summary study material has been generated for this topic yet.</p>'}

            <h2>2. Recall Revision Flashcards</h2>
            ${cards.length > 0 ? `
              <table class="flashcard-table">
                <thead>
                  <tr>
                    <th style="width: 45%">Recall Drill (Question)</th>
                    <th style="width: 55%">Solution Matrix (Answer)</th>
                  </tr>
                </thead>
                <tbody>
                  ${cards.map((c, idx) => `
                    <tr>
                      <td><strong>#${idx + 1}</strong>: ${c.q}</td>
                      <td>${c.a}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p style="color: #a0aec0; font-style: italic;">No flashcards compiled for this topic yet.</p>'}

            <h2>3. Syllabus Practice Quiz</h2>
            ${quizzes.length > 0 ? `
              <div class="quizzes-container">
                ${quizzes.map((q, qIdx) => `
                  <div class="quiz-box">
                    <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 13px;">Q${qIdx + 1}. ${q.q}</p>
                    <div>
                      ${q.options.map((opt, oIdx) => `
                        <div class="option ${q.correct === oIdx ? 'correct' : ''}">
                          ${String.fromCharCode(65 + oIdx)}. ${opt} ${q.correct === oIdx ? ' &bull; ✓ (Correct Option)' : ''}
                        </div>
                      `).join('')}
                    </div>
                    <div class="explanation">
                      <strong>Explanations:</strong> ${q.explanation || 'Authentic review verified.'}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<p style="color: #a0aec0; font-style: italic;">No quiz constructed for this topic yet.</p>'}

            <h2>4. Personal Active Review Notes</h2>
            <div class="scratchpad">${scratchNotes ? scratchNotes : 'No personalized notes recorded for this topic yet.'}</div>

            <div class="footer">
              Created with BCS Exam study ecosystem &bull; Exported on ${new Date().toLocaleDateString()}
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `;
    } else {
      contentHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${activeSubject.name} - Study Registry Blueprint</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #2c3e50;
                line-height: 1.6;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                background-color: #ffffff;
              }
              .header {
                border-bottom: 3px solid #10b981;
                padding-bottom: 15px;
                margin-bottom: 25px;
              }
              .tag {
                display: inline-block;
                background-color: #f0fdf4;
                color: #15803d;
                font-size: 11px;
                font-weight: bold;
                padding: 3px 8px;
                border-radius: 4px;
                text-transform: uppercase;
                margin-bottom: 8px;
              }
              h1 {
                font-size: 26px;
                margin: 5px 0;
                color: #14532d;
              }
              h2 {
                font-size: 18px;
                color: #15803d;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 5px;
                margin-top: 30px;
                margin-bottom: 15px;
              }
              .topic-list {
                margin: 15px 0;
              }
              .topic-item {
                border-bottom: 1px solid #edf2f7;
                padding: 12px 0;
              }
              .topic-name {
                font-weight: bold;
                font-size: 13.5px;
                color: #1a202c;
              }
              .subtopic-badge {
                display: inline-block;
                background-color: #f7fafc;
                border: 1px solid #edf2f7;
                font-size: 11px;
                color: #4a5568;
                padding: 2px 6px;
                border-radius: 4px;
                margin-right: 5px;
                margin-top: 5px;
              }
              .footer {
                margin-top: 45px;
                text-align: center;
                font-size: 11px;
                color: #a0aec0;
                border-top: 1px solid #e2e8f0;
                padding-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <span class="tag">Subject Syllabus Map Blueprint</span>
              <h1>${activeSubject.name}</h1>
              <p style="margin: 0; font-size: 13px; color: #718096">
                Complete layout and structural registry mapping
              </p>
            </div>

            <h2>Mapped Syllabus Curriculum Registry</h2>
            <div class="topic-list">
              ${activeSubject.topics.map((t, idx) => `
                <div class="topic-item">
                  <div class="topic-name">#${idx + 1}. ${t.name}</div>
                  ${t.subtopics && t.subtopics.length > 0 ? `
                    <div style="margin-top: 5px;">
                      ${t.subtopics.map(s => `<span class="subtopic-badge">&bull; ${s.name}</span>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>

            <p style="font-size: 12px; color: #718096; margin-top: 25px;">
              * Note: To download full-length summaries, recall decks, and practice questions, please select the specific Topic on the sidebar and click <strong>"Export PDF (Topic)"</strong>.
            </p>

            <div class="footer">
              Created with BCS Exam study ecosystem &bull; Exported on ${new Date().toLocaleDateString()}
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              };
            </script>
          </body>
        </html>
      `;
    }

    printWindow.document.open();
    printWindow.document.write(contentHtml);
    printWindow.document.close();
  };

  // Reset flashcards and quiz state when active topic changes or materials update
  useEffect(() => {
    setCurrentCardIdx(0);
    setIsCardFlipped(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setLocalNotes(materials?.notes || '');
  }, [activeTopic, materials]);

  // Handle local notes typing
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotes(e.target.value);
    setIsNotesSaved(false);
  };

  const handleSaveNotesClick = () => {
    onSaveNotes(localNotes);
    setIsNotesSaved(true);
    setTimeout(() => setIsNotesSaved(false), 2500);
  };

  // Safe and super clean markdown visual sanitizer
  const parseSummaryMarkdown = (text: string) => {
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings format
    escaped = escaped.replace(/### (.*?)\n/g, '<h4 class="text-xs font-bold text-slate-300 uppercase tracking-widest mt-4 mb-2">$1</h4>');
    escaped = escaped.replace(/## (.*?)\n/g, '<h3 class="text-sm font-bold text-slate-100 border-b border-[#374151]/50 pb-1 mt-5 mb-3">$1</h3>');

    // Bold tags
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-400 font-bold">$1</strong>');

    // Bullet points
    escaped = escaped.replace(/- (.*?)\n/g, '<li class="text-[11.5px] text-slate-300 ml-4 list-disc pl-1 py-0.5">$1</li>\n');

    // Line breaks
    escaped = escaped.replace(/\n/g, '<br />');

    return { __html: escaped };
  };

  // Render Tabs List Header
  const renderTabHeader = () => {
    const tabs: { id: typeof activeTab; icon: React.ReactNode; label: string }[] = [
      { id: 'summary', icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Summary' },
      { id: 'flashcards', icon: <Layers className="w-3.5 h-3.5" />, label: 'Cards' },
      { id: 'quiz', icon: <CheckSquare className="w-3.5 h-3.5" />, label: 'Quiz' },
      { id: 'notes', icon: <PencilLine className="w-3.5 h-3.5" />, label: 'Notes' },
    ];

    return (
      <div id="rightPanelTabStrip" className="flex border-b border-[#1f2937] bg-[#111827] shrink-0 p-1 gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold border-b-2 rounded-t-lg cursor-pointer transition-all ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  };

  // Render content depending on active topic & active tab
  const renderTabContent = () => {
    if (!activeTopic) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <BookOpen className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs font-semibold">Workspace locked</p>
          <p className="text-[10px] text-slate-600 mt-1 max-w-[180px]">
            Please choose a subject sub-topic on the left panel to begin your learning activities.
          </p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 space-y-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 border-2 border-blue-500 border-t-transparent animate-spin mb-1" />
          <p className="text-xs font-bold text-slate-300">Summoning active memories...</p>
          <p className="text-[9px] text-slate-500 max-w-[200px]">
            Please wait while the AI analyzes complex BCS syllabus details to construct study material...
          </p>
        </div>
      );
    }

    // ────────────────────────────────────────────────────────
    // CASE A: SUMMARY TAB
    // ────────────────────────────────────────────────────────
    if (activeTab === 'summary') {
      if (!materials?.summary) {
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center p-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20 mb-3 select-none">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">No Summary Active</h4>
            <p className="text-[10px] text-slate-400 leading-normal mt-1.5 mb-4 max-w-xs">
              Synthesize an elegant overview, standard MCQ angles, and structured guidelines instantly for this topic.
            </p>
            <button
              onClick={() => onGenerateMaterial('summary')}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg active:scale-95 duration-100 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Summary
            </button>
          </div>
        );
      }

      return (
        <div className="p-4 space-y-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center bg-[#182235]/40 rounded-xl p-3 border border-[#1f2937]/50 select-none">
            <div>
              <p className="text-[9px] text-slate-500 font-bold">TOPIC SYNERGY OVERVIEW</p>
              <h4 className="text-xs font-bold text-slate-300 truncate">{displayedName}</h4>
            </div>
            <button
              onClick={() => onGenerateMaterial('summary')}
              className="p-1 px-2.5 rounded-lg border border-[#374151] hover:border-blue-500 bg-transparent text-[10px] text-slate-400 hover:text-white transition duration-200 flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3" /> Re-gen
            </button>
          </div>
          <div
            id="summaryBodyText"
            dangerouslySetInnerHTML={parseSummaryMarkdown(materials.summary)}
            className="text-slate-300 text-[11.5px] leading-relaxed font-sans bg-black/10 rounded-xl p-4 border border-[#1f2937] shadow-inner"
          />
        </div>
      );
    }

    // ────────────────────────────────────────────────────────
    // CASE B: FLASHCARDS TAB
    // ────────────────────────────────────────────────────────
    if (activeTab === 'flashcards') {
      const cards = materials?.flashcards || [];

      if (!cards || cards.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center p-4">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 mb-3 select-none">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">Generate Memory Cards</h4>
            <p className="text-[10px] text-slate-400 leading-normal mt-1.5 mb-4 max-w-xs">
              AI creates 5-6 active recall cards mapping questions to hidden conceptual explanations. Excellent for rapid microlearning.
            </p>
            <button
              onClick={() => onGenerateMaterial('flashcards')}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg active:scale-95 duration-100 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Build Flashcards
            </button>
          </div>
        );
      }

      const activeCard = cards[currentCardIdx];

      return (
        <div className="p-4 space-y-4 animate-in fade-in duration-300">
          <div className="flex justify-between items-center select-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ACTIVE RECALL TRIVIA</span>
            <span className="text-[10px] text-blue-400 font-mono font-bold">
              Card {currentCardIdx + 1} of {cards.length}
            </span>
          </div>

          {/* Interactive Flashcard box */}
          <div
            onClick={() => setIsCardFlipped(!isCardFlipped)}
            id="rightFlashcardFrame"
            className="w-full min-h-[170px] bg-[#182235]/70 rounded-2xl border border-blue-500/10 hover:border-blue-500/30 p-5 flex flex-col justify-between cursor-pointer relative shadow-lg transform transition-all duration-300 hover:scale-[1.01]"
          >
            <span className="absolute top-2 left-3 text-[8px] tracking-widest font-bold text-slate-500">
              {isCardFlipped ? 'ANSWER DECK' : 'QUESTION DECK'}
            </span>
            <span className="absolute top-2 right-3 text-[8px] text-slate-500/60 font-medium">Click card to Flip</span>

            <div className="flex items-center justify-center flex-1 py-4 text-center select-none px-2">
              <p
                className={`text-slate-100 text-xs font-semibold leading-relaxed leading-5 transition-all duration-200 ${
                  isCardFlipped ? 'text-emerald-300 italic scale-102 font-medium' : ''
                }`}
              >
                {isCardFlipped ? activeCard.a : activeCard.q}
              </p>
            </div>

            <div className="pt-2 border-t border-[#1f2937]/50 flex justify-between items-center text-[9px] text-slate-500 select-none">
              <span>{isCardFlipped ? '✓ Memory unlocked' : '❔ Tap to reveal'}</span>
              <span className="font-mono bg-black/40 px-1 rounded">SPACEBAR OR TAB REVEAL</span>
            </div>
          </div>

          {/* Deck navigator controls */}
          <div className="flex items-center justify-between gap-3 pt-2 select-none">
            <button
              onClick={() => {
                setIsCardFlipped(false);
                setCurrentCardIdx((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
              }}
              className="flex-1 py-2 rounded-xl bg-black/30 border border-[#374151] hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center gap-1 text-[11px] font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <button
              onClick={() => {
                setIsCardFlipped(false);
                setCurrentCardIdx((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
              }}
              className="flex-1 py-2 rounded-xl bg-black/30 border border-[#374151] hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center gap-1 text-[11px] font-semibold transition"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => onGenerateMaterial('flashcards')}
            className="w-full mt-3 py-2 border border-dashed border-[#1f2937] hover:border-blue-500/40 text-slate-400 hover:text-blue-300 text-[10px] font-semibold flex items-center justify-center gap-1 rounded-xl transition"
          >
            <Sparkles className="w-3.5 h-3.5" /> Regenerate Cards
          </button>
        </div>
      );
    }

    // ────────────────────────────────────────────────────────
    // CASE C: PRACTICE QUIZ TAB
    // ────────────────────────────────────────────────────────
    if (activeTab === 'quiz') {
      const questions = materials?.quiz || [];

      if (!questions || questions.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center p-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 mb-3 select-none">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">Prepare Adaptive Quiz</h4>
            <p className="text-[10px] text-slate-400 leading-normal mt-1.5 mb-4 max-w-xs">
              Auto-generate 5 Multiple Choice Questions. Score 60%+ to automatically mark this topic as "Mastered" on the sidebar!
            </p>
            <button
              onClick={() => onGenerateMaterial('quiz')}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg active:scale-95 duration-100 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Build Quiz
            </button>
          </div>
        );
      }

      // Check remaining questions count user answered
      const answeredCount = Object.keys(quizAnswers).length;
      const allAnswered = answeredCount === questions.length;
      
      const correctCalculatedCount = questions.filter(
        (q, idx) => quizAnswers[idx] === q.correct
      ).length;

      const scorePercent = questions.length
        ? Math.round((correctCalculatedCount / questions.length) * 100)
        : 0;

      // Handle answer selection
      const handleSelectAnswer = (qIdx: number, oIdx: number) => {
        if (quizAnswers[qIdx] !== undefined) return; // already selected
        const updated = { ...quizAnswers, [qIdx]: oIdx };
        setQuizAnswers(updated);

        // Check if now all are answered
        if (Object.keys(updated).length === questions.length) {
          setQuizSubmitted(true);
          const finalCorrectCount = questions.filter(
            (q, idx) => updated[idx] === q.correct
          ).length;
          const finalPercent = Math.round((finalCorrectCount / questions.length) * 100);
          
          if (finalPercent >= 60) {
            onMarkTopicMastered(); // trigger auto master on sidebar!
          }
        }
      };

      return (
        <div className="p-4 space-y-5 overflow-y-auto animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-[#1f2937] pb-2 select-none">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">BCS PRACTICE SUITE</span>
            <span className="text-[10px] text-slate-400 font-medium">
              Progress: {answeredCount}/{questions.length} Quiz Answers
            </span>
          </div>

          <div id="quizBlockWrapper" className="space-y-5">
            {questions.map((q, qIdx) => {
              const selectedIdx = quizAnswers[qIdx];
              const isAnswered = selectedIdx !== undefined;

              return (
                <div key={qIdx} className="bg-black/10 rounded-xl p-3 border border-[#1f2937]/80 space-y-3">
                  <div className="text-xs text-slate-200 font-bold leading-relaxed">
                    {qIdx + 1}. {q.q}
                  </div>

                  <div className="space-y-1.5">
                    {q.options.map((opt, oIdx) => {
                      const isOptionSelected = selectedIdx === oIdx;
                      const isOptionCorrect = q.correct === oIdx;

                      let btnStyle = 'bg-[#111827] border-[#374151] hover:border-blue-500/60 text-slate-300';
                      
                      if (isAnswered) {
                        if (isOptionCorrect) {
                          btnStyle = 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-bold';
                        } else if (isOptionSelected) {
                          btnStyle = 'bg-red-500/10 border-red-500 text-red-500';
                        } else {
                          btnStyle = 'bg-[#1c1d24]/20 border-zinc-800 text-slate-500 cursor-default';
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          disabled={isAnswered}
                          onClick={() => handleSelectAnswer(qIdx, oIdx)}
                          className={`w-full text-left p-2 rounded-lg border text-[11px] leading-relaxed transition-all flex items-start gap-1.5 ${btnStyle}`}
                        >
                          <span className="font-semibold text-slate-500">{String.fromCharCode(65 + oIdx)}.</span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Show explanation drawer once answered */}
                  {isAnswered && (
                    <div className="p-2.5 bg-[#171f30]/65 border-l-2 border-amber-500 rounded-r text-[10px] text-amber-500/80 leading-relaxed font-medium">
                      <strong className="text-amber-400 font-bold shrink-0 block mb-0.5">EXPLANATION:</strong>
                      {q.explanation || 'Analyzed on syllabus trends and correct facts.'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Scores summary */}
          {quizSubmitted && (
            <div className="bg-[#111827] p-4 rounded-xl border border-blue-500/20 text-center select-none space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">CONGRATULATIONS</span>
              <h3 className="text-xl font-bold text-slate-100 flex items-center justify-center gap-1.5">
                🎯 {correctCalculatedCount} / {questions.length} Correct
              </h3>
              <p className="text-xs text-blue-400 font-semibold">{scorePercent}% Mastery Score reached</p>
              <p className="text-[10px] text-slate-400 max-w-xs mx-auto pt-1 leading-normal">
                {scorePercent >= 60 
                  ? '🎉 Excellent! This topic has been marked as COMPLETED (Syllabus mastered) automatically on your progress list.' 
                  : '📘 Need study time. Try reading the Chat / Summary and retry your quiz!'}
              </p>
              <button
                onClick={() => onGenerateMaterial('quiz')}
                className="mt-3 inline-block font-sans rounded-lg py-1.5 px-3 border border-blue-500/50 hover:bg-blue-600 hover:text-white text-[11px] text-blue-400 font-semibold cursor-pointer"
              >
                🔁 Generate New Quiz
              </button>
            </div>
          )}
        </div>
      );
    }

    // ────────────────────────────────────────────────────────
    // CASE D: STUDY NOTES TAB
    // ────────────────────────────────────────────────────────
    if (activeTab === 'notes') {
      return (
        <div className="p-4 space-y-4 flex flex-col h-full animate-in fade-in duration-300">
          <div className="flex justify-between items-center select-none shrink-0 bg-[#182235]/30 rounded-xl p-3 border border-[#1f2937]/50">
            <div>
              <p className="text-[9px] text-slate-500 font-bold">DIGITAL SCRATCHPAD</p>
              <h4 className="text-xs font-bold text-slate-300 truncate">{displayedName}</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveNotesClick}
                className="py-1 px-3 bg-[#10b981] hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[220px] relative flex flex-col">
            <textarea
              value={localNotes}
              onChange={handleNotesChange}
              placeholder="Jot down quick synthesized points, tables, mnemonics, or translations for this topic here..."
              className="w-full flex-1 p-3.5 bg-black/10 border border-[#1f2937] text-xs text-slate-200 outline-none focus:border-blue-500/50 rounded-xl resize-none font-sans leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between mt-2 shrink-0 select-none">
            <p className="text-[10px] text-slate-500 font-medium">Notes are stored automatically on your local device cache.</p>
            {isNotesSaved && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                ✓ Stored!
              </span>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div id="rightMaterialPanel" className="flex flex-col h-full bg-[#111827] border-l border-[#1f2937] overflow-hidden">
      {/* Tab strip */}
      {renderTabHeader()}

      {/* Mini-Active Pathway and Print Action Bar */}
      {activeTopic && (
        <div className="flex justify-between items-center bg-[#111827] border-b border-[#1f2937]/80 px-4 py-2.5 shrink-0 select-none">
          <div className="min-w-0 pr-2">
            <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider block">ACTIVE STUDY PATH</span>
            <h4 className="text-[11px] font-bold text-slate-300 truncate" title={displayedName}>
              {displayedName}
            </h4>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => handleExportPDF('topic')}
              title="Save current topic summary, flashcards, quizzes and notes as a PDF booklet"
              className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 hover:border-rose-500/50 rounded-lg text-[10px] font-bold text-rose-400 hover:text-rose-300 transition duration-150 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <FileText className="w-3 h-3 text-rose-400" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => handleExportPDF('subject')}
              title="Export all chapters register roadmap index for this subject"
              className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition duration-150 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Printer className="w-3 h-3 text-emerald-400" />
              <span>Syllabus Map</span>
            </button>
          </div>
        </div>
      )}

      {/* Main materials container */}
      <div id="rightMaterialContent" className="flex-1 overflow-y-auto min-h-0 bg-[#0d121f]">
        {renderTabContent()}
      </div>
    </div>
  );
}
