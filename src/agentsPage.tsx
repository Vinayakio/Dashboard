/* Agents — a port of the deployed dashboard's Agents section
   (fds-dashboard-one.vercel.app/ritvik/agents). The list page (cards or a
   table), and an agent's workspace with three modes: Build (the form),
   Playground (a simulated test chat) and Deploy (API, A2A card, JSON).
   `?agent=<id>&mode=build|playground|deploy` deep-links into a workspace.
   Built only from FDS components; agents.css is layout on FDS tokens. */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from 'react';
import {
    Activity,
    BookOpen,
    Bot,
    Braces,
    CalendarClock,
    CircleCheck,
    CircleQuestionMark,
    Copy,
    Eye,
    EyeOff,
    FileBraces,
    Hammer,
    History,
    Layers,
    LayoutGrid,
    List,
    ListChecks,
    MessageSquareText,
    MessagesSquare,
    Mic,
    Network,
    Plus,
    Rocket,
    ShieldCheck,
    Sparkles,
    SquareTerminal,
    Store,
    Trash,
    WandSparkles,
    Wrench,
    Zap,
    Brain,
    type LucideIcon,
} from 'lucide-react';
import {
    ActionList,
    ActionListItem,
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    CardBody,
    Counter,
    CounterInput,
    Divider,
    DropdownMenu,
    DropdownMenuOverlay,
    DropdownMenuTrigger,
    EmptyState,
    Indicator,
    LinkButton,
    List as BulletList,
    ListItem,
    ListItemCode,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    NoDataOneIllustration,
    Radio,
    RadioGroup,
    ScrollArea,
    SearchInput,
    SelectInput,
    Switch,
    TabItem,
    TabList,
    TabPanel,
    Table,
    Tabs,
    Tag,
    TextArea,
    TextInput,
    useToast,
    type Crumb,
    type TableColumn,
    type TableFilterState,
} from '@faclon-labs/fds';
import {
    AiActions,
    AiChatHistory,
    AiCodeBlock,
    AiComposer,
    AiConversation,
    AiDrawerHome,
    AiMessage,
    AiResponse,
    AiSteps,
    AiThinking,
    AiTool,
    type AiStatus,
} from '@faclon-labs/fds/ai';
import {
    AGENTS,
    BLANK_SCHEMA,
    CURRENT_USER,
    FEATURES,
    KNOWLEDGE,
    MAX_OUTPUTS,
    MODELS,
    SCHEDULE_TIMES,
    SKILLS,
    STATUS,
    TEMPERATURES,
    TOOLS,
    TRIGGER_EVENTS,
    TRY_ASKING,
    agentCard,
    agentJson,
    curlFor,
    demoKey,
    fetchExample,
    maskKey,
    modelLabel,
    nearestTemperature,
    newAgent,
    randomId,
    simulateTurn,
    timeAgo,
    versionHistory,
    type Agent,
    type AgentMode,
    type AgentStatus,
    type AgentType,
    type PickItem,
    type Turn,
} from './agentsData';
import './agents.css';

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const TYPES: Record<AgentType, { icon: LucideIcon; color: 'Brand' | 'Information' | 'Notice' | 'Positive'; blurb: string }> = {
    Chat: { icon: MessagesSquare, color: 'Brand', blurb: 'Talks with people in a chat — answers, explains, follows up.' },
    Task: { icon: ListChecks, color: 'Information', blurb: 'Does one job end to end — on demand, on a schedule or on an event.' },
    Manager: { icon: Network, color: 'Notice', blurb: 'Splits work and hands it to other agents, then combines their answers.' },
    Voice: { icon: Mic, color: 'Positive', blurb: 'Listens and speaks — hands-free help on the plant floor.' },
};
const TYPE_IDS = Object.keys(TYPES) as AgentType[];
const STATUS_IDS: AgentStatus[] = ['deployed', 'draft'];

/** Feedback after an action. S3/G19: only the actions whose result is NOT
 *  on screen call this (copy, publish, delete) — plus every failure. Edits,
 *  creates that open the new item and rows that appear in place get none. */
function useNotify() {
    const { show } = useToast();
    return useCallback((content: string, color: 'Positive' | 'Negative' = 'Positive') => void show({ content, color }), [show]);
}

/** The agent's type mark. An agent is an entity, so it is an Avatar with the
 *  type's glyph, tinted by its category (Avatar R1, R9, R16; G7 — no hand-built
 *  tile). Sizes come from the Avatar scale only. */
function AgentMark({ type, size = 'Medium' }: { type: AgentType; size?: 'XSmall' | 'Small' | 'Medium' | 'Large' }) {
    return <Avatar icon={TYPES[type].icon} color={TYPES[type].color} size={size} accessibilityLabel={`${type} agent`} />;
}

/** A form in a Modal, as FormGroup lays it out (P1 R1, R3, R5, R16, R18): a
 *  native <form>, the fields 16 apart, the actions in ModalFooter — Discard
 *  (primary neutral) then the submit. Dismissing with unsaved input asks first,
 *  as a step of the same modal (Modal: confirm unsaved input in onDismiss;
 *  never nest a second modal). A G18 composite: Modal parts and tokens only. */
export function FormDialog({
    title,
    subtitle,
    size = 'md',
    submitLabel,
    submitIcon,
    isDirty,
    onSubmit,
    onClose,
    initialFocusRef,
    children,
}: {
    title: string;
    subtitle?: string;
    size?: 'sm' | 'md';
    submitLabel: string;
    submitIcon?: ReactNode;
    isDirty: boolean;
    /** Return true when the form was saved and the dialog may close. */
    onSubmit: () => boolean;
    onClose: () => void;
    initialFocusRef?: ComponentProps<typeof Modal>['initialFocusRef'];
    children: ReactNode;
}) {
    const formId = useId();
    const [isLeaving, setIsLeaving] = useState(false);
    const dismiss = () => (isDirty && !isLeaving ? setIsLeaving(true) : onClose());
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (onSubmit()) onClose();
    };
    return (
        <Modal isOpen onDismiss={isLeaving ? () => setIsLeaving(false) : dismiss} size={isLeaving ? 'sm' : size} initialFocusRef={initialFocusRef}>
            {isLeaving ? (
                <>
                    <ModalHeader title="Discard your changes?" />
                    <ModalBody>
                        <p className="BodyMediumRegular ag-muted ag-flush">What you typed in “{title}” is not saved.</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="primary" tone="neutral" label="Keep editing" onClick={() => setIsLeaving(false)} />
                        <Button tone="negative" label="Discard" onClick={onClose} />
                    </ModalFooter>
                </>
            ) : (
                <>
                    <ModalHeader title={title} subtitle={subtitle} />
                    <ModalBody>
                        <form id={formId} className="ag-form" onSubmit={submit} noValidate>
                            {children}
                        </form>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="primary" tone="neutral" label="Discard" onClick={onClose} />
                        <Button type="submit" form={formId} label={submitLabel} leadingIcon={submitIcon} />
                    </ModalFooter>
                </>
            )}
        </Modal>
    );
}

interface Option { value: string; title: string; description?: string }

/** A labelled single-select: SelectInput in a DropdownMenu. */
function SelectField({ label, value, options, onChange, helpText }: { label: string; value: string; options: Option[]; onChange: (v: string) => void; helpText?: string }) {
    return (
        <DropdownMenu selectionType="single" value={[value]} onChange={({ values }) => values[0] && onChange(values[0])}>
            <SelectInput label={label} helpText={helpText} />
            <DropdownMenuOverlay>
                <ActionList accessibilityLabel={label}>
                    {options.map((o) => (
                        <ActionListItem key={o.value} value={o.value} title={o.title} description={o.description} />
                    ))}
                </ActionList>
            </DropdownMenuOverlay>
        </DropdownMenu>
    );
}

/** A Build side-panel section: title, optional count, an action at the end. */
function Section({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="ag-sec" aria-label={title}>
            <div className="ag-sec__head">
                <span className="BodyMediumSemibold">{title}</span>
                {/* Counter R15: beside a heading, Medium (the default). */}
                {count ? <Counter value={count} color="Neutral" /> : null}
                <span className="ag-sec__action">{action}</span>
            </div>
            {children}
        </section>
    );
}

