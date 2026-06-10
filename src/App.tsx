import React, { useState, useEffect } from 'react';
import { Subject, Topic, ProgressState, ChatMessage, TutorMode, TopicMaterials, MaterialsState, ApiConfig, ApiProvider, SharedStopwatch } from './types';
import { defaultSubjects } from './data/defaultSubjects';
import { callAI } from './services/ai';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import RightPanel from './components/RightPanel';
import { KeyRound, Timer, BookOpen, Layers, CheckSquare, PencilLine, Menu, Settings, Download, Upload, Cloud, RefreshCw, Copy, Check, Play, Pause, RotateCcw } from 'lucide-react';

/**
 * Parses user input date of format DD:MM:YYYY (or with hyphens/slashes) robustly.
 */
function parseDateString(valStr: string): Date | null {
  const cleaned = valStr.trim();
  if (!cleaned) return null;

  // Try split with colon, hyphen, or slash
  const parts = cleaned.split(/[:\-\/]/);
  
  if (parts.length === 3) {
    const part0 = parseInt(parts[0], 10);
    const part1 = parseInt(parts[1], 10);
    const part2 = parseInt(parts[2], 10);

    // Case 1: DD:MM:YYYY format (date:month:year)
    if (part0 >= 1 && part0 <= 31 && part1 >= 1 && part1 <= 12 && part2 >= 1000) {
      const d = new Date(part2, part1 - 1, part0);
      if (!isNaN(d.getTime())) return d;
    }
    
    // Case 2: YYYY-MM-DD standard format
    if (part0 >= 1000 && part1 >= 1 && part1 <= 12 && part2 >= 1 && part2 <= 31) {
      const d = new Date(part0, part1 - 1, part2);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Fallback
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a Date object to DD:MM:YYYY (date:month:year).
 */
function formatDateString(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}:${month}:${year}`;
}

export default function App() {
  // ────────────────────────────────────────────────────────
  // STATE DEFINITIONS
  // ────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [curSubjectId, setCurSubjectId] = useState<string | null>(null);
  const [curTopicId, setCurTopicId] = useState<string | null>(null);
  const [curSubtopicId, setCurSubtopicId] = useState<string | null>(null);
  
  // Progress & study assets registers
  const [progress, setProgress] = useState<ProgressState>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [materials, setMaterials] = useState<MaterialsState>({});
  
  // App UI configuration state
  const [mode, setMode] = useState<TutorMode>('tutor');
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [countdownText, setCountdownText] = useState('Set date →');
  
  // Loading indicators
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);

  // Responsive Drawer states
  const [showMobileLeft, setShowMobileLeft] = useState(false);
  const [showMobileRight, setShowMobileRight] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // API Config settings
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    provider: 'gemini',
    geminiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openrouterKey: '',
    openrouterModel: 'meta-llama/llama-3.1-8b-instruct:free'
  });

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Synchronization states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [inputSyncCode, setInputSyncCode] = useState('');

  // Shared co-study stopwatch state
  const [stopwatch, setStopwatch] = useState<SharedStopwatch>({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
  });
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string>('');
  const ignoreNextAutoPush = React.useRef(false);
  const socketRef = React.useRef<WebSocket | null>(null);

  // ────────────────────────────────────────────────────────
  // INITIAL LOAD & LOCALSTORAGE ATTACHMENTS
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      // 1. Load subjects database
      const cachedSubj = localStorage.getItem('bcs_subjects');
      if (cachedSubj) {
        setSubjects(JSON.parse(cachedSubj));
      } else {
        setSubjects(defaultSubjects);
        localStorage.setItem('bcs_subjects', JSON.stringify(defaultSubjects));
      }

      // 2. Load progress register
      const cachedProg = localStorage.getItem('bcs_progress');
      if (cachedProg) {
        setProgress(JSON.parse(cachedProg));
      }

      // 3. Load materials (summaries, flashcards, notes)
      const cachedMaterials = localStorage.getItem('bcs_materials');
      if (cachedMaterials) {
        setMaterials(JSON.parse(cachedMaterials));
      }

      // 4. Load exam deadline
      const cachedExamDate = localStorage.getItem('bcs_exam_date');
      if (cachedExamDate) {
        setExamDate(new Date(cachedExamDate));
      }

      // 5. Load API Key config configurations
      const cachedApi = localStorage.getItem('bcs_api_config');
      if (cachedApi) {
        setApiConfig(JSON.parse(cachedApi));
      }

      // 6. Load synchronization code
      const cachedSyncCode = localStorage.getItem('bcs_sync_code');
      if (cachedSyncCode) {
        setSyncCode(cachedSyncCode);
        setInputSyncCode(cachedSyncCode);
      }

      // 7. Load local study stopwatch cached state
      const cachedStopwatch = localStorage.getItem('bcs_stopwatch');
      if (cachedStopwatch) {
        setStopwatch(JSON.parse(cachedStopwatch));
      }
    } catch (e) {
      console.error('LocalStorage load failed', e);
    }
  }, []);

  // ────────────────────────────────────────────────────────
  // SYNCHRONIZATION BACKUPS TO LOCALSTORAGE
  // ────────────────────────────────────────────────────────
  const saveSubjects = (list: Subject[]) => {
    setSubjects(list);
    localStorage.setItem('bcs_subjects', JSON.stringify(list));
  };

  const saveProgress = (prog: ProgressState) => {
    setProgress(prog);
    localStorage.setItem('bcs_progress', JSON.stringify(prog));
  };

  const saveMaterials = (mats: MaterialsState) => {
    setMaterials(mats);
    localStorage.setItem('bcs_materials', JSON.stringify(mats));
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ────────────────────────────────────────────────────────
  // DATA PORTABILITY: LOCAL & CLOUD BACKUPS
  // ────────────────────────────────────────────────────────
  const handleExportData = () => {
    try {
      const dataToBackup = {
        subjects,
        progress,
        materials,
        examDate: examDate ? examDate.toISOString() : null,
        apiConfig,
        version: '1.0.0',
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(dataToBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bcs_syllabus_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerToast('✓ Backup file downloaded!');
    } catch (err) {
      console.error(err);
      triggerToast('❌ Export failed');
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.subjects || parsed.progress)) {
          if (parsed.subjects) saveSubjects(parsed.subjects);
          if (parsed.progress) saveProgress(parsed.progress);
          if (parsed.materials) saveMaterials(parsed.materials);
          if (parsed.examDate) {
            const d = new Date(parsed.examDate);
            setExamDate(d);
            localStorage.setItem('bcs_exam_date', d.toISOString());
          }
          if (parsed.apiConfig) {
            setApiConfig(parsed.apiConfig);
            localStorage.setItem('bcs_api_config', JSON.stringify(parsed.apiConfig));
          }
          triggerToast('🎉 Backup restored successfully!');
          setShowConfigDrawer(false);
        } else {
          triggerToast('❌ Invalid backup file format');
        }
      } catch (err) {
        console.error(err);
        triggerToast('❌ Error parsing backup file');
      }
    };
    reader.readAsText(file);
  };

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    
    const payload = {
      syncCode, // Send if it already exists so the backend overrides the existing blob!
      subjects,
      progress,
      materials,
      examDate: examDate ? examDate.toISOString() : null,
      apiConfig,
      stopwatch, // Include live co-study stopwatch in cloud payload!
      version: '1.0.0',
      syncedAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        const code = data.id;
        if (code) {
          setSyncCode(code);
          localStorage.setItem('bcs_sync_code', code);
          try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2500);
          } catch (clipErr) {
            console.warn('Clipboard write deferred', clipErr);
          }
          triggerToast(`✓ Synchronized with Cloud Key: ${code}`);
        } else {
          throw new Error('Key missing in response');
        }
      } else {
        throw new Error('Failed to save to Cloudflare sync storage');
      }
    } catch (err) {
      console.error(err);
      triggerToast('❌ Sync Temp Unavailable. Try again!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    const cleanCode = inputSyncCode.trim();
    if (!cleanCode) {
      triggerToast('Enter your 8-char to 20-char study key');
      return;
    }
    
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/sync/pull/${cleanCode}`);
      if (!res.ok) {
        throw new Error('Code not found');
      }
      
      const parsed = await res.json();
      
      if (parsed && (parsed.subjects || parsed.progress)) {
        ignoreNextAutoPush.current = true; // prevent auto-push feedback loop
        if (parsed.subjects) saveSubjects(parsed.subjects);
        if (parsed.progress) saveProgress(parsed.progress);
        if (parsed.materials) saveMaterials(parsed.materials);
        if (parsed.examDate) {
          const d = new Date(parsed.examDate);
          setExamDate(d);
          localStorage.setItem('bcs_exam_date', d.toISOString());
        }
        if (parsed.apiConfig) {
          setApiConfig(parsed.apiConfig);
          localStorage.setItem('bcs_api_config', JSON.stringify(parsed.apiConfig));
        }
        if (parsed.stopwatch) {
          setStopwatch(parsed.stopwatch);
          localStorage.setItem('bcs_stopwatch', JSON.stringify(parsed.stopwatch));
        }
        
        setSyncCode(cleanCode);
        localStorage.setItem('bcs_sync_code', cleanCode);
        if (parsed.syncedAt) {
          setLastCloudSyncTime(parsed.syncedAt);
        }

        triggerToast('🎉 Synced study plan retrieved!');
        setInputSyncCode('');
        setShowConfigDrawer(false);
      } else {
        triggerToast('❌ Synced profile is empty/invalid');
      }
    } catch (err) {
      console.error(err);
      triggerToast('❌ Incorrect code or connection error');
    } finally {
      setIsSyncing(false);
    }
  };



  // ────────────────────────────────────────────────────────
  // DYNAMIC COUNTDOWN TIMER ENGINE
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    const calcTimeline = () => {
      if (!examDate) {
        setCountdownText('Set date →');
        return;
      }
      const timeDiff = examDate.getTime() - Date.now();
      if (timeDiff <= 0) {
        setCountdownText('🎯 Exam Day!');
        return;
      }

      const totalSec = Math.floor(timeDiff / 1000);
      const totalMin = Math.floor(totalSec / 60);
      const totalHr = Math.floor(totalMin / 60);
      const totalDays = Math.floor(totalHr / 24);

      const remHr = totalHr % 24;
      const remMin = totalMin % 60;

      if (totalDays > 0) {
        setCountdownText(`${totalDays}d ${remHr}h left`);
      } else if (totalHr > 0) {
        setCountdownText(`${totalHr}h ${remMin}m left`);
      } else {
        setCountdownText(`${remMin}m left`);
      }
    };

    calcTimeline();
    const interval = setInterval(calcTimeline, 10000);
    return () => clearInterval(interval);
  }, [examDate]);

  // ────────────────────────────────────────────────────────
  // CO-STUDY LIVE SYNCED STOPWATCH ACTIONS & TRIGGER HOOKS
  // ────────────────────────────────────────────────────────
  const handleStartStopwatch = () => {
    const updated = {
      isRunning: true,
      startTime: Date.now(),
      elapsedTime: stopwatch.elapsedTime,
    };
    setStopwatch(updated);
    localStorage.setItem('bcs_stopwatch', JSON.stringify(updated));
  };

  const handlePauseStopwatch = () => {
    const elapsed = stopwatch.isRunning && stopwatch.startTime
      ? stopwatch.elapsedTime + (Date.now() - stopwatch.startTime)
      : stopwatch.elapsedTime;
    
    const updated = {
      isRunning: false,
      startTime: null,
      elapsedTime: elapsed,
    };
    setStopwatch(updated);
    localStorage.setItem('bcs_stopwatch', JSON.stringify(updated));
  };

  const handleResetStopwatch = () => {
    const updated = {
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
    };
    setStopwatch(updated);
    localStorage.setItem('bcs_stopwatch', JSON.stringify(updated));
  };

  // Stopwatch ticking local calculation
  useEffect(() => {
    let intervalId: any = null;
    
    const updateTime = () => {
      if (stopwatch.isRunning && stopwatch.startTime) {
        const totalMs = stopwatch.elapsedTime + (Date.now() - stopwatch.startTime);
        setDisplaySeconds(Math.floor(totalMs / 1000));
      } else {
        setDisplaySeconds(Math.floor(stopwatch.elapsedTime / 1000));
      }
    };

    updateTime();

    if (stopwatch.isRunning) {
      intervalId = setInterval(updateTime, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [stopwatch]);

  // Debounced auto-push for real-time multiplayer updates (Backup Save)
  useEffect(() => {
    if (!syncCode) return;
    if (ignoreNextAutoPush.current) {
      ignoreNextAutoPush.current = false;
      return;
    }

    const payload = {
      syncCode,
      subjects,
      progress,
      materials,
      examDate: examDate ? examDate.toISOString() : null,
      apiConfig,
      stopwatch,
      version: '1.0.0',
      syncedAt: new Date().toISOString()
    };

    const delayDebounceId = setTimeout(async () => {
      try {
        await fetch(`/api/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        console.log("Background co-study auto-sync push succeeded");
      } catch (err) {
        console.error("Background auto-sync push failed", err);
      }
    }, 1500);

    return () => clearTimeout(delayDebounceId);
  }, [subjects, progress, materials, examDate, stopwatch, syncCode]);

  // Helper to push update to socket instantly
  const emitWebSocketUpdate = () => {
    if (!syncCode) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        const payload = {
          subjects,
          progress,
          materials,
          examDate: examDate ? examDate.toISOString() : null,
          apiConfig,
          stopwatch,
          syncedAt: new Date().toISOString()
        };
        socketRef.current.send(JSON.stringify({
          type: "update",
          syncCode,
          payload
        }));
        console.log("⚡ Instant WebSocket state-sync update broadcasted");
      } catch (err) {
        console.warn("WebSocket emit error:", err);
      }
    }
  };

  // Live Instant WebSocket Broadcast effect
  useEffect(() => {
    if (!syncCode) return;
    if (ignoreNextAutoPush.current) {
      ignoreNextAutoPush.current = false;
      return;
    }
    emitWebSocketUpdate();
  }, [subjects, progress, materials, examDate, stopwatch, syncCode]);

  // Establish WebSockets Live connection for instant, zero-lag co-study sync
  useEffect(() => {
    if (!syncCode) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    let isDisposed = false;
    let connectTimeoutId: any = null;

    const connectWS = () => {
      if (isDisposed) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}`;
      console.log("Connecting state-sync WebSocket to:", wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (isDisposed) {
          socket.close();
          return;
        }
        console.log("WebSocket connected successfully for key:", syncCode);
        // Register key
        socket.send(JSON.stringify({
          type: "join",
          syncCode
        }));
      };

      socket.onmessage = (event) => {
        if (isDisposed) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "sync_update" && msg.payload) {
            const parsed = msg.payload;
            
            console.log("✨ WebSocket instant update received", parsed);
            
            ignoreNextAutoPush.current = true;
            
            if (parsed.subjects) {
              setSubjects(parsed.subjects);
              localStorage.setItem('bcs_subjects', JSON.stringify(parsed.subjects));
            }
            if (parsed.progress) {
              setProgress(parsed.progress);
              localStorage.setItem('bcs_progress', JSON.stringify(parsed.progress));
            }
            if (parsed.materials) {
              setMaterials(parsed.materials);
              localStorage.setItem('bcs_materials', JSON.stringify(parsed.materials));
            }
            if (parsed.examDate) {
              const d = new Date(parsed.examDate);
              setExamDate(d);
              localStorage.setItem('bcs_exam_date', d.toISOString());
            }
            if (parsed.stopwatch) {
              setStopwatch(parsed.stopwatch);
              localStorage.setItem('bcs_stopwatch', JSON.stringify(parsed.stopwatch));
            }
            if (parsed.syncedAt) {
              setLastCloudSyncTime(parsed.syncedAt);
            }
          }
        } catch (err) {
          console.warn("WebSocket parse error:", err);
        }
      };

      socket.onclose = () => {
        if (isDisposed) return;
        socketRef.current = null;
        console.warn("WebSocket state-sync disconnected. Reconnecting in 3s...");
        connectTimeoutId = setTimeout(connectWS, 3000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket transport error:", err);
        socket.close();
      };
    };

    connectWS();

    return () => {
      isDisposed = true;
      if (connectTimeoutId) clearTimeout(connectTimeoutId);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [syncCode]);

  // Live polling cloud pull effect to sync other devices in real-time
  useEffect(() => {
    if (!syncCode) return;

    const pollCloudState = async () => {
      try {
        const res = await fetch(`/api/sync/pull/${syncCode}`);
        if (!res.ok) return;

        const parsed = await res.json();
        
        if (parsed && (parsed.subjects || parsed.progress)) {
          const cloudSyncedAt = parsed.syncedAt || '';
          
          if (cloudSyncedAt && cloudSyncedAt !== lastCloudSyncTime) {
            ignoreNextAutoPush.current = true;
            
            if (parsed.subjects) {
              setSubjects(parsed.subjects);
              localStorage.setItem('bcs_subjects', JSON.stringify(parsed.subjects));
            }
            if (parsed.progress) {
              setProgress(parsed.progress);
              localStorage.setItem('bcs_progress', JSON.stringify(parsed.progress));
            }
            if (parsed.materials) {
              setMaterials(parsed.materials);
              localStorage.setItem('bcs_materials', JSON.stringify(parsed.materials));
            }
            if (parsed.examDate) {
              const d = new Date(parsed.examDate);
              setExamDate(d);
              localStorage.setItem('bcs_exam_date', d.toISOString());
            }
            if (parsed.stopwatch) {
              setStopwatch(parsed.stopwatch);
              localStorage.setItem('bcs_stopwatch', JSON.stringify(parsed.stopwatch));
            }
            
            setLastCloudSyncTime(cloudSyncedAt);
            console.log("Co-study live sync updated from cloud at:", cloudSyncedAt);
          }
        }
      } catch (pollErr) {
        console.warn("Co-study polling read deferred", pollErr);
      }
    };

    const pollInterval = setInterval(pollCloudState, 4000);
    return () => clearInterval(pollInterval);
  }, [syncCode, lastCloudSyncTime]);

  // ────────────────────────────────────────────────────────
  // CONVERSATIONAL INTERACTION DISPATCHERS
  // ────────────────────────────────────────────────────────
  const handleSelectTopic = (subjectId: string, topicId: string, subtopicId: string | null) => {
    setCurSubjectId(subjectId);
    setCurTopicId(topicId);
    setCurSubtopicId(subtopicId);
    setMessages([]); // clear active chat session

    // Auto-advance status to 'reading' on selection if it is 'to-read'
    const targetId = subtopicId || topicId;
    const currentProg = progress[subjectId] || {};
    if (!currentProg[targetId] || currentProg[targetId] === 'to-read') {
      const updated = {
        ...progress,
        [subjectId]: {
          ...currentProg,
          [targetId]: 'reading' as const,
        },
      };
      saveProgress(updated);
    }

    // Dismiss drawer toggles
    setShowMobileLeft(false);
    setShowMobileRight(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!curSubjectId || !curTopicId) return;
    const activeSubject = subjects.find((s) => s.id === curSubjectId);
    const activeTopic = activeSubject?.topics.find((t) => t.id === curTopicId);
    if (!activeTopic || !activeSubject) return;

    // Check API availability
    const key = apiConfig.provider === 'gemini' ? apiConfig.geminiKey : apiConfig.openrouterKey;
    if (!key.trim()) {
      setShowConfigDrawer(true);
      triggerToast('⚠️ Please enter your API Key in the settings drawer.');
      return;
    }

    // Append student's text immediately
    const userMessage: ChatMessage = {
      id: `m-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const currentHistory = [...messages, userMessage];
    setMessages(currentHistory);
    setIsLoadingChat(true);

    try {
      // 1. Establish custom system training instruction based on TutorMode
      let teacherPremise = '';
      if (mode === 'tutor') {
        teacherPremise = `You are an expert friendly teacher preparing the student for the Bangladesh Civil Service (BCS) exam. Explain concepts, terms, rules, and historical dates in a highly detailed, clear, and well-structured manner. Use bullet lists to separate subpoints. When teaching Bangladeshi history, vocabulary, or arithmetic, write beautifully.`;
      } else if (mode === 'socratic') {
        teacherPremise = `You are a Socratic coach for the Bangladesh Civil Service (BCS) exam. Instead of lecturing, you must guide the student to discover answers independently on the topic of "${activeTopic.name}". RESPOND CONCISELY with exactly one or two short paragraphs. Wrap up your response with one clear, specific conceptual question to test their understanding.`;
      } else if (mode === 'exam') {
        teacherPremise = `You are a high-yield BCS exam coach. Respond extremely concisely and directly. Focus exclusively on crucial information asked in previous exams: critical years, historic locations, MCQ distribution weights, and memorization mnemonics. Avoid flowery transitions.`;
      }

      // Build context and conversational scope
      const histSegment = currentHistory.slice(-5).map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n');
      const apiPrompt = `Context Subject: "${activeSubject.name}". Study Topic: "${activeTopic.name}".\n\nRecent conversation review:\n${histSegment}\n\nStudent's latest input: "${text}"`;

      const aiReply = await callAI(apiPrompt, apiConfig, teacherPremise);

      const aiMessage: ChatMessage = {
        id: `m-${Date.now()}-ai`,
        role: 'assistant',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...currentHistory, aiMessage]);
    } catch (err: any) {
      triggerToast(`AI error: ${err.message}`);
      setMessages([
        ...currentHistory,
        {
          id: `m-${Date.now()}-err`,
          role: 'assistant',
          content: `⚠️ Failed to get reply. **Root cause:** ${err.message}. Please verify your API Key and internet connection.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // DYNAMIC STUDY ASSET GENERATOR (SUMMARY, CARDS, QUIZZES)
  // ────────────────────────────────────────────────────────
  const handleGenerateMaterial = async (type: 'summary' | 'flashcards' | 'quiz') => {
    if (!curSubjectId || !curTopicId) return;
    const activeSubject = subjects.find((s) => s.id === curSubjectId);
    const activeTopic = activeSubject?.topics.find((t) => t.id === curTopicId);
    if (!activeTopic || !activeSubject) return;

    // Get active subtopic
    const activeSubtopic = activeTopic.subtopics?.find((sub) => sub.id === curSubtopicId) || null;
    const activeLabel = activeSubtopic 
      ? `"${activeSubtopic.name}" (which is a detailed sub-topic within "${activeTopic.name}" syllabus)`
      : `"${activeTopic.name}"`;

    // Check key
    const key = apiConfig.provider === 'gemini' ? apiConfig.geminiKey : apiConfig.openrouterKey;
    if (!key.trim()) {
      setShowConfigDrawer(true);
      triggerToast('⚠️ Please enter your API Key in the settings drawer.');
      return;
    }

    setIsLoadingMaterial(true);
    const matKey = `${curSubjectId}_${curTopicId}_${curSubtopicId || 'main'}`;

    try {
      let prompt = '';
      let instruction = 'You return clean responses without standard introductory lines.';

      if (type === 'summary') {
        prompt = `Write a deep study summary on the topic of ${activeLabel} for the BCS (Bangladesh Civil Service) exam. Split into three distinct sections: '## Core Syllabus Concepts', '### Standard MCQ Angles', '### Fast Facts & Mnemonics'. List important dates, acts, formulas, and associations clearly using bullet parameters. Use **bold** extensively.`;
      } else if (type === 'flashcards') {
        prompt = `Generate exactly 5-6 high-yield active-recall flashcards for the topic of ${activeLabel} appropriate for the BCS (Bangladesh Civil Service) exam. Return ONLY a valid JSON array matching this exact schema: [{"q":"Question here","a":"Short answer explanation"}]. Do not output markdown code identifiers like \`\`\`json or trailing text.`;
      } else if (type === 'quiz') {
        prompt = `Create exactly 5 high-yield Multiple Choice Questions (MCQ) on ${activeLabel} appropriate for the BCS (Bangladesh Civil Service) exam. Each question must include exactly 4 distinct options and clear explanations. Return ONLY a valid JSON array matching this structure: [{"q":"Question text","options":["Opt 1","Opt 2","Opt 3","Opt 4"],"correct":0,"explanation":"Why correct"}]. Do not output any markdown code wrappers or extra text.`;
      }

      const rawResult = await callAI(prompt, apiConfig, instruction);
      const cleaned = cleanJson(rawResult);

      const currentTopicMats = materials[matKey] || {};
      let updatedTopicMats: TopicMaterials = { ...currentTopicMats };

      if (type === 'summary') {
        updatedTopicMats.summary = cleaned;
      } else {
        try {
          const parsed = JSON.parse(cleaned);
          if (type === 'flashcards') {
            updatedTopicMats.flashcards = parsed;
          } else if (type === 'quiz') {
            updatedTopicMats.quiz = parsed;
          }
        } catch (jsonErr) {
          console.error('Failed to parse generation content', cleaned);
          throw new Error('AI returned an invalid JSON dataset. Please click retry to request a clean format.');
        }
      }

      const updatedMaterials = {
        ...materials,
        [matKey]: updatedTopicMats,
      };
      saveMaterials(updatedMaterials);
      triggerToast(`✓ Generated ${type} successfully!`);
    } catch (err: any) {
      alert(`Asset Generation Failed: ${err.message}`);
    } finally {
      setIsLoadingMaterial(false);
    }
  };

  const handleSaveNotes = (notes: string) => {
    if (!curSubjectId || !curTopicId) return;
    const matKey = `${curSubjectId}_${curTopicId}_${curSubtopicId || 'main'}`;
    const currentTopicMats = materials[matKey] || {};
    const updatedMaterials = {
      ...materials,
      [matKey]: {
        ...currentTopicMats,
        notes,
      },
    };
    saveMaterials(updatedMaterials);
  };

  const handleMarkTopicMastered = () => {
    if (!curSubjectId || !curTopicId) return;
    const currentProg = progress[curSubjectId] || {};
    const targetId = curSubtopicId || curTopicId;
    const label = curSubtopicId ? 'Subtopic mastered!' : 'Core topic mastered!';
    const updated = {
      ...progress,
      [curSubjectId]: {
        ...currentProg,
        [targetId]: 'completed' as const,
      },
    };
    saveProgress(updated);
    triggerToast(`🎉 ${label}`);
  };

  // ────────────────────────────────────────────────────────
  // DENSE SUBJECT & TOPIC MANAGEMENT LOGIC
  // ────────────────────────────────────────────────────────
  const handleAddSubject = (name: string, icon: string) => {
    const newSubj: Subject = {
      id: `subj-${Date.now()}`,
      name,
      icon,
      color: '#f59e0b',
      topics: [],
    };
    saveSubjects([...subjects, newSubj]);
    triggerToast('✓ Subject added');
  };

  const handleDeleteSubject = (subjId: string) => {
    const updated = subjects.filter((s) => s.id !== subjId);
    saveSubjects(updated);
    if (curSubjectId === subjId) {
      setCurSubjectId(null);
      setCurTopicId(null);
    }
    // Delete progress & materials associations
    const updatedProgress = { ...progress };
    delete updatedProgress[subjId];
    saveProgress(updatedProgress);
    triggerToast('Subject deleted');
  };

  const handleRenameSubject = (subjId: string, newName: string, newIcon: string) => {
    const updated = subjects.map((s) => (s.id === subjId ? { ...s, name: newName, icon: newIcon } : s));
    saveSubjects(updated);
    triggerToast('✓ Subject modified');
  };

  const handleAddTopic = (subjId: string, topicName: string) => {
    const list = subjects.map((subj) => {
      if (subj.id === subjId) {
        return {
          ...subj,
          topics: [...subj.topics, { id: `topic-${Date.now()}`, name: topicName }],
        };
      }
      return subj;
    });
    saveSubjects(list);
    triggerToast('✓ Topic added');
  };

  const handleDeleteTopic = (subjId: string, topicId: string) => {
    const list = subjects.map((subj) => {
      if (subj.id === subjId) {
        return {
          ...subj,
          topics: subj.topics.filter((t) => t.id !== topicId),
        };
      }
      return subj;
    });
    saveSubjects(list);

    if (curTopicId === topicId) {
      setCurTopicId(null);
    }

    // Delete progress tracking element
    if (progress[subjId]) {
      const upSubjProg = { ...progress[subjId] };
      delete upSubjProg[topicId];
      saveProgress({
        ...progress,
        [subjId]: upSubjProg,
      });
    }
    triggerToast('Topic deleted');
  };

  const handleRenameTopic = (subjId: string, topicId: string, newName: string) => {
    const list = subjects.map((subj) => {
      if (subj.id === subjId) {
        return {
          ...subj,
          topics: subj.topics.map((t) => (t.id === topicId ? { ...t, name: newName } : t)),
        };
      }
      return subj;
    });
    saveSubjects(list);
    triggerToast('✓ Topic renamed');
  };

  const handleCycleStatus = (subjectId: string, topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentSubProj = progress[subjectId] || {};
    const statuses: ('to-read' | 'reading' | 'completed')[] = ['to-read', 'reading', 'completed'];
    const curStatus = currentSubProj[topicId] || 'to-read';
    const nextIdx = (statuses.indexOf(curStatus) + 1) % 3;
    const nextStatus = statuses[nextIdx];

    const updated = {
      ...progress,
      [subjectId]: {
        ...currentSubProj,
        [topicId]: nextStatus,
      },
    };
    saveProgress(updated);
    
    const labelMapping = {
      'to-read': '⬜ Shifted Back to Read list',
      'reading': '🟠 Marked as Active Reading',
      'completed': '✅ Mastered & Completed!',
    };
    triggerToast(labelMapping[nextStatus]);
  };

  const handleImportBulk = (data: { name: string; icon: string; topics: string[] }[]) => {
    const importedSubjects: Subject[] = data.map((item) => ({
      id: `subj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: item.name,
      icon: item.icon,
      color: '#3b82f6',
      topics: item.topics.map((t, idx) => ({
        id: `topic-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        name: t,
      })),
    }));
    saveSubjects([...subjects, ...importedSubjects]);
    triggerToast('✓ Bulk Import successful!');
  };

  const handleAddSubtopic = (subjId: string, topicId: string, name: string) => {
    const list = subjects.map((subj) => {
      if (subj.id === subjId) {
        return {
          ...subj,
          topics: subj.topics.map((t) => {
            if (t.id === topicId) {
              const currentSubtopics = t.subtopics || [];
              const subId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              return {
                ...t,
                subtopics: [...currentSubtopics, { id: subId, name }],
              };
            }
            return t;
          }),
        };
      }
      return subj;
    });
    saveSubjects(list);
    triggerToast('✓ Subtopic added');
  };

  const handleDeleteSubtopic = (subjId: string, topicId: string, subId: string) => {
    const list = subjects.map((subj) => {
      if (subj.id === subjId) {
        return {
          ...subj,
          topics: subj.topics.map((t) => {
            if (t.id === topicId) {
              const currentSubtopics = t.subtopics || [];
              return {
                ...t,
                subtopics: currentSubtopics.filter((sub) => sub.id !== subId),
              };
            }
            return t;
          }),
        };
      }
      return subj;
    });
    saveSubjects(list);
    
    if (curSubtopicId === subId) {
      setCurSubtopicId(null);
    }
    triggerToast('Subtopic deleted');
  };

  const handleRenameSubtopic = (subjId: string, topicId: string, subId: string, newName: string) => {
    const list = subjects.map((subj) => {
      if (subj.id === subjId) {
        return {
          ...subj,
          topics: subj.topics.map((t) => {
            if (t.id === topicId) {
              const currentSubtopics = t.subtopics || [];
              return {
                ...t,
                subtopics: currentSubtopics.map((sub) => (sub.id === subId ? { ...sub, name: newName } : sub)),
              };
            }
            return t;
          }),
        };
      }
      return subj;
    });
    saveSubjects(list);
    triggerToast('✓ Subtopic modified');
  };

  const handleBulkImportSubtopics = (subjId: string, topicId: string, text: string) => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const list = subjects.map((subj) => {
      if (subj.id === subjId) {
        return {
          ...subj,
          topics: subj.topics.map((t) => {
            if (t.id === topicId) {
              const currentSubtopics = t.subtopics || [];
              const rawSubtopics = lines.map((line, idx) => ({
                id: `sub-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
                name: line,
              }));
              return {
                ...t,
                subtopics: [...currentSubtopics, ...rawSubtopics],
              };
            }
            return t;
          }),
        };
      }
      return subj;
    });
    saveSubjects(list);
    triggerToast('✓ Bulk Import successful!');
  };

  const handleSaveExamDate = (val: string) => {
    if (!val) {
      setExamDate(null);
      localStorage.removeItem('bcs_exam_date');
      return;
    }
    const d = parseDateString(val);
    if (d) {
      setExamDate(d);
      localStorage.setItem('bcs_exam_date', d.toISOString());
      triggerToast('⏱ Set target date!');
    } else {
      triggerToast('❌ Invalid format! Use DD:MM:YYYY');
    }
  };

  // ────────────────────────────────────────────────────────
  // DUAL API CONFIG UTILITY CLEANERS
  // ────────────────────────────────────────────────────────
  const cleanJson = (raw: string): string => {
    let result = raw.trim();
    if (result.startsWith('```')) {
      result = result.replace(/^```(json)?\n?/i, '');
    }
    if (result.endsWith('```')) {
      result = result.slice(0, -3);
    }
    return result.trim();
  };

  const formatStopwatchTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    return [
      String(hrs).padStart(2, '0'),
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].join(':');
  };

  const updateApiConfigSetting = (updates: Partial<ApiConfig>) => {
    const updated = { ...apiConfig, ...updates };
    setApiConfig(updated);
    localStorage.setItem('bcs_api_config', JSON.stringify(updated));
  };

  const activeSubject = subjects.find((s) => s.id === curSubjectId) || null;
  const activeTopic = activeSubject?.topics.find((t) => t.id === curTopicId) || null;
  const activeSubtopic = activeTopic?.subtopics?.find((sub) => sub.id === curSubtopicId) || null;
  
  const activeTopicMats = curSubjectId && curTopicId 
    ? materials[`${curSubjectId}_${curTopicId}_${curSubtopicId || 'main'}`] 
    : undefined;

  return (
    <div className="flex flex-col h-screen text-slate-100 font-sans overflow-hidden bg-[#0d121f]">
      {/* ── TOP NAV BAR HEADER ── */}
      <header className="h-14 shrink-0 bg-[#111827] border-b border-[#1f2937] flex items-center justify-between px-4 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMobileLeft(!showMobileLeft)}
            className="md:hidden p-1.5 rounded-lg border border-[#374151] hover:bg-[#1f2937] text-slate-400 hover:text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 font-sans leading-none">
            <span className="text-xl">🎓</span> BCS Study Hub <span className="text-[10px] bg-blue-500/10 text-blue-400 font-semibold px-1.5 py-0.5 rounded leading-none">v3.0</span>
          </h1>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-3">
          {/* Co-Study Live Synced Stopwatch */}
          <div className="flex items-center gap-1 bg-[#1e293b]/95 border border-[#374151]/80 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md">
            <span className="flex items-center gap-1.5 font-mono text-emerald-400 select-none">
              <Timer className={`w-3.5 h-3.5 ${stopwatch.isRunning ? 'animate-spin' : ''}`} />
              <span className="leading-none text-[13px]">{formatStopwatchTime(displaySeconds)}</span>
            </span>
            <div className="flex items-center gap-1 ml-1.5 sm:ml-2 pl-1.5 sm:pl-2 border-l border-[#374151]/80">
              {stopwatch.isRunning ? (
                <button
                  onClick={handlePauseStopwatch}
                  title="Pause co-study session (Syncs live)"
                  className="p-1 hover:bg-slate-700/60 text-amber-400 hover:text-amber-300 rounded cursor-pointer transition active:scale-95"
                >
                  <Pause className="w-3.5 h-3.5 fill-amber-400/20" />
                </button>
              ) : (
                <button
                  onClick={handleStartStopwatch}
                  title="Start co-study session (Syncs live)"
                  className="p-1 hover:bg-slate-700/60 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer transition active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-emerald-400/20" />
                </button>
              )}
              <button
                onClick={handleResetStopwatch}
                title="Reset session timer (Syncs live)"
                className="p-1 hover:bg-slate-700/60 text-slate-400 hover:text-white rounded cursor-pointer transition active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
            {syncCode && (
              <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-400 px-1 py-0.5 rounded uppercase tracking-wider ml-1 hover:scale-105 transition-transform duration-200 hidden xl:inline">Live</span>
            )}
          </div>

          {/* Calendar countdown deadline settings */}
          <div
            onClick={() => {
              const input = prompt(
                'Set your BCS Exam Date (Format: DD:MM:YYYY):',
                examDate ? formatDateString(examDate) : ''
              );
              if (input !== null) handleSaveExamDate(input);
            }}
            title="Syllabus target countdown deadline"
            className="flex items-center gap-1.5 bg-[#1f2937]/80 hover:bg-[#1f2937] px-3 py-1.5 rounded-xl border border-[#374151]/60 text-xs font-semibold font-mono text-slate-300 transition cursor-pointer select-none"
          >
            <Timer className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mr-0.5 sm:inline hidden">Timeline:</span>
            <span className="text-blue-300">
              {examDate ? `${formatDateString(examDate)} (${countdownText})` : countdownText}
            </span>
          </div>

          {/* Quick config settings launcher button */}
          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#374151]/60 bg-[#1f2937]/80 hover:bg-[#1f2937] cursor-pointer text-xs font-semibold text-slate-300 transition-all shadow-md"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="sm:inline hidden">Settings</span>
          </button>

          {/* Dynamic multi-tab selector toggle */}
          <button
            onClick={() => setShowMobileRight(!showMobileRight)}
            className="md:hidden px-3 py-1.5 flex items-center gap-1.5 rounded-xl border border-[#374151]/60 bg-[#1f2937]/80 text-xs text-slate-300 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Study Lab</span>
          </button>
        </div>
      </header>

      {/* ── CORE WORKSPACE PANES ── */}
      <div id="contentWorkspaceGrid" className="flex-1 flex overflow-hidden relative">
        {/* LEFT WORKSPACE PANELS */}
        <div
          className={`shrink-0 w-[285px] h-full absolute md:static z-20 transition-all ${
            showMobileLeft ? 'left-0' : '-left-[300px]'
          } md:translate-x-0`}
        >
          <Sidebar
            subjects={subjects}
            curSubjectId={curSubjectId}
            curTopicId={curTopicId}
            curSubtopicId={curSubtopicId}
            progress={progress}
            onSelectTopic={handleSelectTopic}
            onCycleStatus={handleCycleStatus}
            onAddSubject={handleAddSubject}
            onDeleteSubject={handleDeleteSubject}
            onRenameSubject={handleRenameSubject}
            onAddTopic={handleAddTopic}
            onDeleteTopic={handleDeleteTopic}
            onRenameTopic={handleRenameTopic}
            onImportBulk={handleImportBulk}
            
            // Subtopics support
            onAddSubtopic={handleAddSubtopic}
            onDeleteSubtopic={handleDeleteSubtopic}
            onRenameSubtopic={handleRenameSubtopic}
            onBulkImportSubtopics={handleBulkImportSubtopics}
          />
        </div>

        {/* MIDDLE CHAT WORKSPACE PLATES */}
        <div className="flex-1 h-full min-w-0">
          <ChatPanel
            activeSubject={activeSubject}
            activeTopic={activeTopic}
            messages={messages}
            mode={mode}
            onChangeMode={setMode}
            isLoading={isLoadingChat}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* RIGHT drawer materials summary lab */}
        <div
          className={`shrink-0 w-[310px] h-full absolute right-0 md:static z-20 transition-all ${
            showMobileRight ? 'translate-x-0' : 'translate-x-[320px]'
          } md:translate-x-0`}
        >
          <RightPanel
            activeSubject={activeSubject}
            activeTopic={activeTopic}
            activeSubtopic={activeSubtopic}
            materials={activeTopicMats}
            isLoading={isLoadingMaterial}
            onGenerateMaterial={handleGenerateMaterial}
            onSaveNotes={handleSaveNotes}
            onMarkTopicMastered={handleMarkTopicMastered}
          />
        </div>

        {/* Dark responsive overlay mask in phone size */}
        {(showMobileLeft || showMobileRight) && (
          <div
            onClick={() => {
              setShowMobileLeft(false);
              setShowMobileRight(false);
            }}
            className="fixed inset-0 bg-black/65 z-10 md:hidden"
          />
        )}
      </div>

      {/* ── API KEY SETTINGS SLIDE DRAWER ── */}
      {showConfigDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay key drawer closer */}
          <div
            onClick={() => setShowConfigDrawer(false)}
            className="absolute inset-0 bg-black/60 transition-opacity"
          />

          {/* Settings Frame container */}
          <div className="w-full max-w-sm h-full bg-[#182235] border-l border-[#1f2937] shadow-2xl relative z-20 flex flex-col p-5 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#1f2937]/80 pb-3 mb-4 select-none">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-400" /> Settings Panel
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-widest">Client Credentials</p>
              </div>
              <button
                onClick={() => setShowConfigDrawer(false)}
                className="text-[#94a3b8] hover:text-white font-bold text-lg p-1.5 transition-colors"
                id="closeConfigDrawerBtn"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#111827] rounded-xl p-3 border border-[#374151]/30">
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Choose your preferred model provider below. Both setups function entirely in the browser, offering a completely static, serverless deployment perfect for hosting free on platforms like **GitHub** or **Cloudflare Pages** with zero backend infrastructure.
                </p>
              </div>

              {/* Provider selector bar */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Model Provider</label>
                <div className="grid grid-cols-2 gap-2 bg-[#111827] p-1 rounded-xl border border-[#374151]/50">
                  <button
                    onClick={() => updateApiConfigSetting({ provider: 'gemini' })}
                    className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      apiConfig.provider === 'gemini'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Google Gemini API
                  </button>
                  <button
                    onClick={() => updateApiConfigSetting({ provider: 'openrouter' })}
                    className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      apiConfig.provider === 'openrouter'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    OpenRouter API
                  </button>
                </div>
              </div>

              {/* DYNAMIC FORMS SECTION */}
              {apiConfig.provider === 'gemini' ? (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/5 rounded-lg border border-blue-500/20 text-[10px] text-blue-300 leading-normal">
                    💡 **Supports modern Google API Keys (both standard "AIzaSy..." AND custom enterprise "AQ..." keys)** directly. App query operations pass credentials securely over direct HTTP fetch parameters mapping wildcards correctly.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Gemini API Key</label>
                    <input
                      type="password"
                      value={apiConfig.geminiKey}
                      onChange={(e) => updateApiConfigSetting({ geminiKey: e.target.value })}
                      placeholder="AIzaSy... or AQ..."
                      autoComplete="off"
                      className="w-full bg-[#111827] border border-[#374151] focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Selected Gemini Model</label>
                    <select
                      value={apiConfig.geminiModel}
                      onChange={(e) => updateApiConfigSetting({ geminiModel: e.target.value })}
                      className="w-full bg-[#111827] border border-[#374151] rounded-xl p-2.5 text-xs text-slate-100 outline-none"
                    >
                      <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended Fast)</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (Aesthetic Detailed)</option>
                      <option value="gemini-2.0-flash">gemini-2.0-flash (Experimental)</option>
                      <option value="gemini-1.5-flash">gemini-1.5-flash (Fallback)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">OpenRouter Key</label>
                    <input
                      type="password"
                      value={apiConfig.openrouterKey}
                      onChange={(e) => updateApiConfigSetting({ openrouterKey: e.target.value })}
                      placeholder="sk-or-..."
                      autoComplete="off"
                      className="w-full bg-[#111827] border border-[#374151] focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Selected Model</label>
                    <select
                      value={apiConfig.openrouterModel}
                      onChange={(e) => updateApiConfigSetting({ openrouterModel: e.target.value })}
                      className="w-full bg-[#111827] border border-[#374151] rounded-xl p-2.5 text-xs text-slate-100 outline-none"
                    >
                      <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B Instruct (Free)</option>
                      <option value="google/gemma-2-9b-it:free">Gemma 2 9B IT (Free)</option>
                      <option value="qwen/qwen-2.5-7b-instruct:free">Qwen 2.5 7B (Free)</option>
                      <option value="mistralai/mistral-7b-instruct:free">Mistral 7B Instruct (Free)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* ── DATA PORTABILITY & CLOUD SYNC ── */}
            <div className="border-t border-[#1f2937]/80 pt-4 mt-4 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-sans">
                  <Cloud className="w-4 h-4 text-emerald-400" /> Cloud Sync & Backups
                </h4>
                <p className="text-[10px] text-slate-500 leading-normal font-sans">
                  Synchronize your custom syllabus, AI study notes, flashcards, and exam progress securely to Cloudflare D1's SQL Database.
                </p>
              </div>

              {/* Cloud Sync Core */}
              <div className="space-y-3 bg-[#111827] p-3 rounded-xl border border-[#374151]/40">
                {syncCode && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-[10px] text-emerald-400 leading-normal animate-pulse">
                     ⚡ **Live Multi-Device sync active!** Any changes to progress checkboxes, subjects, custom dates, or the live study stopwatch will sync to other devices instantly in the background.
                  </div>
                )}
                
                {/* Generate / push button */}
                <div>
                  <button
                    onClick={handlePushToCloud}
                    disabled={isSyncing}
                    className="w-full py-2 bg-gradient-to-r from-blue-600/90 to-indigo-600/95 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 font-sans"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Secure Backup Study Plan'}
                  </button>
                </div>

                {/* Returned secure code box */}
                {syncCode && (
                  <div className="p-2 bg-[#1e293b] border border-blue-500/20 rounded-lg flex items-center justify-between text-xs font-semibold animate-in zoom-in-95 duration-150 font-sans">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider">Share/Retrieve Key:</span>
                      <span className="font-mono text-blue-300 select-all">{syncCode}</span>
                    </div>
                    <button
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(syncCode);
                          triggerToast('✓ Key Copied!');
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        } catch (err) {}
                      }}
                      className="px-2 py-1 bg-slate-800 text-[10px] text-slate-300 border border-slate-700 hover:bg-slate-700/80 rounded transition cursor-pointer font-sans font-semibold"
                    >
                      {copiedCode ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}

                {/* Retrieve block */}
                <div className="border-t border-[#1f2937]/50 pt-2.5">
                  <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider font-sans">Retrieve backup via key</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={inputSyncCode}
                      onChange={(e) => setInputSyncCode(e.target.value)}
                      placeholder="Paste 10-char security key"
                      className="flex-1 bg-slate-900/90 border border-slate-700/50 focus:border-blue-500 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono outline-none"
                    />
                    <button
                      onClick={handlePullFromCloud}
                      disabled={isSyncing}
                      className="px-3 bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 border border-slate-700/80 hover:text-white rounded-lg text-xs font-semibold transition active:scale-[0.98] cursor-pointer font-sans"
                    >
                      Retrieve
                    </button>
                  </div>
                </div>
              </div>

              {/* Local JSON Files Option */}
              <div>
                <span className="block text-[9px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider font-sans">Alternative: Offline Backup File</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportData}
                    className="py-2.5 px-3 bg-[#1e293b]/70 hover:bg-[#1e293b] hover:text-slate-100 border border-[#334155]/60 rounded-xl text-xs font-semibold text-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    Export File
                  </button>
                  
                  <label className="py-2.5 px-3 bg-[#1e293b]/70 hover:bg-[#1e293b] hover:text-slate-100 border border-[#334155]/60 rounded-xl text-xs font-semibold text-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer text-center relative overflow-hidden font-sans">
                    <Upload className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    Import File
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto"
                    />
                  </label>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-6 mb-4 border-t border-[#1f2937]/50 pt-4 font-sans">
              🛡️ **Client Privacy Pledge:** Your private keys are stored absolutely inside your browser's private web container local cache via secure `localStorage` API. They are never sent to any centralized servers or collected by third parties.
            </p>

            <button
              onClick={() => setShowConfigDrawer(false)}
              className="mt-auto w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg active:scale-95 cursor-pointer font-sans"
            >
              ✓ Close & Apply Save
            </button>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION CONTAINER ── */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700/60 p-2 px-4 rounded-full text-slate-100 text-xs font-bold shadow-2xl z-50 animate-in slide-in-from-bottom-5 duration-100 uppercase tracking-wide">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
