import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Message } from '../store/useAppStore';
import { colors, spacing, fontSizes, fonts } from '../theme';

interface Props {
  message: Message;
  isStreaming?: boolean; // true for the message currently being generated
}

// Blinking block cursor that pulses while streaming
const StreamCursor: React.FC = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.Text style={[styles.cursor, { opacity }]}>█</Animated.Text>
  );
};

export const MessageBubble: React.FC<Props> = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user';
  const isWaiting = message.role === 'assistant' && message.content === '';
  const [expanded, setExpanded] = useState(true);
  const isPipelineStep = message.isPipelineStep;

  const agentColor = message.agentColor || colors.primary;
  const agentName  = (message.agentName || 'irai').toUpperCase();
  const agentIcon  = message.agentIcon || '▸';

  // ── User message ─────────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBlock}>
          <Text style={styles.userPrompt}>
            <Text style={styles.userPromptSymbol}>{'[USER]> '}</Text>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  // ── Pipeline step (collapsible) ───────────────────────────────────────────
  if (isPipelineStep) {
    return (
      <TouchableOpacity
        style={styles.pipelineBlock}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.85}>
        <Text style={[styles.pipelineHeader, { color: agentColor }]}>
          {expanded ? '▼' : '▶'} {agentIcon} {agentName}
          <Text style={styles.pipelineTag}> [AGENT STEP]</Text>
        </Text>
        {expanded && (
          <Text style={[styles.pipelineContent, { color: agentColor + 'CC' }]}>
            {message.content}
          </Text>
        )}
        {!expanded && (
          <Text style={[styles.pipelinePreview, { color: agentColor + '88' }]}>
            {message.content.slice(0, 90).replace(/\n/g, ' ')}…
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // ── AI message ────────────────────────────────────────────────────────────
  return (
    <View style={styles.aiBlock}>
      {/* Header bar */}
      <View style={[styles.aiHeader, { borderBottomColor: agentColor + '55' }]}>
        <Text style={[styles.aiHeaderText, { color: agentColor }]}>
          {'┌─[ '}{agentIcon} {agentName}{' ]'}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.aiBody}>
        {isWaiting ? (
          // Waiting for first token
          <Text style={styles.waitingText}>
            {'> initializing'}
            <StreamCursor />
          </Text>
        ) : (
          <Text style={styles.aiText}>
            {'> '}
            {message.content}
            {isStreaming && <StreamCursor />}
          </Text>
        )}
      </View>

      {/* Footer with token stats */}
      {!isStreaming && message.tokensPerSec && message.tokensPerSec > 0 && (
        <View style={styles.aiFooter}>
          <Text style={styles.metaText}>
            {'└─[ '}{message.tokensPerSec.toFixed(1)}{' t/s | '}{message.tokens}{' tokens ]'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ── User ─────────────────────────────────────────────────────────────────
  userRow: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    alignItems: 'flex-end',
  },
  userBlock: {
    maxWidth: '88%',
    backgroundColor: colors.userBubble,
    borderWidth: 1,
    borderColor: colors.primaryDim + '66',
    borderRadius: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  userPrompt: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.md,
    color: colors.userBubbleText,
    lineHeight: 20,
  },
  userPromptSymbol: {
    color: colors.primary,
    fontWeight: 'bold',
  },

  // ── AI message ────────────────────────────────────────────────────────────
  aiBlock: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    backgroundColor: colors.aiBubble,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 2,
    overflow: 'hidden',
  },
  aiHeader: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: '#001A0A',
    borderBottomWidth: 1,
  },
  aiHeaderText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aiBody: {
    padding: spacing.md,
  },
  aiText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 22,
  },
  waitingText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  aiFooter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: colors.primaryDark,
  },
  metaText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  cursor: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: fontSizes.md,
  },

  // ── Pipeline step ─────────────────────────────────────────────────────────
  pipelineBlock: {
    marginVertical: 3,
    marginHorizontal: spacing.sm,
    backgroundColor: '#030D06',
    borderWidth: 1,
    borderColor: colors.primaryDark,
    borderRadius: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.primaryDim,
  },
  pipelineHeader: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pipelineTag: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  pipelineContent: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  pipelinePreview: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
