import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, Text,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Message } from '../store/useAppStore';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput, AttachedImage } from '../components/ChatInput';
import { ModelBar } from '../components/ModelBar';
import { colors, spacing, fontSizes, fonts } from '../theme';
import { getAgent, MULTI_AGENT_PIPELINE, buildPipelinePrompt } from '../utils/agents';
import {
  loadMemories, initSeedMemories,
  getRelevantMemories, buildMemoryContext, markMemoriesUsed,
  learnFromExchange,
} from '../utils/memory';
import {
  loadNewsCache, refreshNews,
  getRelevantArticles, buildNewsContext,
} from '../utils/news';

// ── Strip model reasoning/control tags from output ─────────────────────────────
// Removes <think>…</think> and any other XML-like tags models emit internally.
const stripModelTags = (text: string): string => {
  // Remove complete <tag>…</tag> blocks (e.g. <think>…</think>)
  let out = text.replace(/<([a-zA-Z][a-zA-Z0-9_-]*)>[\s\S]*?<\/\1>/g, '');
  // While streaming the closing tag may not have arrived yet — hide from opening tag onwards
  out = out.replace(/<[a-zA-Z][a-zA-Z0-9_-]*>[\s\S]*$/, '');
  // Remove any stray standalone open/close tags
  out = out.replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*>/g, '');
  return out.trim();
};

// ── Prompt builder ─────────────────────────────────────────────────────────────

const getTodayPrefix = (): string => {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `Today is ${day}, ${time}.`;
};

