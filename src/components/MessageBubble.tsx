import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Message } from '../store/useAppStore';
import { colors, spacing, fontSizes, fonts, borderRadius } from '../theme';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

// Pulsing dot shown while waiting for the first token
const StreamCursor: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={[styles.cursorDot, { opacity }]} />;
};

export const MessageBubble: React.FC<Props> = ({ message, isStreaming = false }) => {
  const isUser      = message.role === 'user';
  const isWaiting   = message.role === 'assistant' && message.content === '';
  const isPipeline  = message.isPipelineStep;
  const [expanded, setExpanded] = useState(true);

  const agentColor = message.agentColor || colors.primary;
  const agentName  = message.agentName  || 'irai';
  const agentIcon  = message.agentIcon  || '✦';

  // ── User bubble ──────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          {!!message.images?.length && (
            <View style={styles.imagesRow}>
              {message.images.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.userImage} />
              ))}
            </View>
          )}
          {!!message.content && (
            <Text style={styles.userText}>{message.content}</Text>
          )}
        </View>
      </View>
    );
  }

  // ── Pipeline step (collapsible) ──────────────────────────────────────────
  if (isPipeline) {
    return (
      <TouchableOpacity
        style={styles.pipelineBlock}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.85}>
        <Text style={[styles.pipelineHeader, { color: agentColor }]}>
          {agentIcon} {agentName}
          <Text style={styles.pipelineTag}>{'  '}{expanded ? '▾' : '▸'} step</Text>
        </Text>
        {expanded
          ? <MarkdownRenderer content={message.content} textStyle={styles.pipelineText} />
          : <Text style={styles.pipelinePreview}>
              {message.content.slice(0, 100).replace(/\n/g, ' ')}…
            </Text>
        }
      </TouchableOpacity>
    );
  }

  // ── AI response ──────────────────────────────────────────────────────────
  return (
    <View style={styles.aiBlock}>
      {/* Agent label */}
      <View style={styles.agentRow}>
        <View style={[styles.agentDot, { backgroundColor: agentColor }]} />
        <Text style={styles.agentLabel}>{agentName}</Text>
      </View>

      {/* Content */}
      {isWaiting ? (
        <StreamCursor />
      ) : (
        <>
          {/* While streaming: plain Text to avoid heavy re-parse every token.
              After streaming completes: full MarkdownRenderer for proper blocks. */}
          {isStreaming ? (
            <View style={styles.streamingWrap}>
              <Text style={styles.streamingText}>{message.content}</Text>
              <StreamCursor />
            </View>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </>
      )}

      {/* Token speed */}
      {!isStreaming && !!message.tokensPerSec && message.tokensPerSec > 0 && (
        <Text style={styles.meta}>
          {message.tokensPerSec.toFixed(1)} tok/s · {message.tokens} tokens
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ── User ──────────────────────────────────────────────────────────────────
  userRow: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '86%',
    backgroundColor: colors.userBubble,
    borderRadius: borderRadius.xl + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  userText: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.md,
    color: colors.userBubbleText,
    lineHeight: 21,
  },
  imagesRow: {
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

  // ── AI ────────────────────────────────────────────────────────────────────
  aiBlock: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  agentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  agentLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  streamingWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  streamingText: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 23,
    flexShrink: 1,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 6,
  },
  cursorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 8,
  },

  // ── Pipeline ──────────────────────────────────────────────────────────────
  pipelineBlock: {
    marginVertical: 3,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.cardBorder,
  },
  pipelineHeader: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  pipelineTag: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  pipelineText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  pipelinePreview: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
