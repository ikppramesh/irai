import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, Alert,
} from 'react-native';
import { useAppStore, Message } from '../store/useAppStore';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { ModelBar } from '../components/ModelBar';
import { colors, spacing, fontSizes, fonts } from '../theme';
import { getAgent, MULTI_AGENT_PIPELINE, buildPipelinePrompt } from '../utils/agents';
import {
  loadMemories, initSeedMemories,
  getRelevantMemories, buildMemoryContext, markMemoriesUsed,
  learnFromExchange,
} from '../utils/memory';

// ── Prompt builder ─────────────────────────────────────────────────────────────

const buildChatMLPrompt = (
  history: Array<{ role: string; content: string }>,
  systemPrompt: string,
): string => {
  let p = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
  for (const m of history) {
    if (m.role === 'user') {
      p += `<|im_start|>user\n${m.content}<|im_end|>\n<|im_start|>assistant\n`;
    } else if (m.role === 'assistant') {
      p += `${m.content}<|im_end|>\n`;
    }
  }
  return p;
};

/**
 * Build clean conversation history:
 * - Excludes system messages
 * - Excludes isPipelineStep intermediate messages (they pollute context)
 * - Only keeps FINAL synthesis responses as the 'assistant' turn
 */
const buildCleanHistory = (
  messages: Message[],
  newUserText: string,
): Array<{ role: 'user' | 'assistant'; content: string }> => {
  const clean: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const m of messages) {
    if (m.role === 'system') continue;
    if (m.isPipelineStep) continue; // skip intermediate agent steps
    if (m.content.trim() === '') continue; // skip empty placeholders
    clean.push({ role: m.role as 'user' | 'assistant', content: m.content });
  }

  // Add current user message
  clean.push({ role: 'user', content: newUserText });
  return clean;
};

/**
 * Build conversation context string for multi-agent pipeline.
 * Includes last N turns so agents know what was discussed before.
 */
const buildConversationContext = (messages: Message[], currentQuestion: string): string => {
  const recent = messages
    .filter((m) => m.role !== 'system' && !m.isPipelineStep && m.content.trim())
    .slice(-8) // last 4 turns (8 messages)
    .map((m) => (m.role === 'user' ? `User: ${m.content}` : `Assistant: ${m.content}`))
    .join('\n\n');

  return recent
    ? `[Prior conversation context — this is essential for understanding the current question:\n${recent}\n]\n\nCurrent question: ${currentQuestion}`
    : currentQuestion;
};

/**
 * Build the recent context string for memory retrieval.
 * Merges last few messages so "food?" finds "Hyderabad" from the previous turn.
 */
const buildRecentContextForMemory = (messages: Message[], currentQuery: string): string => {
  const recent = messages
    .filter((m) => m.role !== 'system' && !m.isPipelineStep && m.content.trim())
    .slice(-6)
    .map((m) => m.content)
    .join(' ');
  return `${recent} ${currentQuery}`;
};

// ── Component ──────────────────────────────────────────────────────────────────

