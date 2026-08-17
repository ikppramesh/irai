import RNFS from 'react-native-fs';

const MEMORY_FILE = `${RNFS.DocumentDirectoryPath}/irai_memory.json`;
const MAX_MEMORIES = 300;

export type MemoryCategory = 'fact' | 'preference' | 'skill' | 'context' | 'custom';

export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  timestamp: number;
  source: 'auto' | 'manual';
  tags: string[];
}

export const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  fact: '#00BCD4',
  preference: '#FFD740',
  skill: '#69F0AE',
  context: '#7C4DFF',
  custom: '#FF6D00',
};

export const CATEGORY_ICONS: Record<MemoryCategory, string> = {
  fact: '📌',
  preference: '❤️',
  skill: '⚡',
  context: '🗂️',
  custom: '✏️',
};

// ── Persistence ────────────────────────────────────────────────────────────────

export const loadMemories = async (): Promise<Memory[]> => {
  try {
    const exists = await RNFS.exists(MEMORY_FILE);
    if (!exists) return [];
    const raw = await RNFS.readFile(MEMORY_FILE, 'utf8');
    return JSON.parse(raw) as Memory[];
  } catch {
    return [];
  }
};

export const saveMemories = async (memories: Memory[]): Promise<void> => {
  await RNFS.writeFile(MEMORY_FILE, JSON.stringify(memories, null, 2), 'utf8');
};

export const addMemory = async (
  partial: Omit<Memory, 'id' | 'timestamp'>,
): Promise<Memory> => {
  const memories = await loadMemories();
  const mem: Memory = { ...partial, id: `${Date.now()}_${Math.random()}`, timestamp: Date.now() };
  const updated = [mem, ...memories].slice(0, MAX_MEMORIES);
  await saveMemories(updated);
  return mem;
};

export const deleteMemory = async (id: string): Promise<void> => {
  const memories = await loadMemories();
  await saveMemories(memories.filter((m) => m.id !== id));
};

export const clearAllMemories = async (): Promise<void> => {
  await saveMemories([]);
};

// ── Retrieval ──────────────────────────────────────────────────────────────────

export const getRelevantMemories = (
  memories: Memory[],
  query: string,
  limit = 6,
): Memory[] => {
  if (!query.trim() || memories.length === 0) return [];
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  if (words.length === 0) return memories.slice(0, 3);

  return memories
    .map((m) => {
      const text = m.content.toLowerCase();
      const score = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
      return { m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.m);
};

export const buildMemoryContext = (memories: Memory[]): string => {
  if (memories.length === 0) return '';
  const lines = memories.map((m) => `• [${m.category}] ${m.content}`).join('\n');
  return `\n\n[User memory context — use this to personalise your response:\n${lines}\n]`;
};

// ── Auto-extraction (simple pattern matching, no LLM call needed) ──────────────

export const extractFactsFromUserMessage = (text: string): string[] => {
  const facts: string[] = [];

  const patterns = [
    /\b[Ii](?:'m| am) (?!sure|not|going|trying|wondering|asking)([^.!?\n]{5,60})/g,
    /\b[Ii] (?:work|live|study|teach|build|run|use|have|own) ([^.!?\n]{5,60})/g,
    /\b[Mm]y (?:name|job|role|company|team|project|goal|hobby|language|stack) (?:is|are|=) ([^.!?\n]{3,60})/g,
    /\b[Ii] (?:prefer|like|love|hate|dislike|enjoy|avoid) ([^.!?\n]{5,60})/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fact = match[0].trim();
      if (fact.length > 8 && fact.length < 120) facts.push(fact);
    }
  }

  return [...new Set(facts)].slice(0, 4);
};

export const categoriseFact = (text: string): MemoryCategory => {
  const t = text.toLowerCase();
  if (/prefer|like|love|hate|enjoy|dislike|favorite/.test(t)) return 'preference';
  if (/work|job|role|company|build|code|develop|engineer|design/.test(t)) return 'skill';
  if (/name|live|from|age|am a|i'm a/.test(t)) return 'fact';
  return 'context';
};
