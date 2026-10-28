/* Agents — the data, ported verbatim from the deployed dashboard
   (fds-dashboard-one.vercel.app/ritvik/agents): the model catalogue, the
   knowledge / tool / skill / feature pickers, the schedule and trigger
   choices, the HomeWatt output schema, the agent defaults and the nine
   agents. Nothing here renders. */

export type AgentType = 'Chat' | 'Task' | 'Manager' | 'Voice';
export type AgentStatus = 'deployed' | 'draft';
export type AgentMode = 'build' | 'playground' | 'deploy';
export type FeatureTone = 'brand' | 'info' | 'positive' | 'notice' | 'negative';

export interface Model { id: string; provider: string; name: string }
export interface PickItem { id: string; name: string; description: string }
export interface Feature extends PickItem { tone: FeatureTone }
export interface Schedule { id: string; when: string; message: string }
export interface Trigger { id: string; event: string; filter: string }

export interface Agent {
    id: string;
    name: string;
    description: string;
    type: AgentType;
    status: AgentStatus;
    role: string;
    goal: string;
    instructions: string;
    model: { id: string; temperature: number; maxTokens: number; fallbackId: string | null };
    output: { kind: 'text' } | { kind: 'json'; schema: string };
    knowledge: string[];
    tools: string[];
    skills: string[];
    subAgents: string[];
    schedules: Schedule[];
    triggers: Trigger[];
    features: string[];
    access: 'organization' | 'private';
    monthlyBudget: number;
    version: number;
    modifiedMinutesAgo: number;
    modifiedBy: string;
}

export const MODELS: Model[] = [
    { id: 'claude-sonnet-4-6', provider: 'Anthropic', name: 'claude-sonnet-4-6' },
    { id: 'claude-opus-4-6', provider: 'Anthropic', name: 'claude-opus-4-6' },
    { id: 'claude-fable-5-1', provider: 'Anthropic', name: 'claude-fable-5-1' },
    { id: 'gpt-5.5', provider: 'OpenAI', name: 'gpt-5.5' },
    { id: 'gpt-6-sol', provider: 'OpenAI', name: 'gpt-6-sol' },
    { id: 'gpt-3.5-turbo', provider: 'OpenAI', name: 'gpt-3.5-turbo' },
];

export const modelLabel = (id: string) => {
    const m = MODELS.find((x) => x.id === id);
    return m ? `${m.provider} / ${m.name}` : id;
};

export const KNOWLEDGE: PickItem[] = [
    { id: 'manuals', name: 'Equipment manuals', description: '142 PDFs · chillers, compressors, boilers' },
    { id: 'sops', name: 'SOP library', description: '86 standard operating procedures' },
    { id: 'tariffs', name: 'Energy tariffs 2026', description: 'Utility rate cards for every site' },
    { id: 'alarm-history', name: 'Alarm history', description: '18 months of alarms and resolutions' },
    { id: 'uns', name: 'UNS plant model', description: 'Sites, areas, lines and assets' },
];

export const TOOLS: PickItem[] = [
    { id: 'iosense-data', name: 'I/O Sense Data API', description: 'Read live and historical tag values' },
    { id: 'work-order', name: 'Create work order', description: 'Raise a maintenance ticket' },
    { id: 'email', name: 'Send email', description: 'Mail a person or a distribution list' },
    { id: 'teams', name: 'Post to Teams', description: 'Message a channel' },
    { id: 'sql', name: 'SQL query', description: 'Run read-only queries on the historian' },
    { id: 'http', name: 'HTTP request', description: 'Call an external REST endpoint' },
    { id: 'web-search', name: 'Web search', description: 'Search the public web' },
];

export const SKILLS: PickItem[] = [
    { id: 'trend', name: 'Trend summary', description: 'Describe how a series changed and when' },
    { id: 'rca', name: 'Root-cause analysis', description: 'Rank likely causes with evidence' },
    { id: 'report', name: 'Report writing', description: 'Structured shift and monthly reports' },
    { id: 'units', name: 'Unit conversion', description: 'kWh ↔ MJ, °C ↔ °F, m³ ↔ gal' },
    { id: 'forecast', name: 'Short-term forecast', description: 'Next 24h from recent history' },
];

