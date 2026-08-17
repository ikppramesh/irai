import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useAppStore } from '../store/useAppStore';
import { colors, spacing, fontSizes, borderRadius } from '../theme';

const SettingSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) => (
  <View style={settingStyles.container}>
    <View style={settingStyles.row}>
      <Text style={settingStyles.label}>{label}</Text>
      <Text style={settingStyles.value}>{format ? format(value) : value}</Text>
    </View>
    <Slider
      style={settingStyles.slider}
      minimumValue={min}
      maximumValue={max}
      step={step}
      value={value}
      onValueChange={onChange}
      minimumTrackTintColor={colors.primary}
      maximumTrackTintColor={colors.cardBorder}
      thumbTintColor={colors.primary}
    />
  </View>
);

const settingStyles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  label: { fontSize: fontSizes.sm, color: colors.text, fontWeight: '600' },
  value: { fontSize: fontSizes.sm, color: colors.primary, fontWeight: '700' },
  slider: { height: 40 },
});

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, llamaContext } = useAppStore();

  const handleReset = () => {
    Alert.alert('Reset Settings', 'Reset all settings to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () =>
          updateSettings({
            systemPrompt: 'You are irai, a helpful, harmless, and honest AI assistant running completely offline on this device. Be concise and helpful.',
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 512,
            contextLength: 2048,
          }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GENERATION</Text>
          <View style={styles.card}>
            <SettingSlider
              label="Temperature"
              value={settings.temperature}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => updateSettings({ temperature: Math.round(v * 20) / 20 })}
              format={(v) => v.toFixed(2)}
            />
            <SettingSlider
              label="Top P"
              value={settings.topP}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => updateSettings({ topP: Math.round(v * 20) / 20 })}
              format={(v) => v.toFixed(2)}
            />
            <SettingSlider
              label="Max Tokens"
              value={settings.maxTokens}
              min={64}
              max={2048}
              step={64}
              onChange={(v) => updateSettings({ maxTokens: Math.round(v) })}
            />
            <SettingSlider
              label="Context Length"
              value={settings.contextLength}
              min={512}
              max={8192}
              step={512}
              onChange={(v) => updateSettings({ contextLength: Math.round(v) })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYSTEM PROMPT</Text>
          <TextInput
            style={styles.promptInput}
            value={settings.systemPrompt}
            onChangeText={(v) => updateSettings({ systemPrompt: v })}
            multiline
            placeholder="System prompt..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MEMORY</Text>
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: '600' }}>Auto-Memory</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSizes.xs, marginTop: 2 }}>
                  Remembers facts from your messages · works across all models
                </Text>
              </View>
              <Switch
                value={settings.memoryEnabled}
                onValueChange={(v) => updateSettings({ memoryEnabled: v })}
                trackColor={{ false: colors.cardBorder, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.card}>
            <Text style={styles.aboutTitle}>irai</Text>
            <Text style={styles.aboutText}>Offline AI assistant powered by llama.cpp</Text>
            <Text style={styles.aboutText}>Version 1.0.0</Text>
            {llamaContext && (
              <Text style={[styles.aboutText, { color: colors.success, marginTop: spacing.sm }]}>
                Model loaded and ready
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text },
  resetText: { color: colors.error, fontSize: fontSizes.sm },
  scroll: { flex: 1 },
  section: { padding: spacing.md },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  promptInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: fontSizes.sm,
    padding: spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  aboutTitle: { fontSize: fontSizes.lg, fontWeight: '800', color: colors.primary, marginBottom: spacing.xs },
  aboutText: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },
});
