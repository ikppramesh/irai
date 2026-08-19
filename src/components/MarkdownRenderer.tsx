/**
 * Lightweight markdown renderer.
 * Handles: fenced code blocks, inline code, **bold**, *italic*,
 * # headings, and - bullet lists.
 * No external dependencies — pure React Native.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { colors, fonts, fontSizes, spacing, borderRadius } from '../theme';

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace' }) ?? 'monospace';

// ── Segment types ─────────────────────────────────────────────────────────────
type Segment =
  | { type: 'text';  content: string }
  | { type: 'code';  language: string; content: string };

// ── Parser: split raw text into text/code segments ───────────────────────────
function parseSegments(raw: string): Segment[] {
  const out: Segment[] = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      out.push({ type: 'text', content: raw.slice(last, m.index) });
    }
    out.push({
      type: 'code',
      language: (m[1]?.trim() || 'code').toLowerCase(),
      content: m[2].trimEnd(),
    });
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    out.push({ type: 'text', content: raw.slice(last) });
  }
  return out;
}

// ── Inline parser: bold / italic / inline-code within a line ─────────────────
type InlinePart = { t: string; bold?: true; italic?: true; code?: true };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('`'))  parts.push({ t: tok.slice(1, -1), code: true });
    else if (tok.startsWith('**')) parts.push({ t: tok.slice(2, -2), bold: true });
    else parts.push({ t: tok.slice(1, -1), italic: true });
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push({ t: text.slice(last) });
  return parts;
}

// ── InlineLine: render one line with inline formatting ───────────────────────
const InlineLine: React.FC<{ text: string; style: any }> = ({ text, style }) => {
  const parts = parseInline(text);
  return (
    <Text style={style}>
      {parts.map((p, i) => {
        if (p.code)   return <Text key={i} style={[style, mdStyles.inlineCode]}>{p.t}</Text>;
        if (p.bold)   return <Text key={i} style={[style, { fontWeight: '700' }]}>{p.t}</Text>;
        if (p.italic) return <Text key={i} style={[style, { fontStyle: 'italic' }]}>{p.t}</Text>;
        return <Text key={i}>{p.t}</Text>;
      })}
    </Text>
  );
};

// ── TextBlock: render a text segment line-by-line with heading/bullet support ─
const TextBlock: React.FC<{ content: string; baseStyle: any }> = ({ content, baseStyle }) => {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let bulletGroup: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletGroup.length === 0) return;
    nodes.push(
      <View key={key} style={mdStyles.bulletGroup}>
        {bulletGroup.map((b, bi) => (
          <View key={bi} style={mdStyles.bulletRow}>
            <Text style={[baseStyle, mdStyles.bulletDot]}>•</Text>
            <InlineLine text={b} style={[baseStyle, mdStyles.bulletText]} />
          </View>
        ))}
      </View>,
    );
    bulletGroup = [];
  };

  lines.forEach((line, li) => {
    // Heading 1–3
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    // Numbered list  1. item
    const num = line.match(/^\d+\. (.+)/);
    // Bullet list  - item  or  * item
    const bull = line.match(/^[-*•] (.+)/);

    if (h1 || h2 || h3) {
      flushBullets(`bf${li}`);
      const txt = (h1 || h2 || h3)![1];
      const lvl = h1 ? 1 : h2 ? 2 : 3;
      nodes.push(
        <InlineLine
          key={li}
          text={txt}
          style={[baseStyle, mdStyles[`h${lvl}` as 'h1' | 'h2' | 'h3']]}
        />,
      );
    } else if (bull) {
      bulletGroup.push(bull[1]);
    } else if (num) {
      flushBullets(`bf${li}`);
      nodes.push(
        <View key={li} style={mdStyles.bulletRow}>
          <Text style={[baseStyle, mdStyles.bulletDot]}>{line.match(/^\d+/)![0]}.</Text>
          <InlineLine text={num[1]} style={[baseStyle, mdStyles.bulletText]} />
        </View>,
      );
    } else {
      flushBullets(`bf${li}`);
      if (line === '') {
        nodes.push(<View key={li} style={{ height: 6 }} />);
      } else {
        nodes.push(<InlineLine key={li} text={line} style={baseStyle} />);
      }
    }
  });
  flushBullets('end');

  return <View>{nodes}</View>;
};

// ── CodeBlock: header bar + scrollable monospace content ─────────────────────
const CodeBlock: React.FC<{ language: string; content: string }> = ({ language, content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={mdStyles.codeWrapper}>
      {/* Header bar */}
      <View style={mdStyles.codeHeader}>
        <Text style={mdStyles.codeLang}>{language}</Text>
        <TouchableOpacity
          style={[mdStyles.copyBtn, copied && mdStyles.copyBtnDone]}
          onPress={handleCopy}
          activeOpacity={0.7}>
          <Text style={[mdStyles.copyBtnText, copied && mdStyles.copyBtnTextDone]}>
            {copied ? '✓  Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Code body — horizontal scroll for long lines */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={mdStyles.codeScroll}
        contentContainerStyle={mdStyles.codeScrollContent}>
        <Text selectable style={mdStyles.codeText}>
          {content}
        </Text>
      </ScrollView>
    </View>
  );
};

// ── Public API ────────────────────────────────────────────────────────────────
interface Props {
  content: string;
  /** Override the base text style (color, size, font) */
  textStyle?: any;
}

export const MarkdownRenderer: React.FC<Props> = ({ content, textStyle }) => {
  const base = [mdStyles.baseText, textStyle];
  const segments = parseSegments(content);

  return (
    <View>
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <CodeBlock key={i} language={seg.language} content={seg.content} />
        ) : seg.content.trim() ? (
          <TextBlock key={i} content={seg.content} baseStyle={base} />
        ) : null,
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const mdStyles = StyleSheet.create({
  baseText: {
    fontFamily: fonts.sans,
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 23,
  },

  // Headings
  h1: { fontSize: fontSizes.xl,  fontWeight: '700', marginTop: 10, marginBottom: 4, color: colors.text },
  h2: { fontSize: fontSizes.lg,  fontWeight: '700', marginTop: 8,  marginBottom: 3, color: colors.text },
  h3: { fontSize: fontSizes.md,  fontWeight: '700', marginTop: 6,  marginBottom: 2, color: colors.text },

  // Inline code
  inlineCode: {
    fontFamily: MONO,
    fontSize: fontSizes.sm,
    color: colors.primary,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },

  // Bullet lists
  bulletGroup: { marginVertical: 2 },
  bulletRow: { flexDirection: 'row', marginVertical: 1, paddingLeft: 4 },
  bulletDot: {
    width: 18,
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 23,
  },
  bulletText: { flex: 1, lineHeight: 23 },

  // ── Code block ──────────────────────────────────────────────────────────────
  codeWrapper: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  codeLang: {
    fontFamily: MONO,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'lowercase',
  },
  copyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
  copyBtnDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  copyBtnText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  copyBtnTextDone: {
    color: colors.primary,
  },
  codeScroll: {
    backgroundColor: '#111111',
  },
  codeScrollContent: {
    padding: spacing.md,
  },
  codeText: {
    fontFamily: MONO,
    fontSize: 13,
    color: '#E0E0E0',
    lineHeight: 21,
  },
});