/** The "+" that adds knowledge, tools or skills — a multi-select menu. */
function AddMenu({ label, items, value, onChange }: { label: string; items: PickItem[]; value: string[]; onChange: (v: string[]) => void }) {
    return (
        <DropdownMenu selectionType="multiple" value={value} onChange={({ values }) => onChange(values)}>
            {/* IconButton R1: a "+" is its own action on light chrome — Button iconOnly. */}
            <DropdownMenuTrigger>
                <Button iconOnly variant="ghost" tone="neutral" size="sm" aria-label={`Add ${label}`}>
                    <Plus size={16} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuOverlay>
                <ActionList accessibilityLabel={label}>
                    {items.map((i) => (
                        <ActionListItem key={i.id} value={i.id} title={i.name} description={i.description} />
                    ))}
                </ActionList>
            </DropdownMenuOverlay>
        </DropdownMenu>
    );
}

/** What has been picked, as dismissible Tags — or the empty line. */
function PickedTags({ items, value, onChange, empty }: { items: PickItem[]; value: string[]; onChange: (v: string[]) => void; empty: string }) {
    if (value.length === 0) return <p className="BodySmallRegular ag-muted">{empty}</p>;
    return (
        <div className="ag-tags">
            {value.map((id) => (
                <Tag key={id} size="Medium" onDismiss={() => onChange(value.filter((x) => x !== id))}>
                    {items.find((i) => i.id === id)?.name ?? id}
                </Tag>
            ))}
        </div>
    );
}

type Patch = (patch: Partial<Agent>) => void;

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

