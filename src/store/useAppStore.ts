import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;
  tokensPerSec?: number;
}

export interface ModelInfo {
  name: string;
  path: string;
  size: number;
  displaySize: string;
}

export interface AppSettings {
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextLength: number;
  stopWords: string[];
  showTokenSpeed: boolean;
  theme: 'dark';
}

interface AppState {
  messages: Message[];
  currentModel: ModelInfo | null;
  llamaContext: any | null;
  isGenerating: boolean;
  isModelLoading: boolean;
  loadedModelPath: string | null;
  generationAbortController: any | null;
  settings: AppSettings;
  // Actions
  addMessage: (msg: Message) => void;
  updateLastAssistantMessage: (content: string, extra?: Partial<Message>) => void;
  clearMessages: () => void;
  setCurrentModel: (model: ModelInfo | null) => void;
  setLlamaContext: (ctx: any | null) => void;
  setIsGenerating: (val: boolean) => void;
  setIsModelLoading: (val: boolean) => void;
  setLoadedModelPath: (path: string | null) => void;
  setGenerationAbortController: (ctrl: any | null) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  messages: [],
  currentModel: null,
  llamaContext: null,
  isGenerating: false,
  isModelLoading: false,
  loadedModelPath: null,
  generationAbortController: null,
  settings: {
    systemPrompt: 'You are irai, a helpful, harmless, and honest AI assistant running completely offline on this device. Be concise and helpful.',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 512,
    contextLength: 2048,
    stopWords: ['</s>', '<|end|>', '<|im_end|>', 'Human:', 'User:'],
    showTokenSpeed: true,
    theme: 'dark',
  },
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastAssistantMessage: (content, extra) =>
    set((s) => {
      const msgs = [...s.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
        msgs[lastIdx] = { ...msgs[lastIdx], content, ...extra };
      }
      return { messages: msgs };
    }),
  clearMessages: () => set({ messages: [] }),
  setCurrentModel: (model) => set({ currentModel: model }),
  setLlamaContext: (ctx) => set({ llamaContext: ctx }),
  setIsGenerating: (val) => set({ isGenerating: val }),
  setIsModelLoading: (val) => set({ isModelLoading: val }),
  setLoadedModelPath: (path) => set({ loadedModelPath: path }),
  setGenerationAbortController: (ctrl) => set({ generationAbortController: ctrl }),
  updateSettings: (newS) => set((s) => ({ settings: { ...s.settings, ...newS } })),
}));
