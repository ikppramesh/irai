import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Message } from '../store/useAppStore';
import { colors, spacing, fontSizes, fonts, borderRadius } from '../theme';

interface Props {
  message: Message;
  isStreaming?: boolean; // true for the message currently being generated
}

// Soft pulsing dot shown while a response is streaming
const StreamCursor: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={[styles.cursorDot, { opacity }]} />;
};

export const MessageBubble: React.FC<Props> = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user';
  const isWaiting = message.role === 'assistant' && message.content === '';
  const [expanded, setExpanded] = useState(true);
  const isPipelineStep = message.isPipelineStep;

  const agentColor = message.agentColor || colors.primary;
  const agentName  = message.agentName || 'irai';
  const agentIcon  = message.agentIcon || '✦';

  // ── User message ─────────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBlock}>
          {!!message.images?.length && (
            <View style={styles.userImagesRow}>
              {message.images.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.userImage} />
              ))}
            </View>
          )}
          {!!message.content && (
            <Text style={styles.userPrompt}>{message.content}</Text>
          )}
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
          {agentIcon} {agentName}
          <Text style={styles.pipelineTag}>  {expanded ? '▾' : '▸'} step</Text>
        </Text>
        {expanded && (
          <Text style={styles.pipelineContent}>
            {message.content}
          </Text>
        )}
        {!expanded && (
          <Text style={styles.pipelinePreview}>
            {message.content.slice(0, 90).replace(/\n/g, ' ')}…
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // ── AI message ────────────────────────────────────────────────────────────
  return (
    <View style={styles.aiBlock}>
      {/* Agent label */}
      <View style={styles.aiHeader}>
        <View style={[styles.agentDot, { backgroundColor: agentColor }]} />
        <Text style={styles.aiHeaderText}>{agentName}</Text>
      </View>

      {/* Content */}
      <View style={styles.aiBody}>
        {isWaiting ? (
          <StreamCursor />
        ) : (
          <Text style={styles.aiText}>
            {message.content}
            {isStreaming && <Text> </Text>}
            {isStreaming && <StreamCursor />}
          </Text>
        )}
      </View>

      {/* Footer with token stats */}
      {!isStreaming && message.tokensPerSec && message.tokensPerSec > 0 && (
        <Text style={styles.metaText}>
          {message.tokensPerSec.toFixed(1)} tok/s · {message.tokens} tokens
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ── User ─────────────────────────────────────────────────────────────────
  userRow: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  userBlock: {
    maxWidth: '86%',
    backgroundColor: colors.userBubble,
    borderRadius: borderRadius.xl + 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  userPrompt: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.md,
    color: colors.userBubbleText,
    lineHeight: 21,
  },
  userImagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  userImage: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.lg,
  },

  // ── AI message ────────────────────────────────────────────────────────────
  aiBlock: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  agentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aiHeaderText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  aiBody: {
    paddingLeft: 2,
  },
  aiText: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 23,
  },
  metaText: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 6,
    paddingLeft: 2,
  },
  cursorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 2,
  },

  // ── Pipeline step ─────────────────────────────────────────────────────────
  pipelineBlock: {
    marginVertical: 3,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.cardBorder,
  },
  pipelineHeader: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pipelineTag: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  pipelineContent: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  pipelinePreview: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