export const FEATURES: Feature[] = [
    { id: 'memory', name: 'Memory', description: 'Remembers the conversation and earlier sessions. Short- and long-term.', tone: 'brand' },
    { id: 'data-query', name: 'Data Query', description: 'Answers questions by querying and reading data from your sources.', tone: 'info' },
    { id: 'responsible-ai', name: 'Responsible AI', description: 'Checks answers for safety, fairness and reliability before they go out.', tone: 'positive' },
    { id: 'human-approval', name: 'Human approval', description: 'Pauses before any tool that changes something, until a person approves.', tone: 'notice' },
    { id: 'citations', name: 'Citations', description: 'Links every claim to the document or data point it came from.', tone: 'info' },
    { id: 'pii', name: 'PII redaction', description: 'Masks names, emails and phone numbers in inputs and logs.', tone: 'negative' },
];

export const SCHEDULE_TIMES = ['Every hour', 'Every day at 08:00', 'Every day at 18:00', 'Every Monday at 09:00', 'First day of the month at 07:00'];

export const TRIGGER_EVENTS = ['Alarm raised', 'Device went offline', 'Threshold crossed', 'Report generated', 'Webhook received'];

export const HOMEWATT_SCHEMA = `{
  "status": "success" | "error",
  "result": {
    "short_summary": "...",
    "notable_observations": [{ "classification": "observed" | "possible" | "estimate" | "safety_note", "text": "..." }],
    "actions": [{ "classification": "routine" | "monitor" | "professional_help", "action": "...", "reason": "..." }]
  },
  "message": "..."
}`;

/** The JSON schema a text agent starts from when switched to JSON. */
export const BLANK_SCHEMA = `{
  "status": "success" | "error",
  "result": { },
  "message": "..."
}`;

type AgentDefaults = Pick<Agent, 'model' | 'output' | 'knowledge' | 'tools' | 'skills' | 'subAgents' | 'schedules' | 'triggers' | 'features' | 'access' | 'monthlyBudget' | 'version'>;

export const AGENT_DEFAULTS: AgentDefaults = {
    model: { id: 'claude-sonnet-4-6', temperature: 0.3, maxTokens: 4096, fallbackId: null },
    output: { kind: 'text' },
    knowledge: [],
    tools: [],
    skills: [],
    subAgents: [],
    schedules: [],
    triggers: [],
    features: [],
    access: 'organization',
    monthlyBudget: 200,
    version: 1,
};