const buildChatMLPrompt = (
  history: Array<{ role: string; content: string }>,
  systemPrompt: string,
): string => {
  const sysWithDate = `${getTodayPrefix()}\n${systemPrompt}`;
  let p = `<|im_start|>system\n${sysWithDate}<|im_end|>\n`;
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
 * Build the recent-context string for memory retrieval -- the last few
 * messages, NOT including the current query (getRelevantMemories takes
 * that separately and weights it much higher, so a stale topic from a
 * few turns back can't hijack an unrelated new question on its own).
 */
const buildRecentContextForMemory = (messages: Message[]): string =>
  messages
    .filter((m) => m.role !== 'system' && !m.isPipelineStep && m.content.trim())
    .slice(-6)
    .map((m) => m.content)
    .join(' ');

// ── Component ──────────────────────────────────────────────────────────────────

export const ChatScreen: React.FC = () => {
  const {
    messages, llamaContext, isGenerating, settings,
    activeAgentId, isMultiAgentMode, memories, newsArticles, isVisionEnabled,
    addMessage, setMessages, updateLastAssistantMessage, clearMessages,
    setIsGenerating, setMemories, setNews, setIsNewsRefreshing,
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

  // Load cached news instantly, then refresh from GitHub Pages in the
  // background. This is what "refresh the app to get updated information"
  // means in practice — a small JSON fetch, never a model re-download.
  useEffect(() => {
    (async () => {
      const cached = await loadNewsCache();
      if (cached) setNews(cached.articles, cached.generatedAt, cached.cachedAt);

      setIsNewsRefreshing(true);
      const { cache } = await refreshNews();
      if (cache) setNews(cache.articles, cache.generatedAt, cache.cachedAt);
      setIsNewsRefreshing(false);
    })();
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Memory helpers ──────────────────────────────────────────────────────────

  const getMemoryInjection = (currentQuery: string): string => {
    if (!settings.memoryEnabled || memories.length === 0) return '';
    // Use recent conversation context so follow-up questions get correct memories
    const recentCtx = buildRecentContextForMemory(messagesRef.current);
    const relevant = getRelevantMemories(memories, currentQuery, recentCtx, 8);
    if (relevant.length === 0) return '';
    // Mark them as used (async, don't block)
    markMemoriesUsed(relevant.map((m) => m.id));
    return buildMemoryContext(relevant);
  };

  // ── News helpers ─────────────────────────────────────────────────────────────

  const getNewsInjection = (currentQuery: string): string => {
    if (!settings.newsEnabled || newsArticles.length === 0) return '';
    const relevant = getRelevantArticles(newsArticles, currentQuery, 3);
    if (relevant.length === 0) return '';
    return buildNewsContext(relevant);
  };

  // ── Single-agent generation ─────────────────────────────────────────────────

  const runSingleAgent = async (userText: string) => {
    const agent = getAgent(activeAgentId);

    // System prompt + memory + current-events injection (uses recent context for lookup)
    const systemPrompt = agent.systemPrompt + getMemoryInjection(userText) + getNewsInjection(userText);

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
          updateLastAssistantMessage(stripModelTags(full));
          scrollToBottom();
        },
      );
      const tps = tokenCount / ((Date.now() - startMs) / 1000);
      updateLastAssistantMessage(stripModelTags(full), { tokens: tokenCount, tokensPerSec: tps });
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

  // ── Vision (image) generation ───────────────────────────────────────────────
  // Images are always answered by the currently active single agent — the
  // multi-agent pipeline is text-only.
  const runVisionAgent = async (userText: string, image: AttachedImage) => {
    const agent = getAgent(activeAgentId);
    const queryForMemory = userText || 'Describe this image.';
    const systemPrompt = agent.systemPrompt + getMemoryInjection(queryForMemory) + getNewsInjection(queryForMemory);

    // Prior turns as plain text; the current turn carries the image.
    const priorTurns = messagesRef.current
      .filter((m) => m.role !== 'system' && !m.isPipelineStep && m.content.trim() !== '')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const oaiMessages = [
      { role: 'system', content: `${getTodayPrefix()}\n${systemPrompt}` },
      ...priorTurns,
      {
        role: 'user',
        content: [
          { type: 'text', text: userText || 'Describe this image in detail.' },
          { type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.base64}` } },
        ],
      },
    ];

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
          messages: oaiMessages,
          n_predict: settings.maxTokens,
          temperature: settings.temperature,
          top_p: settings.topP,
          stop: settings.stopWords,
          repeat_penalty: 1.1,
        },
        (data: { token: string }) => {
          full += data.token;
          tokenCount++;
          updateLastAssistantMessage(stripModelTags(full));
          scrollToBottom();
        },
      );
      const tps = tokenCount / ((Date.now() - startMs) / 1000);
      updateLastAssistantMessage(stripModelTags(full), { tokens: tokenCount, tokensPerSec: tps });
    } catch (e: any) {
      if (!e?.message?.includes('abort')) {
        updateLastAssistantMessage(
          '[Error understanding image — make sure a vision-compatible model + mmproj is loaded]',
        );
      }
    }

    if (settings.memoryEnabled && full.trim()) {
      const newMems = await learnFromExchange(queryForMemory, full, memories);
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

    // Memory + current-events injection for the synthesis step
    const memoryInjection = getMemoryInjection(userText) + getNewsInjection(userText);

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
            updateLastAssistantMessage(stripModelTags(stepContent));
            if (isFinal) scrollToBottom();
          },
        );

        const tps = tokenCount / ((Date.now() - startMs) / 1000);
        updateLastAssistantMessage(stripModelTags(stepContent), { tokens: tokenCount, tokensPerSec: tps });
        agentResponses.push({ agentName: agent.name, content: stripModelTags(stepContent) });

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

  const handleSend = async (userText: string, image?: AttachedImage) => {
    if (!llamaContext) {
      Alert.alert('No Model', 'Please load a model from the Models tab first.');
      return;
    }
    if (image && !isVisionEnabled) {
      Alert.alert('Vision Not Enabled', 'Enable vision for the loaded model in the Models tab first.');
      return;
    }

    const userMsg: Message = {
      id: `${Date.now()}_user`,
      role: 'user', content: userText,
      timestamp: Date.now(),
      images: image ? [image.uri] : undefined,
    };
    addMessage(userMsg);
    setIsGenerating(true);

    try {
      if (image) {
        await runVisionAgent(userText, image);
      } else if (isMultiAgentMode) {
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

  // ── Retry: regenerate a response to the same question ──────────────────────
  const handleRetry = async (assistantMessage: Message) => {
    if (!llamaContext || isGenerating) return;

    const current = messagesRef.current;
    const idx = current.findIndex((m) => m.id === assistantMessage.id);
    if (idx === -1) return;

    // Walk back to the user turn this response answered (skipping any
    // multi-agent pipeline steps in between).
    let userIdx = idx - 1;
    while (userIdx >= 0 && current[userIdx].role !== 'user') userIdx--;
    if (userIdx === -1) return;

    const userMsg = current[userIdx];
    if (userMsg.images?.length) {
      Alert.alert('Cannot Retry', 'Retrying a message with an attached image isn’t supported yet.');
      return;
    }

    const userText = userMsg.content;
    // Drop the old user turn + everything after it, then resend exactly
    // like a fresh message -- this rebuilds history without the old
    // (unwanted) response instead of leaving it in context.
    setMessages(current.slice(0, userIdx));
    addMessage({ ...userMsg, id: `${Date.now()}_user`, timestamp: Date.now() });
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

  const visibleMessages = messages.filter((m) => m.role !== 'system');
  const lastIndex = visibleMessages.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>irai</Text>
        {visibleMessages.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>New chat</Text>
          </TouchableOpacity>
        )}
      </View>

      <ModelBar />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
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
              onRetry={
                !isGenerating && index === lastIndex && item.role === 'assistant' && !item.isPipelineStep
                  ? () => handleRetry(item)
                  : undefined
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyGlyph}>{'✦'}</Text>
              <Text style={styles.emptyTitle}>How can I help you today?</Text>
              <Text style={styles.emptyHint}>
                {llamaContext
                  ? isMultiAgentMode
                    ? 'Multi-agent mode is active — agents share the full conversation context.'
                    : 'Your model is loaded and ready. Ask anything, or attach a photo.'
                  : 'Load a model from the Models tab to get started.'}
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
          visionEnabled={isVisionEnabled}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
  },
  clearBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  clearText: { fontFamily: fonts.sans, color: colors.primary, fontSize: fontSizes.sm, fontWeight: '600' },
  list: { paddingVertical: spacing.sm },
  emptyList: { flex: 1 },
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  emptyGlyph: {
    fontSize: 32,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
