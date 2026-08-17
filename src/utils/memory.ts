import RNFS from 'react-native-fs';

const MEMORY_FILE = `${RNFS.DocumentDirectoryPath}/irai_memory.json`;
const SEED_FLAG_FILE = `${RNFS.DocumentDirectoryPath}/irai_memory_seeded.flag`;
const MAX_MEMORIES = 500;

export type MemoryCategory = 'fact' | 'preference' | 'skill' | 'context' | 'topic' | 'custom';

export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  timestamp: number;
  source: 'auto' | 'manual' | 'seed' | 'learned';
  tags: string[];
  useCount: number; // how many times this memory was retrieved/used
}

export const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  fact: '#00BCD4',
  preference: '#FFD740',
  skill: '#69F0AE',
  context: '#7C4DFF',
  topic: '#FF6D00',
  custom: '#FF5252',
};

export const CATEGORY_ICONS: Record<MemoryCategory, string> = {
  fact: '📌',
  preference: '❤️',
  skill: '⚡',
  context: '🗂️',
  topic: '🗺️',
  custom: '✏️',
};

// ── Seed memories (prefilled on first launch) ───────────────────────────────
const SEED_MEMORIES: Omit<Memory, 'id' | 'timestamp' | 'useCount'>[] = [
  // Hyderabad knowledge seeds
  { content: 'Hyderabad is famous for Biryani, especially Hyderabadi Dum Biryani', category: 'topic', source: 'seed', tags: ['hyderabad', 'food', 'biryani'] },
  { content: 'Hyderabad food includes: Haleem, Mirchi ka Salan, Double ka Meetha, Qubani ka Meetha, Lukhmi', category: 'topic', source: 'seed', tags: ['hyderabad', 'food'] },
  { content: 'Famous food places in Hyderabad: Paradise Biryani, Shah Ghouse, Cafe Bahar, Sarvi, Shadab', category: 'topic', source: 'seed', tags: ['hyderabad', 'restaurants'] },
  { content: 'Hyderabad is also called the City of Pearls and City of Nizams in India', category: 'topic', source: 'seed', tags: ['hyderabad'] },
  { content: 'Hyderabad is a major IT hub in India, home to HITEC City with companies like Microsoft, Google, Amazon', category: 'topic', source: 'seed', tags: ['hyderabad', 'tech'] },
  // General India
  { content: 'India has diverse regional cuisines: North Indian, South Indian, Bengali, Rajasthani, etc.', category: 'topic', source: 'seed', tags: ['india', 'food'] },
  // Tech seeds
  { content: 'React Native is a framework for building cross-platform mobile apps using JavaScript/TypeScript', category: 'topic', source: 'seed', tags: ['react native', 'mobile', 'tech'] },
  { content: 'llama.cpp enables running LLMs locally on CPU/GPU without internet connection', category: 'topic', source: 'seed', tags: ['llm', 'offline', 'ai'] },
  { content: 'GGUF is the model format used by llama.cpp for efficient local inference', category: 'topic', source: 'seed', tags: ['llm', 'gguf'] },
];

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

// Initialize seed memories on first run
export const initSeedMemories = async (): Promise<void> => {
  const seeded = await RNFS.exists(SEED_FLAG_FILE);
  if (seeded) return;

  const existing = await loadMemories();
  const seeds: Memory[] = SEED_MEMORIES.map((s, i) => ({
    ...s,
    id: `seed_${i}_${Date.now()}`,
    timestamp: Date.now() - (SEED_MEMORIES.length - i) * 1000,
    useCount: 0,
  }));

  await saveMemories([...seeds, ...existing].slice(0, MAX_MEMORIES));
  await RNFS.writeFile(SEED_FLAG_FILE, '1', 'utf8');
};