export const AGENTS: Agent[] = [
    {
        ...AGENT_DEFAULTS,
        id: 'homewatt-energy-coach',
        name: 'HomeWatt Energy Coach',
        description: 'Explains changes in household consumption, identifies likely peak-use patterns, and returns cautious saving suggestions grounded only in the supplied dashboard snapshot.',
        type: 'Chat',
        status: 'deployed',
        role: 'A cautious household energy coach for homeowners using the HomeWatt dashboard.',
        goal: 'Explain the supplied household consumption snapshot clearly, distinguish observed facts from possibilities, identify likely peak-use patterns without appliance-level certainty, and suggest up to three practical next steps without promising savings.',
        instructions: `You are HomeWatt Energy Coach. Respond only to the current dashboard snapshot supplied by the application for the homeowner. Use only figures and context explicitly present in that snapshot.

Rules:
1. Report direct facts as observations and tie them to the supplied figures or periods. Do not invent readings, dates, tariffs or appliances.
2. Distinguish direct observations from possible explanations. Use cautious language such as "may", "could" or "is consistent with".
3. Clearly label cost figures and other non-measured values as estimates.
4. Return a short summary, notable observations, and no more than three actions.
5. If the supplied data could indicate an electrical safety issue, do not diagnose it — recommend a qualified electrician.
6. If the snapshot is missing, contradictory or insufficient, say so plainly and return an error status.`,
        output: { kind: 'json', schema: HOMEWATT_SCHEMA },
        features: ['responsible-ai'],
        version: 7,
        modifiedMinutesAgo: 42,
        modifiedBy: 'Ritvik Kumar',
    },
    {
        ...AGENT_DEFAULTS,
        id: 'alarm-triage',
        name: 'Alarm Triage',
        description: 'Routes every new alarm to the right specialist agent, merges duplicates and writes a one-line summary for the control room.',
        type: 'Manager',
        status: 'deployed',
        role: 'The control room’s first responder for alarms across all sites.',
        goal: 'Group related alarms, decide which specialist should investigate, and keep the control room informed in one line per incident.',
        instructions: 'When an alarm arrives, check the last 30 minutes of alarms on the same asset and merge duplicates. Hand vibration alarms to Vibration Specialist, steam alarms to Steam Trap Specialist, and compressor alarms to Compressor Fleet Monitor. Post a one-line summary to the control-room channel.',
        model: { id: 'claude-opus-4-6', temperature: 0.2, maxTokens: 2048, fallbackId: 'gpt-5.5' },
        knowledge: ['alarm-history', 'uns'],
        tools: ['iosense-data', 'teams'],
        subAgents: ['vibration-specialist', 'steam-trap-specialist', 'compressor-fleet-monitor'],
        triggers: [{ id: 't1', event: 'Alarm raised', filter: 'Priority 1–2, all sites' }],
        features: ['memory', 'responsible-ai'],
        version: 12,
        modifiedMinutesAgo: 300,
        modifiedBy: 'Nisha Verma',
    },
    {
        ...AGENT_DEFAULTS,
        id: 'vibration-specialist',
        name: 'Vibration Specialist',
        description: 'Reads vibration spectra from rotating equipment and names the likely fault — imbalance, misalignment, bearing wear — with its evidence.',
        type: 'Task',
        status: 'deployed',
        role: 'A reliability engineer specialised in vibration analysis.',
        goal: 'Identify the most likely mechanical fault behind a vibration alarm and recommend the next inspection.',
        instructions: 'Pull the last 7 days of velocity and acceleration for the asset. Compare against ISO 10816 zones. Rank up to three likely faults with the frequency evidence for each.',
        model: { id: 'claude-opus-4-6', temperature: 0.1, maxTokens: 4096, fallbackId: null },
        knowledge: ['manuals'],
        tools: ['iosense-data', 'work-order'],
        skills: ['rca', 'trend'],
        features: ['data-query', 'citations'],
        version: 9,
        modifiedMinutesAgo: 1560,
        modifiedBy: 'Dev Patel',
    },
    {
        ...AGENT_DEFAULTS,
        id: 'steam-trap-specialist',
        name: 'Steam Trap Specialist',
        description: 'Finds failed-open and failed-closed steam traps from temperature and ultrasound data, and estimates the steam lost.',
        type: 'Task',
        status: 'deployed',
        role: 'A steam systems engineer.',
        goal: 'Classify each trap’s condition and estimate annual steam loss for the failed ones.',
        instructions: 'Use inlet/outlet temperature differential and ultrasound level. Classify as OK, leaking, blow-through or blocked. Estimate loss in kg/h and cost per year as an estimate.',
        tools: ['iosense-data', 'sql'],
        skills: ['units'],
        features: ['data-query'],
        version: 4,
        modifiedMinutesAgo: 4320,
        modifiedBy: 'Dev Patel',
    },
    {
        ...AGENT_DEFAULTS,
        id: 'compressor-fleet-monitor',
        name: 'Compressor Fleet Monitor',
        description: 'Watches every air compressor for load/unload imbalance, leaks and specific-power drift, and flags the worst three each morning.',
        type: 'Task',
        status: 'deployed',
        role: 'A compressed-air efficiency analyst.',
        goal: 'Keep specific power within 10% of design across the compressor fleet.',
        instructions: 'Each morning, compute specific power (kW per m³/min) for every compressor over the last 24 hours. Flag the three furthest from design, with the likely cause.',
        model: { id: 'gpt-5.5', temperature: 0.2, maxTokens: 2048, fallbackId: null },
        tools: ['iosense-data', 'email'],
        skills: ['trend'],
        schedules: [{ id: 's1', when: 'Every day at 08:00', message: 'Rank the compressor fleet by specific-power drift.' }],
        version: 3,
        modifiedMinutesAgo: 8640,
        modifiedBy: 'Ritu Sharma',
    },
    {
        ...AGENT_DEFAULTS,
        id: 'shift-report-writer',
        name: 'Shift Report Writer',
        description: 'Writes the end-of-shift report: output, OEE, downtime by cause and open issues, ready to send to the plant manager.',
        type: 'Task',
        status: 'deployed',
        role: 'A production supervisor writing the shift handover.',
        goal: 'Produce a complete, accurate shift report in under a minute.',
        instructions: 'Summarise output vs plan, OEE (availability, performance, quality), the top three downtime causes with minutes, and anything the next shift must watch.',
        tools: ['iosense-data', 'email'],
        skills: ['report'],
        schedules: [{ id: 's1', when: 'Every day at 18:00', message: 'Write the day-shift report for Line 1–4.' }],
        features: ['citations'],
        version: 5,
        modifiedMinutesAgo: 2880,
        modifiedBy: 'Kiran Rao',
    },
    {
        ...AGENT_DEFAULTS,
        id: 'boiler-efficiency-analyst',
        name: 'Boiler Efficiency Analyst',
        description: 'Tracks boiler efficiency by the indirect method and explains each point lost — excess air, stack temperature, blowdown.',
        type: 'Chat',
        status: 'draft',
        role: 'A boiler efficiency engineer.',
        goal: 'Explain where efficiency is being lost and what to adjust first.',
        instructions: 'Use flue gas O₂, stack temperature and blowdown rate. Break losses down by source and suggest the single highest-value adjustment.',
        knowledge: ['manuals', 'tariffs'],
        tools: ['iosense-data'],
        skills: ['rca', 'units'],
        version: 2,
        modifiedMinutesAgo: 12960,
        modifiedBy: 'Ritvik Kumar',
    },
    {
        ...AGENT_DEFAULTS,
        id: 'neuse-river-plant-copilot',
        name: 'Neuse River Plant Copilot',
        description: 'Answers operators’ questions about the Neuse River plant by voice — live readings, procedures and who to call.',
        type: 'Voice',
        status: 'deployed',
        role: 'A friendly plant assistant operators can talk to hands-free.',
        goal: 'Answer operator questions about the plant quickly and safely, by voice.',
        instructions: 'Keep answers under 20 seconds of speech. Read numbers with units. For anything safety-related, read the SOP step verbatim and name the on-call engineer.',
        model: { id: 'gpt-6-sol', temperature: 0.4, maxTokens: 1024, fallbackId: 'claude-sonnet-4-6' },
        knowledge: ['sops', 'uns'],
        tools: ['iosense-data'],
        features: ['memory', 'responsible-ai', 'pii'],
        version: 6,
        modifiedMinutesAgo: 20160,
        modifiedBy: 'Nisha Verma',
    },
    {
        ...AGENT_DEFAULTS,
        id: 'onboarding-guide',
        name: 'Onboarding Guide',
        description: 'Walks a new user through I/O Sense — their plants, dashboards and alerts — in their first week.',
        type: 'Chat',
        status: 'draft',
        role: 'A patient product guide for new I/O Sense users.',
        goal: 'Get a new user to their first useful dashboard and alert within a week.',
        instructions: 'Ask what the user is responsible for, then show them the two dashboards and one alert that matter most for that job.',
        model: { id: 'claude-fable-5-1', temperature: 0.6, maxTokens: 2048, fallbackId: null },
        knowledge: ['uns'],
        features: ['memory'],
        access: 'private',
        version: 1,
        modifiedMinutesAgo: 30240,
        modifiedBy: 'Ritvik Kumar',
    },
];