export const ChatScreen: React.FC = () => {
  const {
    messages, llamaContext, isGenerating, settings,
    activeAgentId, isMultiAgentMode, memories,
    addMessage, updateLastAssistantMessage, clearMessages,
    setIsGenerating, setMemories,
  } = useAppStore();

  const flatListRef = useRef<FlatList>(null);

  // Keep a ref so async functions always see the latest messages
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Init seeds + load memories on mount
  useEffect(() => {
    (async () => {
      await initSeedMemories();
      const mems = await loadMemories();
      setMemories(mems);
    })();
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Memory helpers ──────────────────────────────────────────────────────────

  const getMemoryInjection = (currentQuery: string): string => {
    if (!settings.memoryEnabled || memories.length === 0) return '';
    // Use recent conversation context so follow-up questions get correct memories
    const recentCtx = buildRecentContextForMemory(messagesRef.current, currentQuery);
    const relevant = getRelevantMemories(memories, currentQuery, recentCtx, 8);
    if (relevant.length === 0) return '';
    // Mark them as used (async, don't block)
    markMemoriesUsed(relevant.map((m) => m.id));
    return buildMemoryContext(relevant);
  };

  // ── Single-agent generation ─────────────────────────────────────────────────

  const runSingleAgent = async (userText: string) => {
    const agent = getAgent(activeAgentId);

    // System prompt + memory injection (uses recent context for lookup)
    const systemPrompt = agent.systemPrompt + getMemoryInjection(userText);

    // Clean history: NO pipeline steps, current user message at end
    const history = buildCleanHistory(messagesRef.current, userText);
    const prompt = buildChatMLPrompt(history, systemPrompt);

    const placeholder: Message = {
      id: `${Date.now()}_ai`,
      role: 'assistant', content: '',
      timestamp: Date.now(),
      agentId: agent.id, agentName: agent.name,
      agentIcon: agent.icon, agentColor: agent.color,
    };
    addMessage(placeholder);
    scrollToBottom();

    let full = '';
    let tokenCount = 0;
    const startMs = Date.now();

    try {
      await llamaContext.completion(
        {
          prompt,
          n_predict: settings.maxTokens,
          temperature: settings.temperature,
          top_p: settings.topP,
          stop: settings.stopWords,
          repeat_penalty: 1.1,
        },
        (data: { token: string }) => {
          full += data.token;
          tokenCount++;
          updateLastAssistantMessage(full);
          scrollToBottom();
        },
      );
      const tps = tokenCount / ((Date.now() - startMs) / 1000);
      updateLastAssistantMessage(full, { tokens: tokenCount, tokensPerSec: tps });
    } catch (e: any) {
      if (!e?.message?.includes('abort')) updateLastAssistantMessage('[Error generating response]');
    }

    // Self-learn from this exchange
    if (settings.memoryEnabled && full.trim()) {
      const newMems = await learnFromExchange(userText, full, memories);
      if (newMems.length > 0) {
        const updatedMems = await loadMemories();
        setMemories(updatedMems);
      }
    }
  };

  // ── Multi-agent pipeline ────────────────────────────────────────────────────

  const runMultiAgentPipeline = async (userText: string) => {
    // Build full conversation context ONCE — all agents share this
    // This is the KEY FIX: agents know what was discussed before this message
    const conversationContext = buildConversationContext(messagesRef.current, userText);

    // Memory injection for the synthesis step
    const memoryInjection = getMemoryInjection(userText);

    const agentResponses: Array<{ agentName: string; content: string }> = [];

    for (let i = 0; i < MULTI_AGENT_PIPELINE.length; i++) {
      const step = MULTI_AGENT_PIPELINE[i];
      const agent = getAgent(step.agentId);
      const isFinal = i === MULTI_AGENT_PIPELINE.length - 1;

      // Final synthesizer gets memory; earlier agents get clean system prompt
      const systemPrompt = isFinal
        ? agent.systemPrompt + memoryInjection
        : agent.systemPrompt;

      // Build this step's prompt:
      // - Uses conversationContext (full prior chat) instead of bare userText
      // - Appends prior agents' responses for agent-to-agent reasoning
      const stepUserPrompt = buildPipelinePrompt(step, conversationContext, agentResponses);

      // Each agent sees: its system prompt + the contextual question as a single user turn
      const fullPrompt = buildChatMLPrompt(
        [{ role: 'user', content: stepUserPrompt }],
        systemPrompt,
      );

      const placeholder: Message = {
        id: `${Date.now()}_step${i}`,
        role: 'assistant', content: '',
        timestamp: Date.now(),
        agentId: agent.id, agentName: agent.name,
        agentIcon: agent.icon, agentColor: agent.color,
        isPipelineStep: !isFinal,
      };
      addMessage(placeholder);
      scrollToBottom();

      let stepContent = '';
      let tokenCount = 0;
      const startMs = Date.now();

      try {
        await llamaContext.completion(
          {
            prompt: fullPrompt,
            n_predict: isFinal ? settings.maxTokens : Math.min(settings.maxTokens, 350),
            temperature: isFinal ? settings.temperature : 0.5,
            top_p: settings.topP,
            stop: settings.stopWords,
            repeat_penalty: 1.1,
          },
          (data: { token: string }) => {
            stepContent += data.token;
            tokenCount++;
            updateLastAssistantMessage(stepContent);
            if (isFinal) scrollToBottom();
          },
        );

        const tps = tokenCount / ((Date.now() - startMs) / 1000);
        updateLastAssistantMessage(stepContent, { tokens: tokenCount, tokensPerSec: tps });
        agentResponses.push({ agentName: agent.name, content: stepContent });

        if (!isFinal) await new Promise((r) => setTimeout(r, 200));
      } catch (e: any) {
        if (!e?.message?.includes('abort')) updateLastAssistantMessage('[Agent error]');
        break;
      }
    }

    // Self-learn from final response
    const finalResponse = agentResponses[agentResponses.length - 1]?.content ?? '';
    if (settings.memoryEnabled && finalResponse.trim()) {
      const newMems = await learnFromExchange(userText, finalResponse, memories);
      if (newMems.length > 0) {
        const updatedMems = await loadMemories();
        setMemories(updatedMems);
      }
    }
  };

  // ── Main send handler ───────────────────────────────────────────────────────

  const handleSend = async (userText: string) => {
    if (!llamaContext) {
      Alert.alert('No Model', 'Please load a model from the Models tab first.');
      return;
    }

    const userMsg: Message = {
      id: `${Date.now()}_user`,
      role: 'user', content: userText,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setIsGenerating(true);

    try {
      if (isMultiAgentMode) {
        await runMultiAgentPipeline(userText);
      } else {
        await runSingleAgent(userText);
      }
    } finally {
      setIsGenerating(false);
      scrollToBottom();
    }
  };

  const handleStop = () => {
    if (llamaContext) {
      try { llamaContext.stopCompletion(); } catch (_) {}
    }
    setIsGenerating(false);
  };

  const handleClear = () => {
    Alert.alert('Clear Chat', 'Clear all messages?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearMessages },
    ]);
  };

  const visibleMessages = messages.filter((m) => m.role !== 'system');
  const lastIndex = visibleMessages.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Terminal title bar */}
      <View style={styles.header}>
        <Text style={styles.title}>{'╔══ IRAI TERMINAL ══╗'}</Text>
        {visibleMessages.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>{'[CLR]'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ModelBar />

      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <MessageBubble
            message={item}
            isStreaming={
              isGenerating && index === lastIndex && item.role === 'assistant'
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyAscii}>
              {'  _  ____   _    ___ \n' +
               ' (_)|  _ \\ / \\  |_ _|\n' +
               ' | || |_) / _ \\  | | \n' +
               ' | ||  _ < ___ \\ | | \n' +
               ' |_||_| \\_\\   \\_\\___|'}
            </Text>
            <Text style={styles.emptySubtitle}>{'// offline AI terminal'}</Text>
            <Text style={styles.emptyHint}>
              {llamaContext
                ? isMultiAgentMode
                  ? '>> MULTI-AGENT MODE ACTIVE\n>> agents share full conversation context'
                  : '>> model loaded. ready for input.'
                : '>> no model loaded.\n>> go to MODELS tab to load a model.'}
            </Text>
          </View>
        }
        contentContainerStyle={visibleMessages.length === 0 ? styles.emptyList : styles.list}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
      />

      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isGenerating={isGenerating}
        disabled={!llamaContext}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.primaryDark,
  },
  title: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  clearBtn: { padding: spacing.sm },
  clearText: { fontFamily: fonts.mono, color: colors.error, fontSize: fontSizes.xs, fontWeight: '700' },
  list: { paddingVertical: spacing.sm },
  emptyList: { flex: 1 },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  emptyAscii: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 20,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyHint: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
