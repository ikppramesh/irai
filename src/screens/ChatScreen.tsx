import React, { useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { initLlama } from 'llama.rn';
import { useAppStore, Message } from '../store/useAppStore';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { ModelBar } from '../components/ModelBar';
import { colors, spacing, fontSizes } from '../theme';
import { buildPrompt } from '../utils/modelUtils';

export const ChatScreen: React.FC = () => {
  const {
    messages,
    currentModel,
    llamaContext,
    isGenerating,
    settings,
    addMessage,
    updateLastAssistantMessage,
    clearMessages,
    setIsGenerating,
    setGenerationAbortController,
    generationAbortController,
  } = useAppStore();

  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = async (userText: string) => {
    if (!llamaContext) {
      Alert.alert('No Model', 'Please load a model from the Models tab first.');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(aiMsg);
    scrollToBottom();

    setIsGenerating(true);

    const conversationMsgs = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const prompt = buildPrompt(conversationMsgs, settings.systemPrompt);

    let fullContent = '';
    let tokenCount = 0;
    const startTime = Date.now();

    try {
      const result = await llamaContext.completion(
        {
          prompt,
          n_predict: settings.maxTokens,
          temperature: settings.temperature,
          top_p: settings.topP,
          stop: settings.stopWords,
          repeat_penalty: 1.1,
        },
        (data: { token: string }) => {
          fullContent += data.token;
          tokenCount += 1;
          updateLastAssistantMessage(fullContent);
          scrollToBottom();
        },
      );

      const elapsed = (Date.now() - startTime) / 1000;
      const tps = tokenCount / elapsed;
      updateLastAssistantMessage(fullContent, {
        tokens: tokenCount,
        tokensPerSec: tps,
      });
    } catch (e: any) {
      if (!e?.message?.includes('aborted')) {
        updateLastAssistantMessage('[Error generating response]');
      }
    } finally {
      setIsGenerating(false);
      setGenerationAbortController(null);
      scrollToBottom();
    }
  };

  const handleStop = () => {
    if (llamaContext) {
      llamaContext.stopCompletion();
    }
    setIsGenerating(false);
  };

  const handleClear = () => {
    Alert.alert('Clear Chat', 'Clear all messages?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearMessages },
    ]);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyLogo}>irai</Text>
      <Text style={styles.emptySubtitle}>Your offline AI assistant</Text>
      <Text style={styles.emptyHint}>
        {currentModel ? 'Start a conversation below' : 'Load a model from the Models tab to begin'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>irai</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ModelBar />

      <FlatList
        ref={flatListRef}
        data={messages.filter((m) => m.role !== 'system')}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.list}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  clearBtn: { padding: spacing.sm },
  clearText: { color: colors.error, fontSize: fontSizes.sm },
  list: { paddingVertical: spacing.md },
  emptyList: { flex: 1 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyLogo: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 4,
    marginBottom: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptyHint: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