export const addMemory = async (
  partial: Omit<Memory, 'id' | 'timestamp' | 'useCount'>,
): Promise<Memory> => {
  const memories = await loadMemories();

  // Deduplicate: skip if very similar content already exists
  const lower = partial.content.toLowerCase();
  const isDuplicate = memories.some(
    (m) => m.content.toLowerCase() === lower ||
           stringSimilarity(m.content.toLowerCase(), lower) > 0.85,
  );
  if (isDuplicate) return memories[0]; // return existing, don't add duplicate

  const mem: Memory = {
    ...partial,
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    useCount: 0,
  };
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
  // Remove seed flag so seeds get re-added
  const exists = await RNFS.exists(SEED_FLAG_FILE);
  if (exists) await RNFS.unlink(SEED_FLAG_FILE);
};

// Increment use count so frequently-used memories rank higher
export const markMemoriesUsed = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const memories = await loadMemories();
  const updated = memories.map((m) =>
    ids.includes(m.id) ? { ...m, useCount: m.useCount + 1 } : m,
  );
  await saveMemories(updated);
};

// ── Retrieval ──────────────────────────────────────────────────────────────────

/**
 * Get relevant memories using:
 * 1. The current query
 * 2. PLUS recent conversation context (so "food?" finds "Hyderabad" from prior turns)
 */
