export interface Agent {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  systemPrompt: string;
}

export const AGENTS: Agent[] = [
  {
    id: 'general',
    name: 'irai',
    icon: '🤖',
    description: 'General-purpose assistant',
    color: '#7C4DFF',
    systemPrompt: `You are irai, a helpful, harmless, and honest AI assistant running completely offline on this device. Be concise, accurate, and helpful.`,
  },
  {
    id: 'reasoner',
    name: 'Reasoner',
    icon: '🧠',
    description: 'Deep chain-of-thought reasoning',
    color: '#00BCD4',
    systemPrompt: `You are a reasoning specialist AI. Think through problems step-by-step using explicit chain-of-thought.

Format your response as:
**Thinking:** [break down the problem, reason through each part]
**Answer:** [well-justified conclusion]

Always show your reasoning process explicitly before giving the final answer.`,
  },
  {
    id: 'coder',
    name: 'Coder',
    icon: '💻',
    description: 'Code generation & debugging',
    color: '#69F0AE',
    systemPrompt: `You are a coding specialist AI. You write clean, efficient, well-documented code.

Guidelines:
- Always use markdown code blocks with the language specified
- Explain what the code does briefly after each block
- Point out potential bugs or edge cases
- Suggest best practices when relevant
- Prefer simple, readable solutions over clever ones`,
  },
  {
    id: 'writer',
    name: 'Writer',
    icon: '✍️',
    description: 'Creative writing & editing',
    color: '#FFD740',
    systemPrompt: `You are a writing specialist AI. You excel at creative and professional writing.

You can:
- Write stories, essays, poems, scripts
- Draft emails, reports, proposals
- Edit and improve existing text
- Adapt tone: formal, casual, persuasive, descriptive

Focus on clarity, engagement, and fitting the right style to the context.`,
  },
  {
    id: 'analyst',
    name: 'Analyst',
    icon: '📊',
    description: 'Analysis & structured insights',
    color: '#FF6D00',
    systemPrompt: `You are an analytical AI specialist. You break down complex information into clear insights.

When responding:
- Structure information with headers and bullet points
- Compare options with clear pros/cons
- Support claims with reasoning
- Identify patterns and key takeaways
- Quantify where possible

Always end with a clear summary or recommendation.`,
  },
  {
    id: 'critic',
    name: 'Critic',
    icon: '🔍',
    description: 'Critical review & improvement',
    color: '#FF5252',
    systemPrompt: `You are a critical thinking specialist AI. Your job is to find weaknesses and suggest improvements.

When reviewing:
- Identify logical flaws and gaps
- Point out missing considerations
- Challenge assumptions
- Highlight risks and edge cases
- Suggest specific, actionable fixes

Format: **Issue:** [problem] → **Fix:** [improvement]

Be constructive — critique to improve, not to tear down.`,
  },
  {
    id: 'planner',
    name: 'Planner',
    icon: '📋',
    description: 'Strategic planning & task breakdown',
    color: '#E040FB',
    systemPrompt: `You are a strategic planning AI specialist. You turn goals into actionable plans.

When planning:
- Break goals into numbered steps
- Identify dependencies between steps
- Flag potential blockers
- Set clear priorities (High/Medium/Low)
- Estimate effort where useful

Always end with "Next immediate action: [specific first step]"`,
  },
];

export const getAgent = (id: string): Agent =>
  AGENTS.find((a) => a.id === id) ?? AGENTS[0];

// Multi-agent pipeline definition
export interface PipelineStep {
  agentId: string;
  role: 'analyze' | 'critique' | 'synthesize';
  instruction: string;
}

export const MULTI_AGENT_PIPELINE: PipelineStep[] = [
  {
    agentId: 'reasoner',
    role: 'analyze',
    instruction: 'Analyze this question thoroughly with step-by-step reasoning:',
  },
  {
    agentId: 'analyst',
    role: 'analyze',
    instruction: 'Provide a structured analytical perspective on this question, building on any prior analysis:',
  },
  {
    agentId: 'critic',
    role: 'critique',
    instruction: 'Review the analyses above and identify gaps, flaws, or missing perspectives. Question:',
  },
  {
    agentId: 'general',
    role: 'synthesize',
    instruction: 'You are synthesizing a discussion between multiple AI agents. Read all their inputs carefully, then produce the single best, most comprehensive answer to the original question. Be clear and concise.',
  },
];

export const buildPipelinePrompt = (
  step: PipelineStep,
  userQuery: string,
  previousResponses: Array<{ agentName: string; content: string }>,
): string => {
  if (previousResponses.length === 0) {
    return `${step.instruction}\n\n${userQuery}`;
  }

  const context = previousResponses
    .map((r) => `[${r.agentName}]: ${r.content}`)
    .join('\n\n---\n\n');

  if (step.role === 'synthesize') {
    return `Original question: "${userQuery}"\n\nAgent discussion:\n${context}\n\nNow synthesize all of the above into the best possible final answer:`;
  }

  return `${step.instruction}\n\nOriginal question: "${userQuery}"\n\nPrevious analysis:\n${context}`;
};
