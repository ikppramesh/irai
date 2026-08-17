import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { AGENTS, MULTI_AGENT_PIPELINE, getAgent, Agent } from '../utils/agents';
import { colors, spacing, fontSizes, borderRadius } from '../theme';

export const AgentsScreen: React.FC = () => {
  const { activeAgentId, isMultiAgentMode, setActiveAgentId, setMultiAgentMode } = useAppStore();

  const renderAgentCard = (agent: Agent) => {
    const isActive = activeAgentId === agent.id && !isMultiAgentMode;
    return (
      <TouchableOpacity
        key={agent.id}
        style={[styles.agentCard, isActive && { borderColor: agent.color, borderWidth: 2 }]}
        onPress={() => {
          setActiveAgentId(agent.id);
          setMultiAgentMode(false);
        }}
        activeOpacity={0.8}>
        <View style={[styles.agentIconBg, { backgroundColor: agent.color + '22' }]}>
          <Text style={styles.agentIcon}>{agent.icon}</Text>
        </View>
        <View style={styles.agentInfo}>
          <Text style={[styles.agentName, isActive && { color: agent.color }]}>{agent.name}</Text>
          <Text style={styles.agentDesc}>{agent.description}</Text>
        </View>
        {isActive && (
          <View style={[styles.activeDot, { backgroundColor: agent.color }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Agents</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Multi-Agent Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MULTI-AGENT MODE</Text>
          <View style={[styles.multiCard, isMultiAgentMode && styles.multiCardActive]}>
            <View style={styles.multiHeader}>
              <View>
                <Text style={styles.multiTitle}>🔮 Agent Discussion</Text>
                <Text style={styles.multiSubtitle}>Multiple agents collaborate for best result</Text>
              </View>
              <Switch
                value={isMultiAgentMode}
                onValueChange={(val) => {
                  setMultiAgentMode(val);
                  if (val) setActiveAgentId('general');
                }}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor={isMultiAgentMode ? '#fff' : colors.textSecondary}
              />
            </View>

            {isMultiAgentMode && (
              <View style={styles.pipeline}>
                <Text style={styles.pipelineTitle}>Discussion pipeline:</Text>
                {MULTI_AGENT_PIPELINE.map((step, i) => {
                  const agent = getAgent(step.agentId);
                  const isLast = i === MULTI_AGENT_PIPELINE.length - 1;
                  return (
                    <View key={i} style={styles.pipelineStep}>
                      <View style={[styles.pipelineNum, { backgroundColor: agent.color }]}>
                        <Text style={styles.pipelineNumText}>{i + 1}</Text>
                      </View>
                      <View style={styles.pipelineInfo}>
                        <Text style={[styles.pipelineAgentName, { color: agent.color }]}>
                          {agent.icon} {agent.name}
                        </Text>
                        <Text style={styles.pipelineRole}>
                          {isLast ? '✨ Synthesizes final answer' : step.role === 'critique' ? '🔍 Reviews & critiques' : '💡 Analyzes & reasons'}
                        </Text>
                      </View>
                      {!isLast && <Text style={styles.pipelineArrow}>↓</Text>}
                    </View>
                  );
                })}
                <View style={styles.pipelineSummary}>
                  <Text style={styles.pipelineSummaryText}>
                    Each agent builds on the previous one. The final agent synthesizes all perspectives into the best possible answer for you.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Single Agents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SINGLE AGENT</Text>
          {AGENTS.map(renderAgentCard)}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text },
  scroll: { flex: 1 },
  section: { padding: spacing.md },
  sectionTitle: {
    fontSize: fontSizes.xs, fontWeight: '700',
    color: colors.textMuted, letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // Multi-agent
  multiCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  multiCardActive: { borderColor: colors.primary },
  multiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  multiTitle: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginBottom: 4 },
  multiSubtitle: { fontSize: fontSizes.xs, color: colors.textSecondary },

  pipeline: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  pipelineTitle: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
  pipelineStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm, position: 'relative' },
  pipelineNum: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm, marginTop: 2,
  },
  pipelineNumText: { color: '#fff', fontSize: fontSizes.xs, fontWeight: '800' },
  pipelineInfo: { flex: 1 },
  pipelineAgentName: { fontSize: fontSizes.sm, fontWeight: '700', marginBottom: 2 },
  pipelineRole: { fontSize: fontSizes.xs, color: colors.textSecondary },
  pipelineArrow: { color: colors.textMuted, fontSize: fontSizes.md, marginLeft: spacing.sm },
  pipelineSummary: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  pipelineSummaryText: { fontSize: fontSizes.xs, color: colors.textSecondary, lineHeight: 18 },

  // Agent cards
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.md,
  },
  agentIconBg: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  agentIcon: { fontSize: 22 },
  agentInfo: { flex: 1 },
  agentName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text, marginBottom: 4 },
  agentDesc: { fontSize: fontSizes.xs, color: colors.textSecondary },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
});