export const getRelevantMemories = (
  memories: Memory[],
  currentQuery: string,
  recentContext: string = '',  // last few messages combined
  limit = 8,
): Memory[] => {
  if (memories.length === 0) return [];

  // Combine current query + recent context for broader matching
  const fullSearch = `${currentQuery} ${recentContext}`.toLowerCase();
  const words = fullSearch
    .split(/\W+/)
    .filter((w) => w.length > 2)
    // Remove very common words
    .filter((w) => !['the', 'and', 'for', 'are', 'was', 'what', 'tell', 'about', 'give', 'can', 'you', 'that', 'this', 'with', 'from'].includes(w));

  if (words.length === 0) return memories.slice(0, 3);

  return memories
    .map((m) => {
      const text = (m.content + ' ' + m.tags.join(' ')).toLowerCase();
      // Score: keyword hits + boost for frequently used memories + boost for tags
      const keywordScore = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
      const tagBonus = m.tags.some((t) => words.some((w) => t.includes(w))) ? 0.5 : 0;
      const useBonus = Math.min(m.useCount * 0.1, 1.0);
      const total = keywordScore + tagBonus + useBonus;
      return { m, score: total };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.m);
};

export const buildMemoryContext = (memories: Memory[]): string => {
  if (memories.length === 0) return '';
  const lines = memories
    .map((m) => `• [${m.category}] ${m.content}`)
    .join('\n');
  return `\n\n[Relevant knowledge & user context — use this to give accurate, personalised responses:\n${lines}\n]`;
};

// ── Auto-extraction from user messages ────────────────────────────────────────

/**
 * Extract personal facts the user shares about themselves
 */
export const extractUserFacts = (text: string): Array<{ content: string; category: MemoryCategory; tags: string[] }> => {
  const results: Array<{ content: string; category: MemoryCategory; tags: string[] }> = [];

  const patterns: Array<{ re: RegExp; category: MemoryCategory; tags: string[] }> = [
    { re: /\b[Ii](?:'m| am) (?!sure|not|going|trying|wondering|asking|looking|wondering)([^.!?\n]{5,80})/g, category: 'fact', tags: ['identity'] },
    { re: /\b[Ii] (?:work|live|study|teach|build|run|use|have|own) ([^.!?\n]{5,80})/g, category: 'context', tags: [] },
    { re: /\b[Mm]y (?:name|job|role|company|team|project|goal|hobby|language|stack|city|location) (?:is|are|=) ([^.!?\n]{3,80})/g, category: 'fact', tags: [] },
    { re: /\b[Ii] (?:prefer|like|love|hate|dislike|enjoy|avoid|use) ([^.!?\n]{5,80})/g, category: 'preference', tags: [] },
    { re: /\b[Ii] (?:am from|live in|am based in|am in) ([^.!?\n]{3,50})/gi, category: 'fact', tags: ['location'] },
  ];

  for (const { re, category, tags } of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const content = m[0].trim();
      if (content.length > 8 && content.length < 150) {
        results.push({ content, category, tags });
      }
    }
  }

  return [...new Map(results.map((r) => [r.content.toLowerCase(), r])).values()].slice(0, 4);
};

/**
 * Extract topic/entity mentions for self-learning context memories
 * e.g. user asking about "Hyderabad" → store "User asked about Hyderabad"
 */
export const extractTopicMemories = (
  text: string,
  existingMemories: Memory[],
): Array<{ content: string; category: MemoryCategory; tags: string[] }> => {
  const results: Array<{ content: string; category: MemoryCategory; tags: string[] }> = [];

  // Extract named places
  const placePattern = /\b(hyderabad|mumbai|delhi|bangalore|chennai|kolkata|pune|ahmedabad|jaipur|lucknow|india|pakistan|usa|london|dubai)\b/gi;
  const places = [...new Set((text.match(placePattern) || []).map((p) => p.toLowerCase()))];
  for (const place of places.slice(0, 2)) {
    const content = `User has interest in / asked about: ${place}`;
    const exists = existingMemories.some((m) => m.content.toLowerCase().includes(place) && m.category === 'topic');
    if (!exists) results.push({ content, category: 'topic', tags: [place] });
  }

  // Extract food/cuisine interests
  const foodPattern = /\b(biryani|food|cuisine|restaurant|recipe|cooking|eat|dish|meal|breakfast|lunch|dinner|snack|street food|haleem|kebab)\b/gi;
  const foods = [...new Set((text.match(foodPattern) || []).map((f) => f.toLowerCase()))];
  if (foods.length > 0) {
    const foodContent = `User is interested in food/cuisine topics: ${foods.slice(0, 3).join(', ')}`;
    const exists = existingMemories.some((m) => m.content.includes('food/cuisine') && m.category === 'topic');
    if (!exists) results.push({ content: foodContent, category: 'topic', tags: [...foods.slice(0, 3), 'food'] });
  }

  // Extract tech topics
  const techPattern = /\b(react|typescript|javascript|python|android|ios|flutter|nodejs|ai|llm|machine learning|cloud|aws|gcp|azure)\b/gi;
  const techs = [...new Set((text.match(techPattern) || []).map((t) => t.toLowerCase()))];
  if (techs.length > 0) {
    const techContent = `User works with / interested in: ${techs.slice(0, 3).join(', ')}`;
    const exists = existingMemories.some((m) => techs.some((t) => m.content.toLowerCase().includes(t)) && m.category === 'skill');
    if (!exists) results.push({ content: techContent, category: 'skill', tags: techs.slice(0, 3) });
  }

  return results.slice(0, 3);
};

/**
 * Learn from a completed AI response — extract what was discussed
 * for future context awareness
 */
export const learnFromExchange = async (
  userMessage: string,
  aiResponse: string,
  existingMemories: Memory[],
): Promise<Memory[]> => {
  const newMemories: Memory[] = [];

  // Extract user facts
  const userFacts = extractUserFacts(userMessage);
  for (const fact of userFacts) {
    const mem = await addMemory({ ...fact, source: 'auto' });
    if (mem.timestamp === Date.now() || mem.useCount === 0) newMemories.push(mem);
  }

  // Extract topics for self-learning
  const topics = extractTopicMemories(userMessage, existingMemories);
  for (const topic of topics) {
    const mem = await addMemory({ ...topic, source: 'learned' });
    if (mem.timestamp === Date.now() || mem.useCount === 0) newMemories.push(mem);
  }

  return newMemories;
};

// ── Utilities ──────────────────────────────────────────────────────────────────

// Simple string similarity (Jaccard on word sets)
const stringSimilarity = (a: string, b: string): number => {
  const setA = new Set(a.split(/\W+/));
  const setB = new Set(b.split(/\W+/));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

export const categoriseFact = (text: string): MemoryCategory => {
  const t = text.toLowerCase();
  if (/prefer|like|love|hate|enjoy|dislike|favorite/.test(t)) return 'preference';
  if (/work|job|role|company|build|code|develop|engineer|design/.test(t)) return 'skill';
  if (/hyderabad|mumbai|delhi|bangalore|city|place|country|location/.test(t)) return 'topic';
  if (/name|live|from|age|am a|i'm a/.test(t)) return 'fact';
  return 'context';
};
