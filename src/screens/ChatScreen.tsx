import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, Text,
  SafeAreaView, TouchableOpacity, Alert,
} from 'react-native';
import { useAppStore, Message } from '../store/useAppStore';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { ModelBar } from '../components/ModelBar';
import { colors, spacing, fontSizes } from '../theme';
import {
  getAgent, MULTI_AGENT_PIPELINE, buildPipelinePrompt,
} from '../utils/agents';
import {
  loadMemories, getRelevantMemories, buildMemoryContext,
  extractFactsFromUserMessage, categoriseFact, addMemory,
} from '../utils/memory';

const buildChatMLPrompt = (
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
): string => {
  let p = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
  for (const m of messages) {
    if (m.role === 'user') {
      p += `<|im_start|>user\n${m.content}<|im_end|>\n<|im_start|>assistant\n`;
    } else if (m.role === 'assistant') {
      p += `${m.content}<|im_end|>\n`;
    }
  }
  return p;
};

export const ChatScreen: React.FC = () => {
  const {
    messages, llamaContext, isGenerating, settings,
    activeAgentId, isMultiAgentMode, memories,
    addMessage, updateLastAssistantMessage, clearMessages,
    setIsGenerating, setMemories,
  } = useAppStore();

  const flatListRef = useRef<FlatList>(null);

  // Load memories on mount
  useEffect(() => {
    loadMemories().then(setMemories);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Single-agent generation ──────────────────────────────────────────────────
  const runSingleAgent = async (userText: string) => {
    const agent = getAgent(activeAgentId);

    // Build system prompt with memory
    let systemPrompt = agent.systemPrompt;
    if (settings.memoryEnabled && memories.length > 0) {
      const relevant = getRelevantMemories(memories, userText);
      systemPrompt += buildMemoryContext(relevant);
    }

    const placeholder: Message = {
      id: `${Date.now()}_ai`,
      role: 'assistant', content: '',
      timestamp: Date.now(),
      agentId: agent.id, agentName: agent.name,
      agentIcon: agent.icon, agentColor: agent.color,
    };
    addMessage(placeholder);
    scrollToBottom();

    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: userText });

    const prompt = buildChatMLPrompt(history, systemPrompt);

    let full = '';
    let tokenCount = 0;
    const startMs = Date.now();

    try {
      await llamaContext.completion(
        { prompt, n_predict: settings.maxTokens, temperature: settings.temperature, top_p: settings.topP, stop: settings.stopWords, repeat_penalty: 1.1 },
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
  };

  // ── Multi-agent pipeline ─────────────────────────────────────────────────────
  const runMultiAgentPipeline = async (userText: string) => {
    const agentResponses: Array<{ agentName: string; content: string }> = [];

    for (let i = 0; i < MULTI_AGENT_PIPELINE.length; i++) {
      const step = MULTI_AGENT_PIPELINE[i];
      const agent = getAgent(step.agentId);
      const isFinal = i === MULTI_AGENT_PIPELINE.length - 1;

      let systemPrompt = agent.systemPrompt;
      if (settings.memoryEnabled && memories.length > 0 && isFinal) {
        const relevant = getRelevantMemories(memories, userText);
        systemPrompt += buildMemoryContext(relevant);
      }

      const stepPrompt = buildPipelinePrompt(step, userText, agentResponses);
      const fullPrompt = buildChatMLPrompt(
        [{ role: 'user', content: stepPrompt }],
        systemPrompt,
      );

      const msgId = `${Date.now()}_${i}`;
      const placeholder: Message = {
        id: msgId,
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
            n_predict: isFinal ? settings.maxTokens : Math.min(settings.maxTokens, 400),
            temperature: isFinal ? settings.temperature : 0.6,
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

        // Small pause between agents
        if (!isFinal) await new Promise((r) => setTimeout(r, 300));
      } catch (e: any) {
        if (!e?.message?.includes('abort')) {
          updateLastAssistantMessage('[Agent error]');
        }
        break;
      }
    }
  };

  // ── Main send handler ────────────────────────────────────────────────────────
  const handleSend = async (userText: string) => {
    if (!llamaContext) {
      Alert.alert('No Model', 'Please load a model from the Models tab first.');
      return;
    }

    // Add user message
    const userMsg: Message = {
      id: `${Date.now()}_user`,
      role: 'user', content: userText,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setIsGenerating(true);

    // Auto-extract memories from user message
    if (settings.memoryEnabled) {
      const facts = extractFactsFromUserMessage(userText);
      for (const fact of facts) {
        const cat = categoriseFact(fact);
        const newMem = await addMemory({ content: fact, category: cat, source: 'auto', tags: [] });
        setMemories([newMem, ...memories]);
      }
    }

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>irai</Text>
        {visibleMessages.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ModelBar />

      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyLogo}>irai</Text>
            <Text style={styles.emptySubtitle}>Your offline AI assistant</Text>
            <Text style={styles.emptyHint}>
              {llamaContext
                ? isMultiAgentMode
                  ? '🔮 Multi-agent mode active\nAgents will collaborate on your question'
                  : 'Start a conversation below'
                : 'Load a model from the Models tab to begin'}
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
  },
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  clearBtn: { padding: spacing.sm },
  clearText: { color: colors.error, fontSize: fontSizes.sm },
  list: { paddingVertical: spacing.md },
  emptyList: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyLogo: { fontSize: 56, fontWeight: '900', color: colors.primary, letterSpacing: 4, marginBottom: spacing.md },
  emptySubtitle: { fontSize: fontSizes.lg, color: colors.text, fontWeight: '600', marginBottom: spacing.sm },
  emptyHint: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