/** The signed-in author every edit is stamped with. */
export const CURRENT_USER = 'Ritvik Kumar';

/** A new draft agent (the Create agent dialog and Duplicate). */
export const newAgent = (name: string, description: string, type: AgentType): Agent => ({
    ...AGENT_DEFAULTS,
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36).slice(-4)}`,
    name,
    description,
    type,
    status: 'draft',
    role: '',
    goal: '',
    instructions: '',
    modifiedMinutesAgo: 0,
    modifiedBy: CURRENT_USER,
});

/** "42 min ago", "5 h ago", "3 days ago", then a date (the demo's "now" is 7 Oct 2026, 15:30). */
export const timeAgo = (minutes: number) => {
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
    const days = Math.round(minutes / 1440);
    return days < 14
        ? `${days} ${days === 1 ? 'day' : 'days'} ago`
        : new Date(new Date(2026, 9, 7, 15, 30).getTime() - minutes * 6e4).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const STATUS: Record<AgentStatus, { label: string; color: 'Positive' | 'Neutral' }> = {
    deployed: { label: 'Deployed', color: 'Positive' },
    draft: { label: 'Draft', color: 'Neutral' },
};

export const TEMPERATURES = [
    { value: '0.1', title: 'Precise · 0.1', description: 'Same answer every time — reports, classification' },
    { value: '0.3', title: 'Balanced · 0.3', description: 'Steady with some flexibility — most agents' },
    { value: '0.6', title: 'Creative · 0.6', description: 'More varied wording — conversation, drafting' },
];

export const MAX_OUTPUTS = [1024, 2048, 4096, 8192, 16384].map((n) => ({ value: String(n), title: `${n.toLocaleString('en-US')} tokens` }));

/** The temperature preset nearest a stored value. */
export const nearestTemperature = (t: number) =>
    TEMPERATURES.reduce((best, o) => (Math.abs(Number(o.value) - t) < Math.abs(Number(best.value) - t) ? o : best)).value;

/** Playground "Try asking" prompts, by agent type. */
export const TRY_ASKING: Record<AgentType, string[]> = {
    Chat: ['What changed in my usage this week?', 'When is my peak use?', 'Give me three things to try'],
    Task: ['Run now for yesterday', 'Explain what you would check first', 'Show me a sample output'],
    Manager: ['Triage: Chiller 3 high discharge pressure', 'Who would you hand a vibration alarm to?', 'Summarise open incidents'],
    Voice: ['What is the boiler pressure right now?', 'Read me the lockout procedure for Pump 4', 'Who is on call tonight?'],
};

/** The version-history list for an agent: the last six versions. */
export const versionHistory = (a: Agent) =>
    Array.from({ length: Math.min(a.version, 6) }, (_, n) => ({
        v: a.version - n,
        by: n === 0 ? a.modifiedBy : ['Ritvik Kumar', 'Nisha Verma', 'Dev Patel'][n % 3],
        minutesAgo: a.modifiedMinutesAgo + n * 60 * 24 * 2,
        note: n === 0 ? 'Current version' : ['Tightened the instructions', 'Changed the model', 'Added a tool', 'Turned on memory', 'First version'][(n - 1) % 5],
    }));

/* ------------------------------------------------------------------ */
/* Deploy                                                              */
/* ------------------------------------------------------------------ */

export const INFERENCE_URL = 'https://agents.iosense.io/v3/inference/chat/';

/** A stable, fake demo key per agent id. */
export const demoKey = (id: string) => {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `sk-iosense-demo-${h.toString(16).padStart(8, '0')}${(h ^ 1597463007).toString(16).padStart(8, '0')}`;
};

export const maskKey = (key: string) => `${key.slice(0, 15)}${'•'.repeat(24)}`;

export const curlFor = (a: Agent, key: string) => `curl -X POST '${INFERENCE_URL}' \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: ${key}' \\
  -d '{
    "user_id": "user@company.com",
    "agent_id": "${a.id}",
    "session_id": "${a.id}-session-1",
    "message": ""
  }'`;

