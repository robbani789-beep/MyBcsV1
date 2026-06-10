import React, { useState } from 'react';
import { Subject, Topic, ProgressState, TopicStatus } from '../types';
import { BookOpen, Check, Trash2, Edit2, Plus, ChevronRight, ChevronDown, Award, ListPlus } from 'lucide-react';

interface SidebarProps {
  subjects: Subject[];
  curSubjectId: string | null;
  curTopicId: string | null;
  curSubtopicId: string | null;
  progress: ProgressState;
  onSelectTopic: (subjectId: string, topicId: string, subtopicId: string | null) => void;
  onCycleStatus: (subjectId: string, topicId: string, e: React.MouseEvent) => void;
  onAddSubject: (name: string, icon: string) => void;
  onDeleteSubject: (subjectId: string) => void;
  onRenameSubject: (subjectId: string, newName: string, newIcon: string) => void;
  onAddTopic: (subjectId: string, topicName: string) => void;
  onDeleteTopic: (subjectId: string, topicId: string) => void;
  onRenameTopic: (subjectId: string, topicId: string, newName: string) => void;
  onImportBulk: (data: { name: string; icon: string; topics: string[] }[]) => void;
  
  // Subtopic Actions
  onAddSubtopic: (subjId: string, topicId: string, name: string) => void;
  onDeleteSubtopic: (subjId: string, topicId: string, subId: string) => void;
  onRenameSubtopic: (subjId: string, topicId: string, subId: string, newName: string) => void;
  onBulkImportSubtopics: (subjId: string, topicId: string, text: string) => void;
}

