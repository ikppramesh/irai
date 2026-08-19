import { create } from 'zustand';
import { Memory } from '../utils/memory';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;
  tokensPerSec?: number;
  agentId?: string;   // which agent produced this message
  agentName?: string;
  agentIcon?: string;
  agentColor?: string;
  isPipelineStep?: boolean; // intermediate agent message in multi-agent mode
  images?: string[]; // local URIs of images attached to a user message
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
  memoryEnabled: boolean;
}

interface AppState {
  // Chat
  messages: Message[];
  isGenerating: boolean;

  // Model
  currentModel: ModelInfo | null;
  llamaContext: any | null;
  isModelLoading: boolean;
  loadedModelPath: string | null;

  // Vision (multimodal)
  mmprojPath: string | null;
  isVisionEnabled: boolean;
  isVisionLoading: boolean;
  visionSupport: { vision: boolean; audio: boolean } | null;

  // Agents
  activeAgentId: string;
  isMultiAgentMode: boolean;

  // Memory
  memories: Memory[];

  // Settings
  settings: AppSettings;

  // Actions
  addMessage: (msg: Message) => void;
  updateLastAssistantMessage: (content: string, extra?: Partial<Message>) => void;
  clearMessages: () => void;
  setCurrentModel: (m: ModelInfo | null) => void;
  setLlamaContext: (ctx: any | null) => void;
  setIsGenerating: (v: boolean) => void;
  setIsModelLoading: (v: boolean) => void;
  setLoadedModelPath: (p: string | null) => void;
  setMmprojPath: (p: string | null) => void;
  setIsVisionEnabled: (v: boolean) => void;
  setIsVisionLoading: (v: boolean) => void;
  setVisionSupport: (s: { vision: boolean; audio: boolean } | null) => void;
  setActiveAgentId: (id: string) => void;
  setMultiAgentMode: (v: boolean) => void;
  setMemories: (m: Memory[]) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  messages: [],
  isGenerating: false,
  currentModel: null,
  llamaContext: null,
  isModelLoading: false,
  loadedModelPath: null,
  mmprojPath: null,
  isVisionEnabled: false,
  isVisionLoading: false,
  visionSupport: null,
  activeAgentId: 'general',
  isMultiAgentMode: false,
  memories: [],
  settings: {
    systemPrompt: 'You are irai, a helpful, harmless, and honest AI assistant running completely offline on this device. Be concise and helpful.',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 512,
    contextLength: 2048,
    stopWords: ['</s>', '<|end|>', '<|im_end|>', 'Human:', 'User:'],
    showTokenSpeed: true,
    memoryEnabled: true,
  },

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastAssistantMessage: (content, extra) =>
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content, ...extra };
          break;
        }
      }
      return { messages: msgs };
    }),
  clearMessages: () => set({ messages: [] }),
  setCurrentModel: (m) => set({ currentModel: m }),
  setLlamaContext: (ctx) => set({ llamaContext: ctx }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setIsModelLoading: (v) => set({ isModelLoading: v }),
  setLoadedModelPath: (p) => set({ loadedModelPath: p }),
  setMmprojPath: (p) => set({ mmprojPath: p }),
  setIsVisionEnabled: (v) => set({ isVisionEnabled: v }),
  setIsVisionLoading: (v) => set({ isVisionLoading: v }),
  setVisionSupport: (s) => set({ visionSupport: s }),
  setActiveAgentId: (id) => set({ activeAgentId: id }),
  setMultiAgentMode: (v) => set({ isMultiAgentMode: v }),
  setMemories: (m) => set({ memories: m }),
  updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
}));
