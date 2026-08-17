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
  const agentLabel = isMultiAgentMode ? 'MULTI-AGENT' : agent.name.toUpperCase();

  return (
    <View style={styles.row}>
      {/* Agent indicator */}
      <TouchableOpacity
        style={[styles.chip, { borderColor: agentColor + '66' }]}
        onPress={() => navigation.navigate('Agents')}>
        <Text style={[styles.chipLabel, { color: agentColor }]}>
          {`[${agentLabel}]`}
        </Text>
      </TouchableOpacity>

      {/* Model indicator */}
      <TouchableOpacity
        style={[styles.chip, styles.modelChip]}
        onPress={() => navigation.navigate('Models')}>
        {isModelLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.modelDot, { color: currentModel ? colors.success : colors.error }]}>
            {currentModel ? '●' : '○'}
          </Text>
        )}
        <Text style={styles.modelName} numberOfLines={1}>
          {isModelLoading ? 'LOADING...' : currentModel ? currentModel.name.toUpperCase() : 'NO MODEL'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryDark,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 5,
  },
  modelChip: {
    flex: 1,
    borderColor: colors.primaryDark,
  },
  chipLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modelDot: {
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  modelName: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.text,
    letterSpacing: 0.3,
  },
});