export const agentCard = (a: Agent) =>
    JSON.stringify(
        {
            name: a.name,
            description: a.description,
            url: `https://agents.iosense.io/a2a/${a.id}`,
            version: String(a.version),
            capabilities: { streaming: true, pushNotifications: a.triggers.length > 0 },
            defaultInputModes: ['text'],
            defaultOutputModes: [a.output.kind === 'json' ? 'application/json' : 'text'],
            skills: [{ id: a.id, name: a.name, description: a.goal || a.description }],
        },
        null,
        2,
    );

export const agentJson = (a: Agent) =>
    JSON.stringify(
        {
            id: a.id,
            name: a.name,
            type: a.type,
            version: a.version,
            role: a.role,
            goal: a.goal,
            instructions: a.instructions,
            model: { ...a.model, label: modelLabel(a.model.id) },
            output: a.output,
            knowledge: a.knowledge,
            tools: a.tools,
            skills: a.skills,
            managed_agents: a.subAgents,
            automation: { schedules: a.schedules, triggers: a.triggers },
            features: a.features,
            access: a.access,
            monthly_budget_usd: a.monthlyBudget,
        },
        null,
        2,
    );

export const fetchExample = (a: Agent) => `const res = await fetch('${INFERENCE_URL}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.IOSENSE_AGENT_KEY },
  body: JSON.stringify({
    user_id: currentUser.email,
    agent_id: '${a.id}',
    session_id: sessionId,        // reuse it to keep the conversation
    message: userInput,
  }),
});
const { response } = await res.json();${a.output.kind === 'json' ? '  // JSON, in the schema set under Output format' : ''}`;