export default function Sidebar({
  subjects,
  curSubjectId,
  curTopicId,
  curSubtopicId,
  progress,
  onSelectTopic,
  onCycleStatus,
  onAddSubject,
  onDeleteSubject,
  onRenameSubject,
  onAddTopic,
  onDeleteTopic,
  onRenameTopic,
  onImportBulk,
  onAddSubtopic,
  onDeleteSubtopic,
  onRenameSubtopic,
  onBulkImportSubtopics,
}: SidebarProps) {
  // Local state for modals & interactions
  const [expandedSubjId, setExpandedSubjId] = useState<string | null>(subjects[0]?.id || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<'single' | 'bulk'>('single');
  
  // Single Add Forms
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjIcon, setNewSubjIcon] = useState('📚');
  const [newSubjInitialTopic, setNewSubjInitialTopic] = useState('');

  // Bulk Import Forms
  const [bulkJson, setBulkJson] = useState('');
  const [bulkCsv, setBulkCsv] = useState('');

  // Rename Subject Modal State
  const [editSubject, setEditSubject] = useState<{ id: string; name: string; icon: string } | null>(null);

  // Add Topic Inline State
  const [addingTopicForSubj, setAddingTopicForSubj] = useState<string | null>(null);
  const [inlineTopicName, setInlineTopicName] = useState('');

  // Inline Topic Rename State
  const [renameTopicKey, setRenameTopicKey] = useState<{ subjId: string; topicId: string } | null>(null);
  const [inlineRenameText, setInlineRenameText] = useState('');

  // Subtopic Management Modal State
  const [managingSubtopicsFor, setManagingSubtopicsFor] = useState<{ subjId: string; topic: Topic } | null>(null);
  const [newSubtopicName, setNewSubtopicName] = useState('');
  const [subtopicBulkText, setSubtopicBulkText] = useState('');

  // Compute overall progress metrics
  let totalTopicsCount = 0;
  let completedTopicsCount = 0;

  subjects.forEach((subj) => {
    const subjProgress = progress[subj.id] || {};
    subj.topics.forEach((t) => {
      totalTopicsCount++;
      const isCompleted = t.subtopics && t.subtopics.length > 0
        ? t.subtopics.every(sub => subjProgress[sub.id] === 'completed')
        : subjProgress[t.id] === 'completed';
      
      if (isCompleted) {
        completedTopicsCount++;
      }
    });
  });

  const overallPercent = totalTopicsCount
    ? Math.round((completedTopicsCount / totalTopicsCount) * 100)
    : 0;

  // Compute single subject progress meter
  const getSubjectProgress = (subj: Subject) => {
    const p = progress[subj.id] || {};
    let done = 0;
    subj.topics.forEach((t) => {
      const isCompleted = t.subtopics && t.subtopics.length > 0
        ? t.subtopics.every(sub => p[sub.id] === 'completed')
        : p[t.id] === 'completed';
      if (isCompleted) done++;
    });
    return {
      done,
      total: subj.topics.length,
      percent: subj.topics.length ? Math.round((done / subj.topics.length) * 100) : 0,
    };
  };

  const handleToggleSubject = (id: string) => {
    setExpandedSubjId(prev => (prev === id ? null : id));
  };

  const handleOpenAddModal = () => {
    setNewSubjName('');
    setNewSubjIcon('📚');
    setNewSubjInitialTopic('');
    setBulkJson('');
    setBulkCsv('');
    setAddTab('single');
    setShowAddModal(true);
  };

  const handleSingleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;
    onAddSubject(newSubjName.trim(), newSubjIcon.trim());
    
    // Add initial topic if filled
    if (newSubjInitialTopic.trim()) {
      // Find the subject we just added or we assume the newly generated one is accessible in state next
      // We will let App.tsx handle adding subject, and if they put an initial topic we can trigger both or do it cleanly
      // To bypass state latency, we delegate logic up
    }
    
    setShowAddModal(false);
  };

  const handleBulkImportSubmit = () => {
    try {
      if (bulkJson.trim()) {
        const parsed = JSON.parse(bulkJson);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const formatted = list.map((item: any) => ({
          name: String(item.name || ''),
          icon: String(item.icon || '📚'),
          topics: Array.isArray(item.topics) ? item.topics.map(String) : [],
        })).filter(item => item.name);
        if (formatted.length) {
          onImportBulk(formatted);
          setShowAddModal(false);
        }
      } else if (bulkCsv.trim()) {
        const lines = bulkCsv.split('\n').filter(l => l.trim());
        const formatted = lines.map(line => {
          const parts = line.split(',');
          const name = parts[0]?.trim();
          const icon = parts[1]?.trim() || '📚';
          const topicStr = parts.slice(2).join(',');
          const topics = topicStr ? topicStr.split('|').map(t => t.trim()).filter(Boolean) : [];
          return { name, icon, topics };
        }).filter(item => item.name);
        
        if (formatted.length) {
          onImportBulk(formatted);
          setShowAddModal(false);
        }
      }
    } catch (err: any) {
      alert('Failed to parse input. Please check JSON format correctness: ' + err.message);
    }
  };

  return (
    <div id="sidebarContainer" className="flex flex-col h-full bg-[#111827] border-r border-[#1f2937] overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#1f2937] shrink-0 bg-[#171f30]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Study Topics</h2>
          </div>
          <button
            id="openAddSubjectBtn"
            onClick={handleOpenAddModal}
            className="px-2 py-1 flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-400 text-xs font-medium cursor-pointer transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Subject
          </button>
        </div>

        {/* Overall progress visualizer */}
        <div id="overallProgressBlock" className="bg-[#1f2937]/50 rounded-xl p-3 border border-[#374151]/50 shadow-inner">
          <div className="flex justify-between items-center mb-1 text-xs">
            <span className="text-slate-400 font-medium">Exam Preparedness</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Award className="w-3.5 h-3.5 inline" /> {overallPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#111827] rounded-full overflow-hidden">
            <div
              id="overallProgressFill"
              style={{ width: `${overallPercent}%` }}
              className="h-full bg-gradient-to-r from-blue-500 via-[#10b981] to-emerald-400 rounded-full transition-all duration-500"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            {completedTopicsCount} of {totalTopicsCount} topics mastered ({totalTopicsCount - completedTopicsCount} remaining)
          </p>
        </div>
      </div>

      {/* Accordion list of subjects & topics */}
      <div id="subjectList" className="flex-1 overflow-y-auto p-2 space-y-2 select-none min-h-0">
        {subjects.map((subj) => {
          const isExpanded = expandedSubjId === subj.id;
          const { done, total, percent } = getSubjectProgress(subj);

          return (
            <div
              key={subj.id}
              className={`rounded-xl border transition-all duration-300 ${
                isExpanded ? 'bg-[#182235]/65 border-blue-500/20' : 'bg-[#182235]/30 border-transparent hover:border-[#1f2937]'
              }`}
            >
              {/* Subject Row Accordion Trigger */}
              <div
                className="p-3 flex items-center justify-between cursor-pointer group rounded-xl hover:bg-[#1f2937]/35"
                onClick={() => handleToggleSubject(subj.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    style={{ backgroundColor: `${subj.color}15`, color: subj.color }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 border border-white/5"
                  >
                    {subj.icon || '📚'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-100 truncate group-hover:text-blue-300 transition-colors">
                      {subj.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-500 shrink-0 font-medium">Progress:</span>
                      <div className="flex-1 h-1.5 bg-[#111827] rounded-full overflow-hidden max-w-[80px]">
                        <div
                          style={{ width: `${percent}%`, backgroundColor: subj.color }}
                          className="h-full rounded-full transition-all duration-300"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 font-semibold">{percent}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-2">
                  {/* Plus Topic icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingTopicForSubj(subj.id);
                      setInlineTopicName('');
                      setExpandedSubjId(subj.id);
                    }}
                    title="Add Topic"
                    className="p-1 rounded bg-[#1f2937] border border-[#374151] text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Settings / Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditSubject({ id: subj.id, name: subj.name, icon: subj.icon });
                    }}
                    title="Edit Subject"
                    className="p-1 rounded bg-[#1f2937] border border-[#374151] text-xs text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete subject "${subj.name}" and all of its ${subj.topics.length} topics permanently?`)) {
                        onDeleteSubject(subj.id);
                      }
                    }}
                    title="Delete Subject"
                    className="p-1 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400 hover:text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Arrow indicator */}
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </div>
              </div>

              {/* Subject Content: Topics List */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-[#1f2937]/50 space-y-1">
                  {/* Inline Add Topic Box */}
                  {addingTopicForSubj === subj.id && (
                    <div className="flex items-center gap-1.5 p-1 bg-[#111827]/60 rounded-lg border border-blue-500/40 my-1">
                      <input
                        type="text"
                        value={inlineTopicName}
                        onChange={(e) => setInlineTopicName(e.target.value)}
                        placeholder="New topic name..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (inlineTopicName.trim()) {
                              onAddTopic(subj.id, inlineTopicName.trim());
                              setAddingTopicForSubj(null);
                            }
                          } else if (e.key === 'Escape') {
                            setAddingTopicForSubj(null);
                          }
                        }}
                        className="flex-1 min-w-0 bg-transparent text-xs text-slate-100 outline-none px-1 py-0.5 font-medium"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (inlineTopicName.trim()) {
                            onAddTopic(subj.id, inlineTopicName.trim());
                            setAddingTopicForSubj(null);
                          }
                        }}
                        className="p-1 bg-[#10b981] hover:bg-emerald-600 rounded text-white text-[10px]"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setAddingTopicForSubj(null)}
                        className="p-1 bg-[#374151] hover:bg-slate-600 rounded text-slate-300 text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Topic Items list */}
                  {subj.topics.length === 0 ? (
                    <div className="p-3 text-center rounded-lg border border-dashed border-[#1f2937] bg-black/10 my-1">
                      <p className="text-[11px] text-slate-500">No topics added yet.</p>
                      <button
                        onClick={() => {
                          setAddingTopicForSubj(subj.id);
                          setInlineTopicName('');
                        }}
                        className="mt-1 text-[10px] text-blue-400 font-semibold hover:underline"
                      >
                        ＋ Create first topic
                      </button>
                    </div>
                  ) : (
                    subj.topics.map((topic) => {
                      const isActive = curSubjectId === subj.id && curTopicId === topic.id;
                      const hasProg = progress[subj.id] || {};
                      const status: TopicStatus = hasProg[topic.id] || 'to-read';

                      const statusColors = {
                        'to-read': 'bg-[#27272a] border-[#52525b] hover:bg-[#3f3f46]',
                        'reading': 'bg-[#ca8a04] border-[#eab308] shadow-[0_0_5px_rgba(234,179,8,0.4)]',
                        'completed': 'bg-emerald-600 border-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.4)]',
                      };

                      const statusLabels = {
                        'to-read': 'To Read',
                        'reading': 'Reading Now',
                        'completed': 'Mastered (Quiz Pass)',
                      };

                      const isEditingTopic =
                        renameTopicKey?.subjId === subj.id && renameTopicKey?.topicId === topic.id;

                      const subtopicsList = topic.subtopics || [];

                      return (
                        <div key={topic.id} className="space-y-1">
                          {/* Topic Card Container */}
                          <div
                            onClick={() => onSelectTopic(subj.id, topic.id, null)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer group/topic transition-all relative ${
                              isActive && !curSubtopicId
                                ? 'bg-blue-500/12 border border-blue-500/25 shadow-inner'
                                : 'bg-black/8 border border-transparent hover:bg-[#1f2937]/35'
                            }`}
                          >
                            {/* Circular Status Indicator */}
                            <div
                              onClick={(e) => onCycleStatus(subj.id, topic.id, e)}
                              title={`Status: ${statusLabels[status]} (Click to toggle)`}
                              className={`w-3 h-3 rounded-full border-1.5 shrink-0 transition-transform hover:scale-125 duration-150 ${statusColors[status]}`}
                            />

                            {/* Editable Rename field or Simple Text Label */}
                            {isEditingTopic ? (
                              <input
                                type="text"
                                value={inlineRenameText}
                                onChange={(e) => setInlineRenameText(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => {
                                  if (inlineRenameText.trim()) {
                                    onRenameTopic(subj.id, topic.id, inlineRenameText.trim());
                                  }
                                  setRenameTopicKey(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (inlineRenameText.trim()) {
                                      onRenameTopic(subj.id, topic.id, inlineRenameText.trim());
                                    }
                                    setRenameTopicKey(null);
                                  } else if (e.key === 'Escape') {
                                    setRenameTopicKey(null);
                                  }
                                }}
                                className="flex-1 min-w-0 bg-[#0f172a] text-xs text-slate-100 rounded px-1 outline-none border border-blue-500"
                                autoComplete="off"
                                autoFocus
                              />
                            ) : (
                              <span
                                className={`text-xs truncate flex-1 leading-5 ${
                                  isActive && !curSubtopicId ? 'text-blue-300 font-semibold' : 'text-slate-300 font-medium group-hover/topic:text-slate-200'
                                }`}
                              >
                                {topic.name}
                                {subtopicsList.length > 0 && (
                                  <span className="text-[9px] text-slate-500 ml-1.5 font-normal">
                                    ({subtopicsList.filter(sub => (progress[subj.id] || {})[sub.id] === 'completed').length}/{subtopicsList.length})
                                  </span>
                                )}
                              </span>
                            )}

                            {/* Topic Action buttons (Rename, Delete, Manage Subtopics) visible on hover */}
                            {!isEditingTopic && (
                              <div className="opacity-0 group-hover/topic:opacity-100 flex items-center gap-1 transition-opacity shrink-0 ml-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManagingSubtopicsFor({ subjId: subj.id, topic });
                                  }}
                                  title="Manage & Bulk Import Subtopics"
                                  className="p-0.5 rounded text-blue-400 hover:text-white hover:bg-slate-705 text-[10px]"
                                >
                                  <ListPlus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRenameTopicKey({ subjId: subj.id, topicId: topic.id });
                                    setInlineRenameText(topic.name);
                                  }}
                                  title="Rename Topic"
                                  className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-707 text-[10px]"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete topic "${topic.name}" permanently?`)) {
                                      onDeleteTopic(subj.id, topic.id);
                                    }
                                  }}
                                  title="Delete Topic"
                                  className="p-0.5 rounded text-red-400 hover:text-white hover:bg-red-600/20 text-[10px]"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Subtopics Checklist list */}
                          {subtopicsList.length > 0 && (
                            <div className="pl-4 space-y-1.5 my-1 border-l border-slate-700/60 ml-4 pb-1">
                              {subtopicsList.map((sub) => {
                                const isSubActive = curSubjectId === subj.id && curTopicId === topic.id && curSubtopicId === sub.id;
                                const subStatus = (progress[subj.id] || {})[sub.id] || 'to-read';

                                const subStatusColors = {
                                  'to-read': 'bg-[#27272a] border-[#52525b]',
                                  'reading': 'bg-[#ca8a04] border-[#eab308]',
                                  'completed': 'bg-emerald-600 border-emerald-400',
                                };

                                return (
                                  <div
                                    key={sub.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectTopic(subj.id, topic.id, sub.id);
                                    }}
                                    className={`flex items-center justify-between gap-2 px-2 py-0.5 rounded-lg cursor-pointer group/sub transition-all relative ${
                                      isSubActive
                                        ? 'bg-[#3b82f6]/10 text-blue-300 font-semibold'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2937]/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const statuses: ('to-read' | 'reading' | 'completed')[] = ['to-read', 'reading', 'completed'];
                                          const nextIdx = (statuses.indexOf(subStatus) + 1) % 3;
                                          onCycleStatus(subj.id, sub.id, e);
                                        }}
                                        title={`Status: ${subStatus} (Click to toggle)`}
                                        className={`w-2 h-2 rounded-full border shrink-0 transition-transform hover:scale-125 ${subStatusColors[subStatus]}`}
                                      />
                                      <span className="text-[11px] truncate leading-normal">{sub.name}</span>
                                    </div>

                                    {/* Action items */}
                                    <div className="opacity-0 group-hover/sub:opacity-100 flex items-center shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onCycleStatus(subj.id, sub.id, e);
                                        }}
                                        title="Cycle Status"
                                        className="p-0.5 rounded text-slate-500 hover:text-slate-300 transition"
                                      >
                                        <Check className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Add Topic Inline footer quick launcher */}
                  {addingTopicForSubj !== subj.id && (
                    <button
                      onClick={() => {
                        setAddingTopicForSubj(subj.id);
                        setInlineTopicName('');
                      }}
                      className="w-full mt-2 py-1 flex items-center justify-center gap-1 rounded-lg border border-dashed border-[#1f2937] hover:border-blue-500/40 text-slate-400 hover:text-blue-300 text-[11px] font-medium transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Topic
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EXPORT SUBJECTS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-[#182235] border border-[#1f2937] rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1f2937] flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-100">Create / Import Subjects</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Settings Switch Tab */}
            <div className="px-4 pt-4 flex gap-2 shrink-0">
              <button
                onClick={() => setAddTab('single')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  addTab === 'single'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                    : 'bg-transparent border-[#374151] text-slate-400 hover:text-white'
                }`}
              >
                Single Creator
              </button>
              <button
                onClick={() => setAddTab('bulk')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  addTab === 'bulk'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                    : 'bg-transparent border-[#374151] text-slate-400 hover:text-white'
                }`}
              >
                Bulk Import (JSON / CSV)
              </button>
            </div>

            {/* Modal Dynamic Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {addTab === 'single' ? (
                <form onSubmit={handleSingleAddSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Subject Name *</label>
                    <input
                      type="text"
                      required
                      value={newSubjName}
                      onChange={(e) => setNewSubjName(e.target.value)}
                      placeholder="e.g., Computer Science & IT"
                      className="w-full bg-[#111827] border border-[#374151] focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 outline-none transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Icon / Emoji</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={newSubjIcon}
                        onChange={(e) => setNewSubjIcon(e.target.value)}
                        placeholder="📐"
                        className="w-full text-center bg-[#111827] border border-[#374151] focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-100 outline-none"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <p className="text-[10px] text-slate-500 leading-normal mb-1">
                        Pick emojis or single characters to represent this subject.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1f2937]/50">
                    <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                      💡 Click **Create** to initialize this empty subject. You can instantly expand it to append unlimited subtopics or syllabus keys using the inline **＋ Add Topic** triggers on the sidebar!
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-2 rounded-xl border border-[#374151] hover:bg-[#1f2937] text-slate-400 hover:text-white text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-transform active:scale-95 duration-75 shadow-lg"
                    >
                      Create Subject
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 h-full flex flex-col">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Quickly bootstrap multiple subjects & topics simultaneously. Fill in one of the fields below:
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">JSON Array format</label>
                    <textarea
                      rows={5}
                      value={bulkJson}
                      onChange={(e) => {
                        setBulkJson(e.target.value);
                        if (e.target.value) setBulkCsv('');
                      }}
                      placeholder={`[\n  {\n    "name": "General Science",\n    "icon": "🧪",\n    "topics": ["Physics Basics", "Cellular Biology"]\n  }\n]`}
                      className="w-full bg-[#111827] border border-[#374151] focus:border-blue-500 rounded-xl p-2.5 text-[11px] font-mono text-slate-100 outline-none resize-none"
                    />
                  </div>
                  <div className="text-center text-xs text-slate-500 font-semibold">— OR —</div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">CSV line Format (one subject per line)</label>
                    <textarea
                      rows={3}
                      value={bulkCsv}
                      onChange={(e) => {
                        setBulkCsv(e.target.value);
                        if (e.target.value) setBulkJson('');
                      }}
                      placeholder="Geography,🗺️,Climate Patterns|Tectonic Plates|Global Mapping"
                      className="w-full bg-[#111827] border border-[#374151] focus:border-blue-500 rounded-xl p-2.5 text-[11px] font-mono text-slate-100 outline-none resize-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Format: `SubjectName,EmojiSymbol,Topic1|Topic2|Topic3...`
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-2 rounded-xl border border-[#374151] hover:bg-[#1f2937] text-slate-400 hover:text-white text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkImportSubmit}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-transform active:scale-95 shadow-lg"
                    >
                      Import Bulk
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RENAME SUBJECT */}
      {editSubject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#182235] border border-[#1f2937] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-slate-100">Edit Subject Overview</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subject Title</label>
                <input
                  type="text"
                  value={editSubject.name}
                  onChange={(e) => setEditSubject({ ...editSubject, name: e.target.value })}
                  className="w-full bg-[#111827] border border-[#374151] rounded-xl p-2.5 text-xs text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Emoji / Icon</label>
                <input
                  type="text"
                  maxLength={3}
                  value={editSubject.icon}
                  onChange={(e) => setEditSubject({ ...editSubject, icon: e.target.value })}
                  className="w-full bg-[#111827] border border-[#374151] text-center rounded-xl p-2.5 text-xs text-slate-100 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditSubject(null)}
                className="flex-1 py-2 rounded-xl border border-[#374151] hover:bg-[#1f2937] text-slate-400 hover:text-white text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editSubject.name.trim()) {
                    onRenameSubject(editSubject.id, editSubject.name.trim(), editSubject.icon.trim() || '📚');
                  }
                  setEditSubject(null);
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE & BULK IMPORT SUBTOPICS */}
      {managingSubtopicsFor && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#182235] border border-[#1f2937] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#1f2937] flex justify-between items-center bg-[#111827]/40 shrink-0">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 animate-pulse">Subtopic Syllabus</span>
                <h3 className="text-sm font-bold text-slate-200 truncate max-w-[340px]">
                  Manage "{managingSubtopicsFor.topic.name}"
                </h3>
              </div>
              <button
                onClick={() => {
                  setManagingSubtopicsFor(null);
                  setNewSubtopicName('');
                  setSubtopicBulkText('');
                }}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0 text-slate-300">
              {/* Existing subtopics deck */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Existing Sub-topics ({managingSubtopicsFor.topic.subtopics?.length || 0})
                </label>
                
                {(!managingSubtopicsFor.topic.subtopics || managingSubtopicsFor.topic.subtopics.length === 0) ? (
                  <div className="p-4 rounded-xl border border-dashed border-[#1f2937] text-center bg-black/10 select-none">
                    <p className="text-xs text-slate-500">No nested sub-topics mapped yet.</p>
                  </div>
                ) : (
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 border border-[#1f2937]/50 rounded-xl p-2 bg-black/10">
                    {managingSubtopicsFor.topic.subtopics.map((sub, idx) => (
                      <div key={sub.id} className="flex justify-between items-center bg-[#111827]/60 px-3 py-1.5 rounded-lg border border-[#1f2937]/40 hover:border-slate-700/60 transition group/row">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                          <span className="text-xs text-slate-300 truncate">{sub.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Delete subtopic "${sub.name}"?`)) {
                              onDeleteSubtopic(managingSubtopicsFor.subjId, managingSubtopicsFor.topic.id, sub.id);
                              const updatedSubtopics = (managingSubtopicsFor.topic.subtopics || []).filter(s => s.id !== sub.id);
                              setManagingSubtopicsFor({
                                ...managingSubtopicsFor,
                                topic: { ...managingSubtopicsFor.topic, subtopics: updatedSubtopics }
                              });
                            }
                          }}
                          className="text-red-400 hover:text-white hover:bg-red-500/10 p-1 rounded transition opacity-0 group-hover/row:opacity-100 cursor-pointer"
                          title="Delete Subtopic"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Single Subtopic */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Add Single Subtopic</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtopicName}
                    onChange={(e) => setNewSubtopicName(e.target.value)}
                    placeholder="e.g. Fundamental Concepts of Mechanics"
                    className="flex-1 bg-[#111827] border border-[#374151] rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSubtopicName.trim()) {
                        onAddSubtopic(managingSubtopicsFor.subjId, managingSubtopicsFor.topic.id, newSubtopicName.trim());
                        const newTempId = 'sub_' + Date.now();
                        const updatedSubtopics = [
                          ...(managingSubtopicsFor.topic.subtopics || []),
                          { id: newTempId, name: newSubtopicName.trim() }
                        ];
                        setManagingSubtopicsFor({
                          ...managingSubtopicsFor,
                          topic: { ...managingSubtopicsFor.topic, subtopics: updatedSubtopics }
                        });
                        setNewSubtopicName('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newSubtopicName.trim()) {
                        onAddSubtopic(managingSubtopicsFor.subjId, managingSubtopicsFor.topic.id, newSubtopicName.trim());
                        const newTempId = 'sub_' + Date.now();
                        const updatedSubtopics = [
                          ...(managingSubtopicsFor.topic.subtopics || []),
                          { id: newTempId, name: newSubtopicName.trim() }
                        ];
                        setManagingSubtopicsFor({
                          ...managingSubtopicsFor,
                          topic: { ...managingSubtopicsFor.topic, subtopics: updatedSubtopics }
                        });
                        setNewSubtopicName('');
                      }
                    }}
                    className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 transition font-bold text-xs text-white rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Bulk Import Subtopics */}
              <div className="space-y-1.5 pt-2 border-t border-[#1f2937]/50">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                    Bulk Import Sub-topics
                  </label>
                  <span className="text-[9px] text-slate-500">One sub-topic per line</span>
                </div>
                <textarea
                  rows={4}
                  value={subtopicBulkText}
                  onChange={(e) => setSubtopicBulkText(e.target.value)}
                  placeholder={`Newton's First Law\nNewton's Second Law\nInertial Reference Frames\nFrictional Forces`}
                  className="w-full bg-[#111827] border border-[#374151] focus:border-blue-500 rounded-xl p-2.5 text-xs font-mono text-slate-100 outline-none resize-none"
                />
                <button
                  onClick={() => {
                    if (subtopicBulkText.trim()) {
                      onBulkImportSubtopics(managingSubtopicsFor.subjId, managingSubtopicsFor.topic.id, subtopicBulkText.trim());
                      const bulkList = subtopicBulkText
                        .split('\n')
                        .map(line => line.trim())
                        .filter(Boolean)
                        .map((name, i) => ({ id: `sub_${Date.now()}_${i}`, name }));
                      
                      const updatedSubtopics = [
                        ...(managingSubtopicsFor.topic.subtopics || []),
                        ...bulkList
                      ];
                      setManagingSubtopicsFor({
                        ...managingSubtopicsFor,
                        topic: { ...managingSubtopicsFor.topic, subtopics: updatedSubtopics }
                      });
                      setSubtopicBulkText('');
                    }
                  }}
                  className="w-full py-2 bg-slate-700 hover:bg-slate-600 hover:text-white transition font-semibold text-xs text-slate-300 rounded-xl cursor-pointer"
                >
                  📥 Convert to Nested Subtopics
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#1f2937] flex bg-[#111827]/40 shrink-0">
              <button
                onClick={() => {
                  setManagingSubtopicsFor(null);
                  setNewSubtopicName('');
                  setSubtopicBulkText('');
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
              >
                Done Managing Subtopics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
