import { Subject } from '../types';

export const defaultSubjects: Subject[] = [
  {
    id: 'subj-bda',
    name: 'Bangladesh Affairs (বাংলাদেশ বিষয়াবলী)',
    icon: '🇧🇩',
    color: '#3b82f6', // blue
    topics: [
      { id: 'bda-1', name: 'Ancient History & Sovereign Statehood' },
      { id: 'bda-2', name: 'Language Movement & 1971 Liberation War' },
      { id: 'bda-3', name: 'Geography, Environment & Climatic changes of Bangladesh' },
      { id: 'bda-4', name: 'Constitution of Bangladesh & Political System' },
      { id: 'bda-5', name: 'National Achievements, Economy & Five-Year Plans' }
    ]
  },
  {
    id: 'subj-intl',
    name: 'International Affairs (আন্তর্জাতিক)',
    icon: '🗺️',
    color: '#ec4899', // pink
    topics: [
      { id: 'intl-1', name: 'Global Politics & Geopolitical Relations' },
      { id: 'intl-2', name: 'International Organizations & Global Treaties' },
      { id: 'intl-3', name: 'Global Environmental Treaties & Security Issues' },
      { id: 'intl-4', name: 'Foreign Policy of Bangladesh & Diplomacy' }
    ]
  },
  {
    id: 'subj-math',
    name: 'Mathematical Reasoning (গাণিতিক যুক্তি)',
    icon: '📐',
    color: '#10b981', // emerald
    topics: [
      { id: 'math-1', name: 'Arithmetic: Percentage, Profit-Loss & Interest' },
      { id: 'math-2', name: 'Algebra: Equations, Inequalities & Logarithms' },
      { id: 'math-3', name: 'Geometry: Lines, Angles, Triangles & Circles' },
      { id: 'math-4', name: 'Set Theory, Probability & Statistics' }
    ]
  },
  {
    id: 'subj-cit',
    name: 'Computer & IT (কম্পিউটার ও আইটি)',
    icon: '💻',
    color: '#8b5cf6', // purple
    topics: [
      { id: 'cit-1', name: 'Computer Hardware, Bus & CPU Architecture' },
      { id: 'cit-2', name: 'Operating Systems & Database Management Systems' },
      { id: 'cit-3', name: 'Networking: LAN, WAN, IP Protocols & Security' },
      { id: 'cit-4', name: 'Mobile Communication, Internet of Things & AI' }
    ]
  },
  {
    id: 'subj-ben',
    name: 'Bangla Language & Literature (বাংলা)',
    icon: '✍️',
    color: '#f59e0b', // amber
    topics: [
      { id: 'ben-1', name: 'Bangla Grammar: Sound, Word & Sentence rules' },
      { id: 'ben-2', name: 'Ancient & Medieval Literature (Charyapada, Mangalkavya)' },
      { id: 'ben-3', name: 'Modern Period: Rabindranath & Kazi Nazrul Islam' },
      { id: 'ben-4', name: 'Major Authors, Novels, and Drama of 19th/20th Century' }
    ]
  },
  {
    id: 'subj-eng',
    name: 'English Language & Literature',
    icon: '🇬🇧',
    color: '#6366f1', // indigo
    topics: [
      { id: 'eng-1', name: 'Parts of Speech, Clauses & Sentence Structure' },
      { id: 'eng-2', name: 'Vocabulary, Synonyms, Idioms & Phrases' },
      { id: 'eng-3', name: 'Elizabethan, Jacobean, and Romantic Literature Periods' },
      { id: 'eng-4', name: 'Famous English Playwrights, Poets & Modern Authors' }
    ]
  }
];