/* ------------------------------------------------------------------ */
/* Playground — simulated replies                                      */
/* ------------------------------------------------------------------ */

export interface Turn {
    id: string;
    question: string;
    files: { name: string; type?: string }[];
    answer: string;
    isJson: boolean;
    steps: string[];
    tool: { name: string; input: Record<string, unknown>; output: Record<string, unknown> } | null;
    model: string;
    ms: number;
}

export const randomId = () => Math.random().toString(36).slice(2, 9);

export function simulateTurn(a: Agent, question: string, model: string, files: Turn['files']): Turn {
    const toolId = a.tools[0];
    const tool = toolId ? TOOLS.find((t) => t.id === toolId) ?? null : null;
    const steps = [
        'Read the question and the session so far',
        ...a.knowledge.slice(0, 2).map((k) => `Searched ${KNOWLEDGE.find((x) => x.id === k)?.name}`),
        ...(tool ? [`Called ${tool.name}`] : []),
        a.output.kind === 'json' ? 'Shaped the answer to the output schema' : 'Wrote the answer',
    ];
    const answer =
        a.output.kind === 'json'
            ? JSON.stringify(
                  {
                      status: 'success',
                      result: {
                          short_summary: `“${question.replace(/\?$/, '')}”: the supplied data shows an evening peak between 18:00 and 21:00, about 22% above the weekly average.`,
                          notable_observations: [
                              { classification: 'observed', text: 'Consumption rose from 182 kWh to 214 kWh week on week.' },
                              { classification: 'possible', text: 'The evening rise is consistent with heating or cooking load; the data does not say which.' },
                              { classification: 'estimate', text: 'At the supplied tariff the extra use is roughly $9 for the week (estimate).' },
                          ],
                          actions: [
                              { classification: 'monitor', action: 'Compare the next two evenings against this week.', reason: 'Confirms whether the peak is a pattern.' },
                              { classification: 'routine', action: 'Shift one flexible load after 21:00.', reason: 'Moves use out of the peak window.' },
                          ],
                      },
                      message: 'Figures come only from the supplied snapshot; savings are not guaranteed.',
                  },
                  null,
                  2,
              )
            : `${a.type === 'Voice' ? 'Here’s the short version.' : 'Here’s what I found.'}

- ${tool ? `**${tool.name}**, last 24 hours: nothing abnormal outside **14:10–14:40**, when the value ran **12%** above its usual range.` : 'Working only from what you told me, nothing points to a fault.'}
- The most likely explanation is a load change on **Line 2** — the data alone can’t confirm it.
- **Next step:** compare the same window tomorrow, and raise a work order if it repeats.`;
    return {
        id: randomId(),
        question,
        files,
        answer,
        isJson: a.output.kind === 'json',
        steps,
        tool: tool
            ? {
                  name: tool.id.replace(/-/g, '_'),
                  input: { asset: 'Line 2', window: 'last 24h' },
                  output: { points: 1440, anomalies: [{ from: '14:10', to: '14:40', deviation: '+12%' }] },
              }
            : null,
        model,
        ms: 1800 + Math.round(Math.random() * 900),
    };
}
