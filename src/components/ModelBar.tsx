import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { getAgent } from '../utils/agents';
import { colors, spacing, fontSizes, fonts } from '../theme';

export const ModelBar: React.FC = () => {
  const navigation = useNavigation<any>();
  const { currentModel, isModelLoading, activeAgentId, isMultiAgentMode } = useAppStore();
  const agent = getAgent(activeAgentId);

  const agentColor = isMultiAgentMode ? colors.secondary : agent.color;
  const agentLabel = isMultiAgentMode ? 'Multi-agent' : agent.name;

  return (
    <View style={styles.row}>
      {/* Agent indicator */}
      <TouchableOpacity
        style={styles.chip}
        onPress={() => navigation.navigate('Agents')}>
        <View style={[styles.dot, { backgroundColor: agentColor }]} />
        <Text style={styles.chipLabel} numberOfLines={1}>{agentLabel}</Text>
      </TouchableOpacity>

      {/* Model indicator */}
      <TouchableOpacity
        style={[styles.chip, styles.modelChip]}
        onPress={() => navigation.navigate('Models')}>
        {isModelLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={[styles.dot, { backgroundColor: currentModel ? colors.success : colors.textMuted }]} />
        )}
        <Text style={styles.modelName} numberOfLines={1}>
          {isModelLoading ? 'Loading…' : currentModel ? currentModel.name : 'No model loaded'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 6,
  },
  modelChip: {
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.text,
  },
  modelName: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.text,
  },
});