function BuildForm({ agent, others, onChange }: { agent: Agent; others: Agent[]; onChange: Patch }) {
    const [dialog, setDialog] = useState<'output' | 'schedule' | 'trigger' | null>(null);
    const [allFeatures, setAllFeatures] = useState(false);

    const generate = () => {
        const about = agent.description || agent.name;
        onChange({
            role: agent.role || `${agent.name}, an assistant for plant and energy teams using I/O Sense.`,
            goal: agent.goal || `${about.replace(/\.$/, '')}. Be accurate, cite the data used, and say plainly when the data isn't enough.`,
            instructions:
                agent.instructions ||
                `You are ${agent.name}. ${about}

Rules:
1. Use only the data and documents you are given or can fetch with your tools. Never invent readings, dates or names.
2. Separate what the data shows from what it might mean.
3. Give numbers with units and the time range they cover.
4. Keep answers short: a one-line summary first, then detail.
5. If something looks unsafe, say so first and recommend a qualified person.`,
        });
        /* S3 step 4: the drafted text is on screen in the fields — no toast. */
    };
    const improve = () => {
        if (!agent.instructions.trim()) return generate();
        onChange({
            instructions: agent.instructions.includes('Before answering, check:')
                ? agent.instructions
                : `${agent.instructions.trimEnd()}

Before answering, check: is every figure from the supplied data? Is anything uncertain labelled as such? Is the answer as short as it can be?`,
        });
    };
    const features = allFeatures ? FEATURES : FEATURES.slice(0, 3);
    const modelOptions = MODELS.map((m) => ({ value: m.id, title: `${m.provider} / ${m.name}` }));

    return (
        <div className="ag-build">
            <ScrollArea className="ag-build__main" viewportClassName="ag-build__main-viewport">
                <div className="ag-build__head">
                    <span className="BodyLargeSemibold">Tell your agent how to behave</span>
                    <span className="ag-build__ai">
                        <Button variant="ghost" tone="neutral" size="sm" label="Generate" leadingIcon={<Sparkles size={16} />} onClick={generate} />
                        <Button variant="ghost" tone="neutral" size="sm" label="Improve" leadingIcon={<WandSparkles size={16} />} onClick={improve} />
                    </span>
                </div>
                <TextInput label="Role" placeholder="Who the agent is — e.g. A cautious household energy coach" value={agent.role} onChange={({ value }) => onChange({ role: value ?? '' })} />
                <TextArea label="Goal" placeholder="What a good outcome looks like" numberOfLines={2} value={agent.goal} onChange={({ value }) => onChange({ goal: value ?? '' })} />
                <TextArea
                    label="Instructions"
                    placeholder="How it should work: the steps, the rules, what to never do, and the shape of its answer."
                    numberOfLines={5}
                    isResizable
                    value={agent.instructions}
                    onChange={({ value }) => onChange({ instructions: value ?? '' })}
                    helpText="Use @ to mention other agents. Drag the corner to make the box taller."
                />
                <Card size="Medium" padding={16}>
                    <CardBody>
                        <div className="ag-sub">
                            <div className="ag-sec__head">
                                <span className="BodyMediumSemibold">{agent.type === 'Manager' ? 'Managed agents' : 'Hands work to'}</span>
                                {agent.subAgents.length ? <Counter value={agent.subAgents.length} color="Neutral" /> : null}
                                <span className="ag-sec__action">
                                    <DropdownMenu selectionType="multiple" value={agent.subAgents} onChange={({ values }) => onChange({ subAgents: values })}>
                                        <DropdownMenuTrigger>
                                            <Button variant="ghost" tone="neutral" size="sm" label="Agent" leadingIcon={<Plus size={16} />} />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuOverlay>
                                            <ActionList accessibilityLabel="Agents">
                                                {others.map((o) => (
                                                    <ActionListItem key={o.id} value={o.id} title={o.name} description={o.type} />
                                                ))}
                                            </ActionList>
                                        </DropdownMenuOverlay>
                                    </DropdownMenu>
                                </span>
                            </div>
                            {agent.subAgents.length === 0 ? (
                                <p className="BodySmallRegular ag-muted">{agent.type === 'Manager' ? 'Add the agents this one routes work to.' : 'None — this agent works on its own.'}</p>
                            ) : (
                                <ul className="ag-sub__list">
                                    {agent.subAgents.map((id) => {
                                        const sub = others.find((o) => o.id === id);
                                        return (
                                            <li key={id} className="ag-sub__row">
                                                {sub && <AgentMark type={sub.type} size="XSmall" />}
                                                <span className="BodyMediumRegular ag-ellipsis">{sub?.name ?? id}</span>
                                                <LinkButton size="sm" tone="negative" label="Remove" onClick={() => onChange({ subAgents: agent.subAgents.filter((x) => x !== id) })} />
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </CardBody>
                </Card>
            </ScrollArea>

            {/* Divider R6: the line between two side-by-side regions (G21 — no stroke on the ScrollArea). */}
            <Divider orientation="Vertical" />

            <ScrollArea className="ag-build__side" viewportClassName="ag-build__side-viewport">
                <Section title="Model">
                    <SelectField label="Model" value={agent.model.id} options={modelOptions} onChange={(id) => onChange({ model: { ...agent.model, id } })} />
                    <div className="ag-grid2">
                        <SelectField label="Temperature" value={nearestTemperature(agent.model.temperature)} options={TEMPERATURES} onChange={(v) => onChange({ model: { ...agent.model, temperature: Number(v) } })} />
                        <SelectField label="Max output" value={String(agent.model.maxTokens)} options={MAX_OUTPUTS} onChange={(v) => onChange({ model: { ...agent.model, maxTokens: Number(v) } })} />
                    </div>
                    <SelectField
                        label="Fallback model"
                        helpText="Used if the main model is down or rate-limited."
                        value={agent.model.fallbackId ?? 'none'}
                        options={[{ value: 'none', title: 'None' }, ...modelOptions.filter((o) => o.value !== agent.model.id)]}
                        onChange={(v) => onChange({ model: { ...agent.model, fallbackId: v === 'none' ? null : v } })}
                    />
                </Section>
                <Section title="Output format" action={<LinkButton size="sm" label="Edit" onClick={() => setDialog('output')} />}>
                    <p className="BodySmallRegular ag-muted">{agent.output.kind === 'json' ? 'Structured JSON, checked against a schema' : 'Plain text (Markdown)'}</p>
                </Section>
                <Section title="Knowledge" count={agent.knowledge.length} action={<AddMenu label="knowledge" items={KNOWLEDGE} value={agent.knowledge} onChange={(v) => onChange({ knowledge: v })} />}>
                    <PickedTags items={KNOWLEDGE} value={agent.knowledge} onChange={(v) => onChange({ knowledge: v })} empty="No documents yet. Add manuals, SOPs or history it should read from." />
                </Section>
                <Section title="Tools" count={agent.tools.length} action={<AddMenu label="tools" items={TOOLS} value={agent.tools} onChange={(v) => onChange({ tools: v })} />}>
                    <PickedTags items={TOOLS} value={agent.tools} onChange={(v) => onChange({ tools: v })} empty="No tools. It can only answer from what it's told." />
                </Section>
                <Section title="Skills" count={agent.skills.length} action={<AddMenu label="skills" items={SKILLS} value={agent.skills} onChange={(v) => onChange({ skills: v })} />}>
                    <PickedTags items={SKILLS} value={agent.skills} onChange={(v) => onChange({ skills: v })} empty="No skills added." />
                </Section>
                <Section
                    title="Automation"
                    count={agent.schedules.length + agent.triggers.length}
                    action={
                        <span className="ag-sec__buttons">
                            <Button variant="ghost" tone="neutral" size="sm" label="Schedule" leadingIcon={<Plus size={16} />} onClick={() => setDialog('schedule')} />
                            <Button variant="ghost" tone="neutral" size="sm" label="Trigger" leadingIcon={<Plus size={16} />} onClick={() => setDialog('trigger')} />
                        </span>
                    }
                >
                    {agent.schedules.length + agent.triggers.length === 0 ? (
                        <p className="BodySmallRegular ag-muted">Runs only when someone asks. Add a schedule or an event to run it by itself.</p>
                    ) : (
                        <ul className="ag-auto">
                            {agent.schedules.map((s) => (
                                <li key={s.id} className="ag-auto__row">
                                    <CalendarClock size={16} aria-hidden className="ag-muted" />
                                    <span className="ag-auto__text">
                                        <span className="BodyMediumRegular">{s.when}</span>
                                        <span className="BodySmallRegular ag-muted ag-ellipsis">“{s.message}”</span>
                                    </span>
                                    <LinkButton size="sm" tone="negative" label="Remove" onClick={() => onChange({ schedules: agent.schedules.filter((x) => x.id !== s.id) })} />
                                </li>
                            ))}
                            {agent.triggers.map((t) => (
                                <li key={t.id} className="ag-auto__row">
                                    <Zap size={16} aria-hidden className="ag-muted" />
                                    <span className="ag-auto__text">
                                        <span className="BodyMediumRegular">When: {t.event}</span>
                                        <span className="BodySmallRegular ag-muted ag-ellipsis">{t.filter || 'Any'}</span>
                                    </span>
                                    <LinkButton size="sm" tone="negative" label="Remove" onClick={() => onChange({ triggers: agent.triggers.filter((x) => x.id !== t.id) })} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>
                <Section
                    title="Features"
                    count={agent.features.length}
                    action={<LinkButton size="sm" label={allFeatures ? 'Show less' : `View all ${FEATURES.length}`} onClick={() => setAllFeatures((v) => !v)} />}
                >
                    <div className="ag-features">
                        {features.map((f) => {
                            const isOn = agent.features.includes(f.id);
                            return (
                                <Card key={f.id} size="Medium" padding={12}>
                                    <CardBody>
                                        <div className="ag-feature">
                                            <div className="ag-feature__head">
                                                <span className="BodyMediumSemibold">{f.name}</span>
                                                <Switch
                                                    size="Small"
                                                    accessibilityLabel={f.name}
                                                    isChecked={isOn}
                                                    onChange={({ isChecked }) => onChange({ features: isChecked ? [...agent.features, f.id] : agent.features.filter((x) => x !== f.id) })}
                                                />
                                            </div>
                                            <span className="BodySmallRegular ag-muted">{f.description}</span>
                                        </div>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </div>
                </Section>
                <Section title="Access and limits">
                    <SelectField
                        label="Who can use it"
                        value={agent.access}
                        options={[
                            { value: 'organization', title: 'Everyone in the organisation' },
                            { value: 'private', title: 'Only me' },
                        ]}
                        onChange={(v) => onChange({ access: v as Agent['access'] })}
                    />
                    <CounterInput
                        label="Monthly budget (USD)"
                        helpText="The agent stops answering once this month's spend reaches it."
                        min={0}
                        max={10000}
                        value={agent.monthlyBudget}
                        onChange={({ value }) => onChange({ monthlyBudget: value })}
                    />
                </Section>
            </ScrollArea>

            {dialog === 'output' && <OutputDialog agent={agent} onChange={onChange} onClose={() => setDialog(null)} />}
            {dialog === 'schedule' && <ScheduleDialog agent={agent} onChange={onChange} onClose={() => setDialog(null)} />}
            {dialog === 'trigger' && <TriggerDialog agent={agent} onChange={onChange} onClose={() => setDialog(null)} />}
        </div>
    );
}

interface DialogProps { agent: Agent; onChange: Patch; onClose: () => void }

function OutputDialog({ agent, onChange, onClose }: DialogProps) {
    const [kind, setKind] = useState(agent.output.kind);
    const initialSchema = agent.output.kind === 'json' ? agent.output.schema : BLANK_SCHEMA;
    const [schema, setSchema] = useState(initialSchema);
    return (
        <FormDialog
            title="Output format"
            subtitle={`How ${agent.name} shapes every answer`}
            submitLabel="Save format"
            isDirty={kind !== agent.output.kind || schema !== initialSchema}
            onClose={onClose}
            onSubmit={() => {
                onChange({ output: kind === 'json' ? { kind: 'json', schema } : { kind: 'text' } });
                return true;
            }}
        >
            <RadioGroup label="Format" value={kind} onChange={({ value }) => setKind(value as 'text' | 'json')}>
                <Radio value="text" helpText="Markdown text — best for people reading in a chat.">Text</Radio>
                <Radio value="json" helpText="Every answer follows a schema — best when an app reads the answer.">JSON</Radio>
            </RadioGroup>
            {kind === 'json' && (
                <TextArea label="Schema" numberOfLines={5} isResizable value={schema} onChange={({ value }) => setSchema(value ?? '')} helpText="The agent is told to return exactly this shape." />
            )}
        </FormDialog>
    );
}

function ScheduleDialog({ agent, onChange, onClose }: DialogProps) {
    const [when, setWhen] = useState(SCHEDULE_TIMES[1]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | undefined>();
    return (
        <FormDialog
            title="Add a schedule"
            subtitle={`${agent.name} runs by itself at these times`}
            size="sm"
            submitLabel="Add schedule"
            submitIcon={<CalendarClock size={16} />}
            isDirty={message.trim() !== '' || when !== SCHEDULE_TIMES[1]}
            onClose={onClose}
            /* P1 R12, R18: Save is never disabled — validate on submit and say
               what is wrong on the field. */
            onSubmit={() => {
                if (!message.trim()) {
                    setError('Write what to ask the agent each time');
                    return false;
                }
                onChange({ schedules: [...agent.schedules, { id: `s${Date.now()}`, when, message: message.trim() }] });
                return true;
            }}
        >
            <SelectField label="Runs" value={when} options={SCHEDULE_TIMES.map((t) => ({ value: t, title: t }))} onChange={setWhen} />
            <TextArea
                label="Message"
                necessityIndicator="required"
                placeholder="What to ask it each time — e.g. Summarise yesterday's compressor performance."
                numberOfLines={3}
                value={message}
                onChange={({ value }) => {
                    setMessage(value ?? '');
                    setError(undefined);
                }}
                validationState={error ? 'error' : 'none'}
                errorText={error}
            />
        </FormDialog>
    );
}

function TriggerDialog({ agent, onChange, onClose }: DialogProps) {
    const [event, setEvent] = useState(TRIGGER_EVENTS[0]);
    const [filter, setFilter] = useState('');
    return (
        <FormDialog
            title="Add a trigger"
            subtitle={`${agent.name} runs when this happens`}
            size="sm"
            submitLabel="Add trigger"
            submitIcon={<Zap size={16} />}
            isDirty={filter.trim() !== '' || event !== TRIGGER_EVENTS[0]}
            onClose={onClose}
            onSubmit={() => {
                onChange({ triggers: [...agent.triggers, { id: `t${Date.now()}`, event, filter: filter.trim() }] });
                return true;
            }}
        >
            <SelectField label="When" value={event} options={TRIGGER_EVENTS.map((t) => ({ value: t, title: t }))} onChange={setEvent} />
            <TextInput label="Only for" placeholder="e.g. Priority 1 alarms at Pune plant" value={filter} onChange={({ value }) => setFilter(value ?? '')} helpText="Leave empty to run on every event." />
        </FormDialog>
    );
}

/* ------------------------------------------------------------------ */
/* Deploy                                                              */
/* ------------------------------------------------------------------ */

function CodePanel({ intro, code, language, copyText, what, extra }: { intro: string; code: string; language: string; copyText?: string; what: string; extra?: ReactNode }) {
    const notify = useNotify();
    return (
        <div className="ag-code">
            <div className="ag-code__bar">
                <span className="BodySmallRegular ag-muted">{intro}</span>
                <span className="ag-code__actions">
                    {extra}
                    <Button
                        variant="ghost"
                        tone="neutral"
                        size="sm"
                        label="Copy"
                        leadingIcon={<Copy size={16} />}
                        /* S3 step 3: a copy leaves nothing on screen — toast on success;
                           step 1: a failed copy always says so. */
                        onClick={() => {
                            const text = copyText ?? code;
                            (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no clipboard'))).then(
                                () => notify(`${what} copied`),
                                () => notify(`Couldn’t copy the ${what} — select it and copy it by hand`, 'Negative'),
                            );
                        }}
                    />
                </span>
            </div>
            <AiCodeBlock code={code} language={language} />
        </div>
    );
}

const DEPLOY_STEPS = [
    { n: '01', icon: SquareTerminal, title: 'Copy the cURL', text: 'From the Agent API tab below. Paste it into a terminal to try it.' },
    { n: '02', icon: Layers, title: 'Drop it in', text: 'Add the request to your app, site or backend in the format shown.' },
    { n: '03', icon: Rocket, title: 'Go live', text: 'Pass the user’s message in, show the response.' },
];

function DeployPanel({ agent, hasUnsaved, onDeploy, onSave }: { agent: Agent; hasUnsaved: boolean; onDeploy: () => void; onSave: () => void }) {
    const notify = useNotify();
    const [tab, setTab] = useState('api');
    const [showKey, setShowKey] = useState(false);
    const key = demoKey(agent.id);
    const isLive = agent.status === 'deployed';
    return (
        <ScrollArea className="ag-deploy" viewportClassName="ag-deploy__viewport">
            <div className="ag-deploy__inner">
                <header className="ag-deploy__head">
                    <Indicator color={isLive ? 'Positive' : 'Neutral'} size="Medium">
                        {isLive ? 'Agent deployed' : 'Not deployed'}
                    </Indicator>
                    <h2 className="HeadingLargeSemibold">{isLive ? 'Your agent is deployed and ready to use' : 'Deploy your agent to call it from anywhere'}</h2>
                    <p className="BodyMediumRegular ag-muted">
                        {isLive
                            ? `The agent is live behind an API endpoint, running version ${agent.version}. Everything you need to use it from a web or mobile app is below.`
                            : 'Deploying puts the agent behind an API endpoint with its own key. You can keep changing it in Build and update the live version any time.'}
                    </p>
                    {!isLive && (
                        <span>
                            <Button label="Deploy agent" leadingIcon={<Rocket size={16} />} onClick={onDeploy} />
                        </span>
                    )}
                </header>
                {isLive && hasUnsaved && (
                    <Alert
                        isFullWidth
                        color="Notice"
                        title="Unsaved changes in Build"
                        description={`The API keeps answering with version ${agent.version} until you update.`}
                        actions={{ primary: { text: 'Update now', onClick: onSave } }}
                    />
                )}
                <div className="ag-steps">
                    {DEPLOY_STEPS.map((s) => (
                        <Card key={s.n} size="Medium" padding={16}>
                            <CardBody>
                                <div className="ag-step">
                                    <div className="ag-step__top">
                                        <s.icon size={20} aria-hidden />
                                        <span className="BodySmallRegular ag-muted">{s.n}</span>
                                    </div>
                                    <span className="BodyMediumSemibold">{s.title}</span>
                                    <span className="BodySmallRegular ag-muted">{s.text}</span>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
                <Alert
                    color="Brand"
                    icon={Store}
                    description="Prefer no code? Publish the agent to the I/O Sense App Store and people can use it straight away."
                    /* S3 step 3: publishing leaves nothing on this screen — toast. */
                    actions={{ primary: { text: 'Publish', onClick: () => notify(`${agent.name} submitted to the App Store`) } }}
                    isFullWidth
                />
                <Tabs value={tab} onChange={setTab} variant="filled" isFullWidthTabItem>
                    <TabList>
                        <TabItem value="api" leading={SquareTerminal}>Agent API</TabItem>
                        <TabItem value="a2a" leading={Network}>A2A</TabItem>
                        <TabItem value="json" leading={Braces}>Agent JSON</TabItem>
                        <TabItem value="how" leading={CircleQuestionMark}>How to use</TabItem>
                    </TabList>
                    {/* Tabs: panels are SIBLINGS of TabList; the space above each
                        panel's content is the content's own (.ag-tabpanel). */}
                    <TabPanel value="api">
                        <div className="ag-tabpanel">
                            <CodePanel
                                intro="The main way to talk to your agent. Copy this into your code."
                                code={curlFor(agent, showKey ? key : maskKey(key))}
                                copyText={curlFor(agent, key)}
                                language="bash"
                                what="cURL"
                                extra={
                                    <Button iconOnly variant="ghost" tone="neutral" size="sm" aria-label={showKey ? 'Hide API key' : 'Show API key'} onClick={() => setShowKey((v) => !v)}>
                                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </Button>
                                }
                            />
                        </div>
                    </TabPanel>
                    <TabPanel value="a2a">
                        <div className="ag-tabpanel">
                            <CodePanel intro="The agent card other agents read to discover and call this one (Agent-to-Agent protocol)." code={agentCard(agent)} language="json" what="Agent card" />
                        </div>
                    </TabPanel>
                    <TabPanel value="json">
                        <div className="ag-tabpanel">
                            <CodePanel intro="The full configuration, as deployed. Keep it in version control or import it into another workspace." code={agentJson(agent)} language="json" what="Agent JSON" />
                        </div>
                    </TabPanel>
                    <TabPanel value="how">
                        <div className="ag-tabpanel ag-how">
                            {/* List R4: steps a person follows — ordered-filled; a literal value is ListItemCode (R11). */}
                            <BulletList variant="ordered-filled">
                                <ListItem>Keep the API key on your server — never ship it in a browser or mobile app.</ListItem>
                                <ListItem>
                                    Send the user’s message with a <ListItemCode>session_id</ListItemCode>; reuse it for follow-ups so the agent keeps the context.
                                </ListItem>
                                <ListItem>{agent.output.kind === 'json' ? 'Parse the response as JSON — it follows the schema set under Output format.' : 'Render the response as Markdown.'}</ListItem>
                                <ListItem>Handle 429 (rate limit) and 402 (monthly budget reached) by retrying later.</ListItem>
                            </BulletList>
                            <CodePanel intro="JavaScript (server side)" code={fetchExample(agent)} language="js" what="Example" />
                        </div>
                    </TabPanel>
                </Tabs>
            </div>
        </ScrollArea>
    );
}

/* ------------------------------------------------------------------ */
/* Playground                                                          */
/* ------------------------------------------------------------------ */

/* Simulated timing (ms): thinking, then steps, the tool call, the answer. */
const THINK_MS = 700;
const TOOL_MS = 1300;
const ANSWER_MS = 1900;
const CHARS_PER_MS = 0.6;

const clockTime = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

interface Session { id: string; title: string; startedAt: string; turns: Turn[]; isPinned?: boolean }

function TurnView({ turn, isLive, isStopped, onStatus, onRetry }: { turn: Turn; isLive: boolean; isStopped: boolean; onStatus: (s: AiStatus) => void; onRetry: () => void }) {
    const total = ANSWER_MS + Math.ceil(turn.answer.length / CHARS_PER_MS);
    const [elapsed, setElapsed] = useState(isLive ? 0 : total);
    const isDone = elapsed >= total || isStopped;
    useEffect(() => {
        if (isDone) return undefined;
        const start = performance.now() - elapsed;
        const timer = window.setInterval(() => setElapsed(performance.now() - start), 50);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- restarts only when the turn finishes
    }, [isDone]);
    const status: AiStatus = isDone ? 'ready' : elapsed < THINK_MS ? 'submitted' : 'streaming';
    useEffect(() => {
        if (isLive) onStatus(status);
    }, [isLive, status, onStatus]);

    if (elapsed < THINK_MS && !isStopped) return <AiThinking />;

    const steps = turn.steps.map((label, i) => {
        const at = THINK_MS + (1200 * i) / turn.steps.length;
        return { label, status: (isDone || elapsed >= at + 250 ? 'completed' : elapsed >= at ? 'active' : 'pending') as 'completed' | 'active' | 'pending' };
    });
    const toolState = elapsed < 1600 && !isDone ? 'input-available' : 'output-available';
    const shown = isDone ? turn.answer : turn.answer.slice(0, Math.max(0, Math.floor((elapsed - ANSWER_MS) * CHARS_PER_MS)));
    const isStreaming = elapsed >= ANSWER_MS && !isDone;

    return (
        <AiMessage role="assistant" actions={isDone ? <AiActions items={[{ type: 'copy', text: turn.answer }, { type: 'retry', onClick: onRetry }, { type: 'feedback' }]} /> : undefined}>
            <div className="ag-answer">
                <AiSteps steps={steps} status={elapsed < ANSWER_MS && !isDone ? 'streaming' : 'ready'} durationMs={isDone ? 1200 : undefined} />
                {turn.tool && elapsed >= TOOL_MS ? (
                    <AiTool name={turn.tool.name} state={toolState} input={turn.tool.input} output={toolState === 'output-available' ? turn.tool.output : undefined} />
                ) : null}
                {shown ? turn.isJson ? <AiCodeBlock code={shown} language="json" isIncomplete={isStreaming} /> : <AiResponse isStreaming={isStreaming}>{shown}</AiResponse> : null}
            </div>
        </AiMessage>
    );
}

type ConnectorItem = NonNullable<ComponentProps<typeof AiComposer>['connectors']>[number];

const COMPOSER_MODES = [
    { value: 'ask', label: 'Ask', description: 'Answers only, changes nothing' },
    { value: 'act', label: 'Act', description: 'Can run tools, asks before anything risky' },
];

function Playground({ agent }: { agent: Agent }) {
    const notify = useNotify();
    const [sessions, setSessions] = useState<Session[]>([]);
    /* AiChatHistory: "Confirming is yours to add" — an irreversible delete is
       confirmed in a Modal first, then toasted (S3, Toast R24). */
    const [deletingSession, setDeletingSession] = useState<Session | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const [status, setStatus] = useState<AiStatus>('ready');
    const [stopped, setStopped] = useState<string[]>([]);
    const [liveId, setLiveId] = useState<string | null>(null);
    const [sideTab, setSideTab] = useState('activity');
    const [search, setSearch] = useState('');
    const activeRef = useRef(activeId);
    activeRef.current = activeId;
    /* The model is the agent's own: this FDS AiComposer has no model picker,
       so the original's "test on another model" switch has nowhere to live. */
    /* The full FDS AiComposer: the agent's own tools as connector switches,
       its skills in the slash menu, the Ask / Act mode picker and voice. */
    const [connectors, setConnectors] = useState<ConnectorItem[]>(() =>
        TOOLS.map((t) => ({ id: t.id, label: t.name, description: t.description, isEnabled: agent.tools.includes(t.id) })),
    );
    const composerSkills = useMemo(
        () => (agent.skills.length ? SKILLS.filter((k) => agent.skills.includes(k.id)) : SKILLS).map((k) => ({ name: k.name, description: k.description })),
        [agent.skills],
    );
    const model = agent.model.id;

    const active = sessions.find((s) => s.id === activeId) ?? null;
    const isBusy = status === 'submitted' || status === 'streaming';

    const send = (text: string, files: Turn['files'] = []) => {
        const q = text.trim();
        if (!q || isBusy) return;
        const turn = simulateTurn(agent, q, model, files);
        if (active) setSessions((all) => all.map((s) => (s.id === active.id ? { ...s, turns: [...s.turns, turn] } : s)));
        else {
            const id = randomId();
            setSessions((all) => [{ id, title: q.length > 48 ? `${q.slice(0, 48)}…` : q, startedAt: clockTime(), turns: [turn] }, ...all]);
            setActiveId(id);
        }
        setLiveId(turn.id);
        setStatus('submitted');
        setDraft('');
    };

    const needle = search.trim().toLowerCase();
    const visible = sessions.filter((s) => !needle || s.title.toLowerCase().includes(needle));
    const pinned = visible.filter((s) => s.isPinned);
    const rest = visible.filter((s) => !s.isPinned);
    const groups = [...(pinned.length ? [{ id: 'pinned', label: 'Pinned', items: pinned }] : []), ...(rest.length ? [{ id: 'today', label: 'Today', items: rest }] : [])].map((g) => ({
        ...g,
        items: g.items.map((s) => ({ id: s.id, title: s.title, meta: `${s.startedAt} · ${s.turns.length} ${s.turns.length === 1 ? 'question' : 'questions'}`, isActive: s.id === activeId, isPinned: s.isPinned })),
    }));
    const turns = active?.turns ?? [];
    const runs = [...turns].reverse();
    const artifacts = turns.filter((t) => t.isJson);

    return (
        <div className="ag-play">
            <aside className="ag-play__sessions" aria-label="Sessions">
                <Button variant="secondary" tone="neutral" label="New chat" leadingIcon={<Plus size={16} />} isFullWidth isDisabled={isBusy} onClick={() => setActiveId(null)} />
                {/* ScrollArea R1/R2: the one way to scroll — no bare overflow. */}
                <ScrollArea className="ag-play__history">
                    <AiChatHistory
                        groups={groups}
                        onOpen={(id) => !isBusy && setActiveId(id)}
                        onPin={(id) => setSessions((all) => all.map((s) => (s.id === id ? { ...s, isPinned: !s.isPinned } : s)))}
                        onRename={(id, title) => setSessions((all) => all.map((s) => (s.id === id ? { ...s, title } : s)))}
                        onDelete={(id) => setDeletingSession(sessions.find((s) => s.id === id) ?? null)}
                        searchValue={search}
                        onSearchChange={setSearch}
                        emptyTitle="No test chats yet"
                        emptyDescription="Ask the agent something and the chat is kept here."
                    />
                </ScrollArea>
            </aside>

            <Divider orientation="Vertical" />

            <section className="ag-play__chat" aria-label="Chat">
                <div className="ag-play__thread">
                    {turns.length === 0 ? (
                        /* The AI drawer's own empty state: the Bruce mark, the agent's name and
                           what it does, and the prompts to start from. */
                        <AiDrawerHome
                            className="ag-play__home"
                            title={agent.name}
                            description={agent.description || agent.goal || 'Ask it anything to see how it answers.'}
                            suggestions={TRY_ASKING[agent.type].map((label, i) => ({ id: `try-${i}`, label }))}
                            onSuggestionPick={(prompt) => setDraft(prompt.label)}
                            onSuggestionPreview={(prompt) => setPreview(prompt?.label ?? null)}
                        />
                    ) : (
                        <AiConversation status={isBusy ? status : 'ready'} accessibilityLabel={`Chat with ${agent.name}`}>
                            {turns.flatMap((t) => [
                                <AiMessage key={`${t.id}-q`} role="user" attachments={t.files}>
                                    {t.question}
                                </AiMessage>,
                                <TurnView key={t.id} turn={t} isLive={t.id === liveId} isStopped={stopped.includes(t.id)} onStatus={setStatus} onRetry={() => send(t.question)} />,
                            ])}
                        </AiConversation>
                    )}
                </div>
                <div className="ag-composer">
                    <AiComposer
                        value={draft}
                        onChange={setDraft}
                        placeholder={preview ?? `Message ${agent.name}…`}
                        accessibilityLabel={`Message ${agent.name}`}
                        status={status}
                        onSubmit={({ text, files }) => send(text, files.map((f) => ({ name: f.name, type: f.type })))}
                        onStop={() => {
                            if (liveId) setStopped((s) => [...s, liveId]);
                            setStatus('ready');
                        }}
                        accept=".pdf,.csv,.xlsx,image/*"
                        maxFiles={3}
                        maxSize={10 * 1024 * 1024}
                        connectors={connectors}
                        onConnectorToggle={(id, isEnabled) => setConnectors((all) => all.map((c) => (c.id === id ? { ...c, isEnabled } : c)))}
                        skills={composerSkills}
                        modes={COMPOSER_MODES}
                        defaultMode="ask"
                        onModeChange={() => {}}
                        onVoiceSubmit={({ duration }) => send(`Voice message (${Math.max(1, Math.round(duration / 1000))}s)`)}
                        footnote="Testing the current draft. Replies are simulated."
                    />
                </div>
            </section>

            <Divider orientation="Vertical" />

            <aside className="ag-play__side" aria-label="Run details">
                <Tabs value={sideTab} onChange={setSideTab} variant="filled" isFullWidthTabItem>
                    <TabList>
                        <TabItem value="activity">Activity</TabItem>
                        <TabItem value="artifacts">Artifacts</TabItem>
                    </TabList>
                    {/* Panels are siblings of TabList; each scrolls inside its own ScrollArea. */}
                    <TabPanel value="activity" className="ag-play__panel">
                        <ScrollArea className="ag-play__side-scroll" viewportClassName="ag-play__side-viewport">
                            {runs.length === 0 ? (
                                <EmptyState size="Medium" asset={<NoDataOneIllustration />} title="No activity yet" description="Start chatting to see each step the agent takes." />
                            ) : (
                                <div className="ag-runs">
                                    {runs.map((t) => (
                                        <section key={t.id} className="ag-run" aria-label={`Run: ${t.question}`}>
                                            <span className="BodySmallSemibold ag-ellipsis">“{t.question}”</span>
                                            <ol className="ag-events">
                                                {[
                                                    { icon: Activity, title: 'Run started', detail: `Draft v${agent.version} · ${modelLabel(t.model)}` },
                                                    ...(agent.features.includes('memory') ? [{ icon: Brain, title: 'Memory read', detail: 'Earlier messages in this session' }] : []),
                                                    ...agent.knowledge.slice(0, 2).map((k) => ({ icon: BookOpen, title: 'Knowledge searched', detail: `${KNOWLEDGE.find((x) => x.id === k)?.name} · 4 passages` })),
                                                    ...agent.tools.slice(0, 2).map((k, i) => ({ icon: Wrench, title: 'Tool called', detail: `${TOOLS.find((x) => x.id === k)?.name} · ${180 + i * 140} ms` })),
                                                    { icon: Bot, title: 'Model responded', detail: `1,284 in · ${t.isJson ? 412 : 236} out tokens` },
                                                    ...(agent.features.includes('responsible-ai') ? [{ icon: ShieldCheck, title: 'Responsible AI check', detail: 'Passed — no unsafe or ungrounded claims' }] : []),
                                                    { icon: CircleCheck, title: stopped.includes(t.id) ? 'Stopped' : 'Answered', detail: `${(t.ms / 1e3).toFixed(1)} s` },
                                                ].map((ev) => (
                                                    <li key={ev.title + ev.detail} className="ag-event">
                                                        <ev.icon size={16} aria-hidden />
                                                        <span className="ag-event__text">
                                                            <span className="BodySmallMedium">{ev.title}</span>
                                                            <span className="BodySmallRegular ag-muted">{ev.detail}</span>
                                                        </span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </section>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabPanel>
                    <TabPanel value="artifacts" className="ag-play__panel">
                        <ScrollArea className="ag-play__side-scroll" viewportClassName="ag-play__side-viewport">
                            {artifacts.length === 0 ? (
                                <EmptyState
                                    size="Medium"
                                    asset={<NoDataOneIllustration />}
                                    title="No artifacts yet"
                                    description={agent.output.kind === 'json' ? 'Each JSON answer is kept here.' : 'Files and structured answers the agent produces show here.'}
                                />
                            ) : (
                                <ul className="ag-artifacts">
                                    {artifacts.map((t, i) => (
                                        <li key={t.id} className="ag-artifact">
                                            <FileBraces size={16} aria-hidden />
                                            <span className="BodySmallMedium">response-{i + 1}.json</span>
                                            <span className="BodySmallRegular ag-muted">{(t.answer.length / 1024).toFixed(1)} KB</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </ScrollArea>
                    </TabPanel>
                </Tabs>
            </aside>

            {deletingSession && (
                <Modal isOpen onDismiss={() => setDeletingSession(null)} size="sm">
                    <ModalHeader title="Delete this test chat?" />
                    <ModalBody>
                        <p className="BodyMediumRegular ag-muted ag-flush">“{deletingSession.title}” and its run details are deleted. This can’t be undone.</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="primary" tone="neutral" label="Keep" onClick={() => setDeletingSession(null)} />
                        <Button
                            tone="negative"
                            label="Delete chat"
                            onClick={() => {
                                const id = deletingSession.id;
                                setSessions((all) => all.filter((s) => s.id !== id));
                                if (activeRef.current === id) setActiveId(null);
                                setDeletingSession(null);
                                notify('Test chat deleted');
                            }}
                        />
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Workspace — header bar + the mode's body                            */
/* ------------------------------------------------------------------ */

function Workspace({ agent, others, mode, onModeChange, onSave }: { agent: Agent; others: Agent[]; mode: AgentMode; onModeChange: (m: AgentMode) => void; onSave: (a: Agent) => void }) {
    const [draft, setDraft] = useState(agent);
    const [historyOpen, setHistoryOpen] = useState(false);
    const isDirty = JSON.stringify(draft) !== JSON.stringify(agent);
    const update = () => {
        const saved = { ...draft, version: agent.version + 1, modifiedMinutesAgo: 0, modifiedBy: CURRENT_USER };
        onSave(saved);
        setDraft(saved);
        /* S3 "Update or edit": the bar now reads "v{n} · Saved just now" — no toast. */
    };

    /* S2 step 2: the workspace brings its own full-width bar, then fills the
       rest — a CANVAS page (pagePadding none + pageHeight fill, set by the
       host). Three blocks, bare in the sheet, each bringing its own padding
       from the scale: the bar, a Divider, then the body — the last block, so
       it takes the height the others leave. */
    return (
        <>
            <header className="ag-ws__bar">
                <div className="ag-ws__id">
                    <AgentMark type={draft.type} />
                    <div className="ag-ws__name">
                        <span className="BodyMediumSemibold ag-ellipsis">{draft.name}</span>
                        <span className="BodySmallRegular ag-muted">
                            v{agent.version} · {isDirty ? 'Unsaved changes' : `Saved ${timeAgo(agent.modifiedMinutesAgo)}`}
                        </span>
                    </div>
                    <Badge label={STATUS[agent.status].label} color={STATUS[agent.status].color} />
                </div>
                <Tabs value={mode} onChange={(v) => onModeChange(v as AgentMode)} variant="filled">
                    <TabList>
                        <TabItem value="build" leading={Hammer}>Build</TabItem>
                        <TabItem value="playground" leading={MessageSquareText}>Playground</TabItem>
                        <TabItem value="deploy" leading={SquareTerminal}>Deploy</TabItem>
                    </TabList>
                </Tabs>
                <div className="ag-ws__actions">
                    <Button iconOnly variant="ghost" tone="neutral" size="sm" aria-label="Version history" onClick={() => setHistoryOpen(true)}>
                        <History size={16} />
                    </Button>
                    <Button label="Update" isDisabled={!isDirty} onClick={update} />
                </div>
            </header>
            <Divider />
            <div className="ag-ws__body">
                {mode === 'build' ? (
                    <BuildForm agent={draft} others={others} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
                ) : mode === 'playground' ? (
                    <Playground agent={draft} />
                ) : (
                    <DeployPanel
                        agent={agent}
                        hasUnsaved={isDirty}
                        onDeploy={() => {
                            const deployed: Agent = { ...draft, status: 'deployed', version: isDirty ? agent.version + 1 : agent.version, modifiedMinutesAgo: 0, modifiedBy: CURRENT_USER };
                            onSave(deployed);
                            setDraft(deployed);
                            /* S3 step 4: the panel now reads "Agent deployed" — no toast. */
                        }}
                        onSave={update}
                    />
                )}
                <Modal isOpen={historyOpen} onDismiss={() => setHistoryOpen(false)} size="sm">
                    <ModalHeader title="Version history" subtitle={`${agent.name} · every Update saves a version`} />
                    <ModalBody>
                        <ol className="ag-history">
                            {versionHistory(agent).map((v) => (
                                <li key={v.v} className="ag-history__row">
                                    <span className="BodyMediumSemibold">v{v.v}</span>
                                    <span className="ag-history__text">
                                        <span className="BodyMediumRegular">{v.note}</span>
                                        <span className="BodySmallRegular ag-muted">
                                            {v.by} · {timeAgo(v.minutesAgo)}
                                        </span>
                                    </span>
                                    {v.v === agent.version && <Badge label="Current" color="Brand" />}
                                </li>
                            ))}
                        </ol>
                    </ModalBody>
                </Modal>
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Create agent                                                        */
/* ------------------------------------------------------------------ */

function CreateAgentDialog({ existing, onClose, onCreate }: { existing: Agent[]; onClose: () => void; onCreate: (a: Agent) => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<AgentType>('Chat');
    const [error, setError] = useState<string | undefined>();
    const nameRef = useRef<HTMLInputElement>(null);
    return (
        <FormDialog
            title="Create agent"
            subtitle="You’ll set its role, goal, model and tools next, in Build."
            submitLabel="Create and configure"
            isDirty={name.trim() !== '' || description.trim() !== '' || type !== 'Chat'}
            onClose={onClose}
            /* Modal R22: the reader lands in the first field. */
            initialFocusRef={nameRef}
            /* P1 R12: validate on submit, the error on the field it is about. */
            onSubmit={() => {
                const clean = name.trim();
                const problem = !clean ? 'Give the agent a name' : existing.some((a) => a.name.toLowerCase() === clean.toLowerCase()) ? 'An agent with this name already exists' : undefined;
                setError(problem);
                if (problem) return false;
                onCreate(newAgent(clean, description.trim(), type));
                return false; /* onCreate closes the dialog and opens the agent */
            }}
        >
            <TextInput
                ref={nameRef}
                label="Name"
                placeholder="e.g. Chiller Health Watcher"
                necessityIndicator="required"
                value={name}
                onChange={({ value }) => {
                    setName(value ?? '');
                    setError(undefined);
                }}
                validationState={error ? 'error' : 'none'}
                errorText={error}
            />
            <TextArea label="Description" placeholder="What it does, in a sentence or two. People see this in the agent list." numberOfLines={3} value={description} onChange={({ value }) => setDescription(value ?? '')} />
            <RadioGroup label="Type" value={type} onChange={({ value }) => setType(value as AgentType)}>
                {TYPE_IDS.map((t) => (
                    <Radio key={t} value={t} helpText={TYPES[t].blurb}>
                        {t}
                    </Radio>
                ))}
            </RadioGroup>
        </FormDialog>
    );
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

const ROUTE_ID = 'agents';

interface Route { id: string | null; mode: AgentMode }

const readRoute = (): Route => {
    const p = new URLSearchParams(window.location.search);
    const m = p.get('mode');
    return { id: p.get('agent'), mode: m === 'playground' || m === 'deploy' ? m : 'build' };
};

export interface AgentsPageProps {
    /** Bumped when the rail's Agents row or the Agents crumb is clicked: back to the list. */
    homeSignal: number;
    /** The crumbs below "Agents" — the open agent's name, or none on the list. */
    onTrailChange: (crumbs: Crumb[]) => void;
    /** True while an agent's workspace is open: a canvas page (S2 step 2). */
    onCanvasChange: (isCanvas: boolean) => void;
}

export function AgentsPage({ homeSignal, onTrailChange, onCanvasChange }: AgentsPageProps) {
    const notify = useNotify();
    const [agents, setAgents] = useState<Agent[]>(AGENTS);
    const [route, setRoute] = useState<Route>(readRoute);

    /* The route lives in the query string, beside the shell's `#/agents`. */
    const open = useCallback((id: string | null, mode: AgentMode = 'build') => {
        setRoute({ id, mode });
        const url = new URL(window.location.href);
        if (id) {
            url.searchParams.set('agent', id);
            url.searchParams.set('mode', mode);
        } else {
            url.searchParams.delete('agent');
            url.searchParams.delete('mode');
        }
        if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url);
    }, []);

    useEffect(() => {
        const onPop = () => setRoute(readRoute());
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    /* The rail's Agents row (or the crumb) while an agent is open: the list. */
    const seenSignal = useRef(homeSignal);
    useEffect(() => {
        if (homeSignal === seenSignal.current) return;
        seenSignal.current = homeSignal;
        open(null);
    }, [homeSignal, open]);

    /* Leaving the page drops `?agent=&mode=` from the page we land on, so
       coming back through the rail opens the list — after the shell has
       written its new `#/<id>` entry, so Back still returns to the agent. */
    useEffect(
        () => () => {
            window.setTimeout(() => {
                if (window.location.hash === `#/${ROUTE_ID}`) return;
                const url = new URL(window.location.href);
                if (!url.searchParams.has('agent') && !url.searchParams.has('mode')) return;
                url.searchParams.delete('agent');
                url.searchParams.delete('mode');
                window.history.replaceState(window.history.state, '', url);
            }, 0);
        },
        [],
    );

    const current = agents.find((a) => a.id === route.id);
    const currentName = current?.name;
    useEffect(() => {
        onTrailChange(currentName ? [{ label: currentName }] : []);
    }, [currentName, onTrailChange]);
    useEffect(() => () => onTrailChange([]), [onTrailChange]);

    const isCanvas = !!current;
    useEffect(() => {
        onCanvasChange(isCanvas);
    }, [isCanvas, onCanvasChange]);
    useEffect(() => () => onCanvasChange(false), [onCanvasChange]);

    /* The list */
    const [view, setView] = useState('cards');
    const [query, setQuery] = useState('');
    const [types, setTypes] = useState<string[]>([]);
    const [statuses, setStatuses] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [deleting, setDeleting] = useState<Agent | null>(null);

    const needle = query.trim().toLowerCase();
    const shown = agents.filter(
        (a) =>
            (!needle || a.name.toLowerCase().includes(needle) || a.description.toLowerCase().includes(needle)) &&
            (types.length === 0 || types.includes(a.type)) &&
            (statuses.length === 0 || statuses.includes(a.status)),
    );

    const duplicate = (a: Agent) => {
        const copy: Agent = {
            ...newAgent(`${a.name} (copy)`, a.description, a.type),
            ...a,
            id: `${a.id}-copy-${Date.now().toString(36).slice(-4)}`,
            name: `${a.name} (copy)`,
            status: 'draft',
            version: 1,
            modifiedMinutesAgo: 0,
            modifiedBy: CURRENT_USER,
        };
        /* S3: the copy appears at the top of the list being looked at — no toast. */
        setAgents((all) => [copy, ...all]);
    };

    const columns = useMemo<TableColumn<Agent>[]>(
        () => [
            {
                key: 'name',
                header: 'Name',
                /* Table R33: the identity column — 'normal' with isRowHeader. */
                emphasis: 'normal',
                isRowHeader: true,
                sizing: 'fit',
                isSortable: true,
                sortFn: (a, b) => a.name.localeCompare(b.name),
                cell: (a) => (
                    <span className="ag-row-name">
                        <AgentMark type={a.type} size="Small" />
                        {a.name}
                    </span>
                ),
            },
            /* Prose: 'muted' through the column, never app CSS on the cell (Table anti-pattern). */
            { key: 'description', header: 'Description', sizing: 'fill', emphasis: 'muted' },
            {
                key: 'type',
                header: 'Type',
                filter: { options: TYPE_IDS.map((t) => ({ value: t, label: t })) },
                cell: (a) => <Badge label={a.type} color={TYPES[a.type].color} />,
            },
            {
                key: 'status',
                header: 'Status',
                filter: { options: STATUS_IDS.map((s) => ({ value: s, label: STATUS[s].label })) },
                cell: (a) => <Badge label={STATUS[a.status].label} color={STATUS[a.status].color} />,
            },
            {
                key: 'modified',
                header: 'Modified',
                emphasis: 'muted',
                isSortable: true,
                sortFn: (a, b) => b.modifiedMinutesAgo - a.modifiedMinutesAgo,
                cell: (a) => {
                    const t = timeAgo(a.modifiedMinutesAgo);
                    return t[0].toUpperCase() + t.slice(1);
                },
                description: (a) => a.modifiedBy,
            },
        ],
        [],
    );
    const filterState: TableFilterState = { type: types.length ? types : undefined, status: statuses.length ? statuses : undefined };
    const asList = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

    if (current)
        return (
            <Workspace
                key={current.id}
                agent={current}
                others={agents.filter((a) => a.id !== current.id)}
                mode={route.mode}
                onModeChange={(m) => open(current.id, m)}
                onSave={(saved) => setAgents((all) => all.map((a) => (a.id === saved.id ? saved : a)))}
            />
        );

    /* S1 "Decrease the gap": the toolbar and the cards/table it controls read as
       ONE unit, so they are one block with a 12px gap (.ag-list). */
    return (
        <>
            <div className="ag-list">
                <div className="ag-bar">
                    {/* TextInput guard: a search field is SearchInput (magnifier and ✕ built in). */}
                    <div className="ag-search">
                        <SearchInput accessibilityLabel="Search agents" placeholder="Search agents" value={query} onChange={({ value }) => setQuery(value ?? '')} />
                    </div>
                    <div className="ag-head-actions">
                        <Tabs value={view} onChange={setView} variant="filled">
                            <TabList>
                                <TabItem value="cards" leading={LayoutGrid} aria-label="Grid view" />
                                <TabItem value="list" leading={List} aria-label="List view" />
                            </TabList>
                        </Tabs>
                        <Button label="Create agent" leadingIcon={<Plus size={16} />} onClick={() => setIsCreating(true)} />
                    </div>
                </div>

                {shown.length === 0 ? (
                    <EmptyState size="Medium" asset={<NoDataOneIllustration />} title="No agents match" description="Try another name, or clear the filters.">
                        {(types.length > 0 || statuses.length > 0) && (
                            /* EmptyState R19: one next step — the brand primary. */
                            <Button
                                label="Clear filters"
                                onClick={() => {
                                    setTypes([]);
                                    setStatuses([]);
                                }}
                            />
                        )}
                    </EmptyState>
                ) : view === 'cards' ? (
                    <div className="ag-cards" role="list" aria-label="Agents">
                        {shown.map((a) => (
                            <div key={a.id} role="listitem">
                                <Card size="Medium" padding={16} height="100%" onClick={() => open(a.id)} accessibilityLabel={`Open ${a.name}`}>
                                    <CardBody>
                                        <div className="ag-card__body">
                                            <div className="ag-card__head">
                                                <AgentMark type={a.type} />
                                                <div className="ag-card__id">
                                                    <span className="BodyMediumSemibold ag-ellipsis">{a.name}</span>
                                                    <span className="BodySmallRegular ag-muted ag-ellipsis">{modelLabel(a.model.id)}</span>
                                                </div>
                                                <Badge label={a.type} color={TYPES[a.type].color} />
                                            </div>
                                            <p className="BodySmallRegular ag-muted ag-card__desc">{a.description}</p>
                                            <div className="ag-card__foot">
                                                <span className="BodySmallRegular ag-muted">
                                                    Modified {timeAgo(a.modifiedMinutesAgo)} · {a.modifiedBy}
                                                </span>
                                                <Badge label={STATUS[a.status].label} color={STATUS[a.status].color} />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Table
                        accessibilityLabel="Agents"
                        data={shown}
                        columns={columns}
                        getRowId={(a) => a.id}
                        rowDensity="expanded"
                        defaultSortState={{ columnKey: 'modified', direction: 'asc' }}
                        filterState={filterState}
                        onFilterChange={(next) => {
                            setTypes(asList(next.type));
                            setStatuses(asList(next.status));
                        }}
                        filteringMode="server"
                        onRowClick={({ row }) => open(row.id)}
                        rowActions={(a) => [
                            { label: 'Duplicate', accessibilityLabel: `Duplicate ${a.name}`, icon: Copy, onClick: () => duplicate(a) },
                            { label: 'Delete', accessibilityLabel: `Delete ${a.name}`, icon: Trash, onClick: () => setDeleting(a) },
                        ]}
                    />
                )}
            </div>

            {isCreating && (
                <CreateAgentDialog
                    existing={agents}
                    onClose={() => setIsCreating(false)}
                    onCreate={(a) => {
                        setAgents((all) => [a, ...all]);
                        setIsCreating(false);
                        setQuery('');
                        /* S3: the page opens on the new agent — no toast. */
                        open(a.id, 'build');
                    }}
                />
            )}
            {deleting && (
                <Modal isOpen onDismiss={() => setDeleting(null)} size="sm">
                    <ModalHeader title={`Delete ${deleting.name}?`} />
                    <ModalBody>
                        <p className="BodyMediumRegular ag-muted ag-flush">
                            {deleting.status === 'deployed' ? 'Its API endpoint stops answering straight away. ' : ''}Its sessions and version history are deleted too. This can’t be undone.
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="primary" tone="neutral" label="Keep" onClick={() => setDeleting(null)} />
                        <Button
                            tone="negative"
                            label="Delete agent"
                            /* S3 / Toast R24: confirmed first, then a toast — the row just vanishes. */
                            onClick={() => {
                                setAgents((all) => all.filter((a) => a.id !== deleting.id));
                                setDeleting(null);
                                notify(`${deleting.name} deleted`);
                            }}
                        />
                    </ModalFooter>
                </Modal>
            )}
        </>
    );
}

/** Host wiring for main.tsx: the home signal, the extra crumbs, and whether
 *  the page is a canvas (an open agent: pagePadding none + pageHeight fill). */
export function useAgentsHost(activeId: string, pageId = ROUTE_ID) {
    const isHere = activeId === pageId;
    const [homeSignal, setHomeSignal] = useState(0);
    const [crumbs, setCrumbs] = useState<Crumb[]>([]);
    const [isCanvas, setIsCanvas] = useState(false);
    return {
        pageProps: { homeSignal, onTrailChange: setCrumbs, onCanvasChange: setIsCanvas } satisfies AgentsPageProps,
        /** Call from AppShell's onNavigate. */
        onNavigate: (id: string) => {
            if (id === pageId) setHomeSignal((n) => n + 1);
        },
        /** The page's own crumb becomes a link back to the list, then the agent. */
        trail: (base: Crumb[], title: string) => (isHere && crumbs.length ? [...base.slice(0, -1), { label: title, id: pageId }, ...crumbs] : base),
        isCanvas: isHere && isCanvas,
    };
}
