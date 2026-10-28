/* AppShell dashboard (port 5182) — the FDS AppShell used exactly as the
   design system ships it: the canonical setup from AppShell.guard.json, the
   default-complete top bar (launcher, bell, avatar menu with Theme), hash
   routing, and pages built only from FDS surfaces. Nothing in the shell is
   restyled or re-implemented. */
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    Bell,
    BellRing,
    Blocks,
    Bot,
    ChartLine,
    CircleQuestionMark,
    ClipboardList,
    Contact,
    Cpu,
    Factory,
    FileText,
    Gauge,
    LayoutDashboard,
    Settings,
    Siren,
    Sparkles,
    Zap,
} from 'lucide-react';
import '@faclon-labs/fds/fonts';
import '@faclon-labs/fds/styles.css';
import './app.css';
import {
    AppShell,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    CardHeaderCounter,
    CardHeaderLeading,
    CardMetric,
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    EmptyState,
    List,
    ListItem,
    Metric,
    NAV_ICON_SIZE,
    NoDataOneIllustration,
    NoNotificationIllustration,
    ProgressBar,
    SideNavFooterRow,
    Table,
    ToastContainer,
    buildTrail,
    resolveSection,
    type NavItem,
    type TableColumn,
} from '@faclon-labs/fds';
import { Chart, ColumnChart, LineChart, type ChartHandle } from '@faclon-labs/fds/chart';
import {
    AiComposer,
    AiConversation,
    AiDrawer,
    AiDrawerHome,
    AiHome,
    AiMark,
    AiMessage,
    AiResponse,
    type AiHomeRecent,
    type AiSuggestion,
} from '@faclon-labs/fds/ai';
import { AgentsPage, useAgentsHost } from './agentsPage';
import { SettingsPage } from './settingsPage';
import { NotificationsPage } from './notificationsPage';
import { DevicesPage } from './devicesPage';
import { ContactsPage } from './contactsPage';
import { ReportsPage } from './reportsPage';

/* ------------------------------------------------------------------ */
/* Navigation — data only (R2), glyphs at NAV_ICON_SIZE (R6)            */
/* ------------------------------------------------------------------ */

const ic = (I: typeof Zap) => <I size={NAV_ICON_SIZE} />;

const NAV: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: ic(LayoutDashboard) },
    { id: 'assistant', label: 'Bruce AI', icon: ic(Sparkles) },
    { id: 'agents', label: 'Agents', icon: ic(Bot) },
    {
        id: 'operations',
        label: 'Operations',
        icon: ic(Factory),
        children: [
            { id: 'assets', label: 'Assets', icon: ic(Cpu) },
            { id: 'work-orders', label: 'Work orders', icon: ic(ClipboardList), badge: { kind: 'count', value: 12, tone: 'info' } },
            { id: 'alarms', label: 'Alarms', icon: ic(Siren), badge: { kind: 'count', value: 3, tone: 'alert' } },
        ],
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: ic(ChartLine),
        children: [
            { id: 'energy', label: 'Energy', icon: ic(Zap), badge: { kind: 'word', label: 'New', tone: 'label' } },
            { id: 'oee', label: 'OEE', icon: ic(Gauge) },
            { id: 'reports', label: 'Reports', icon: ic(FileText) },
        ],
    },
    {
        id: 'patterns',
        label: 'Pattern',
        icon: ic(Blocks),
        children: [
            { id: 'pattern-settings', label: 'Settings', icon: ic(Settings) },
            { id: 'pattern-notification', label: 'Notification', icon: ic(Bell) },
            { id: 'pattern-device', label: 'Device', icon: ic(Cpu) },
            { id: 'pattern-contact', label: 'Contact', icon: ic(Contact) },
        ],
    },
    {
        kind: 'section',
        id: 'admin',
        label: 'Admin',
        items: [{ id: 'settings', label: 'Settings', icon: ic(Settings) }],
    },
];

/* An accordion parent is not a page (R3). */
const SECTION_DEFAULTS = { operations: 'assets', analytics: 'energy', patterns: 'pattern-settings' };

const PAGE_TITLES: Record<string, string> = {
    overview: 'Overview', assistant: 'Bruce AI', agents: 'Agents', assets: 'Assets', 'work-orders': 'Work orders', alarms: 'Alarms',
    energy: 'Energy', oee: 'OEE', reports: 'Reports', settings: 'Settings', 'pattern-settings': 'Settings', 'pattern-notification': 'Notification', 'pattern-device': 'Device', 'pattern-contact': 'Contact',
};

/* ------------------------------------------------------------------ */
/* Demo data                                                           */
/* ------------------------------------------------------------------ */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Asset { id: string; name: string; site: string; status: 'Running' | 'Idle' | 'Fault'; uptime: number; energy: number }
const ASSETS: Asset[] = [
    { id: 'CH-03', name: 'Chiller 03', site: 'Pune', status: 'Fault', uptime: 62, energy: 18420 },
    { id: 'BL-01', name: 'Boiler 01', site: 'Pune', status: 'Running', uptime: 94, energy: 26310 },
    { id: 'CP-02', name: 'Compressor 02', site: 'Chennai', status: 'Running', uptime: 88, energy: 14980 },
    { id: 'PM-05', name: 'Pump 05', site: 'Mumbai', status: 'Idle', uptime: 71, energy: 4210 },
    { id: 'CT-01', name: 'Cooling tower 01', site: 'Chennai', status: 'Running', uptime: 97, energy: 9640 },
    { id: 'PR-04', name: 'Press 04', site: 'Delhi', status: 'Running', uptime: 91, energy: 12750 },
];

interface Alarm { id: string; asset: string; message: string; severity: 'Critical' | 'Major' | 'Minor'; raised: string }
const ALARMS: Alarm[] = [
    { id: 'AL-981', asset: 'Chiller 03', message: 'Discharge pressure high', severity: 'Critical', raised: '09:42' },
    { id: 'AL-977', asset: 'Pump 05', message: 'Vibration above limit', severity: 'Major', raised: '08:15' },
    { id: 'AL-970', asset: 'Compressor 02', message: 'Energy above baseline', severity: 'Minor', raised: '06:58' },
];

interface WorkOrder { id: string; title: string; asset: string; assignee: string; progress: number }
const WORK_ORDERS: WorkOrder[] = [
    { id: 'WO-2437', title: 'Replace condenser fan belt', asset: 'Chiller 03', assignee: 'Priya Nair', progress: 40 },
    { id: 'WO-2431', title: 'Calibrate flue gas sensor', asset: 'Boiler 01', assignee: 'Arjun Mehta', progress: 75 },
    { id: 'WO-2428', title: 'Inspect impeller', asset: 'Pump 05', assignee: 'Kavya Rao', progress: 10 },
    { id: 'WO-2420', title: 'Quarterly lubrication', asset: 'Press 04', assignee: 'Rohan Das', progress: 100 },
];

const STATUS_COLOR = { Running: 'Positive', Idle: 'Neutral', Fault: 'Negative' } as const;
const SEVERITY_COLOR = { Critical: 'Negative', Major: 'Notice', Minor: 'Neutral' } as const;
const fmt = (n: number) => n.toLocaleString('en-IN');

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

const assetColumns: TableColumn<Asset>[] = [
    /* Table R33: one 'normal' column (the row's identity, with isRowHeader),
       supporting columns at the default 'subtle', numbers right-aligned. */
    { key: 'name', header: 'Asset', emphasis: 'normal', isRowHeader: true, isSortable: true, description: (a) => a.id },
    { key: 'site', header: 'Site', isSortable: true },
    /* Badge R14/R15: a Table cell fixes the badge at Medium (the default). */
    { key: 'status', header: 'Status', isSortable: true, cell: (a) => <Badge label={a.status} color={STATUS_COLOR[a.status]} /> },
    /* A bar in a table row is ProgressBar's default, Large (Table guard). */
    { key: 'uptime', header: 'Uptime', isSortable: true, width: 180, cell: (a) => <ProgressBar value={a.uptime} color={a.uptime < 70 ? 'Negative' : 'Brand'} showPercentage accessibilityLabel={`${a.name} uptime`} /> },
    { key: 'energy', header: 'Energy (kWh)', align: 'right', isSortable: true, cell: (a) => fmt(a.energy) },
];

const alarmColumns: TableColumn<Alarm>[] = [
    { key: 'asset', header: 'Asset', emphasis: 'normal', isRowHeader: true, description: (a) => a.id },
    { key: 'message', header: 'Alarm' },
    { key: 'severity', header: 'Severity', cell: (a) => <Badge label={a.severity} color={SEVERITY_COLOR[a.severity]} /> },
    /* A time of day is metadata: 'muted' (R33). */
    { key: 'raised', header: 'Raised', align: 'right', emphasis: 'muted' },
];

const workOrderColumns: TableColumn<WorkOrder>[] = [
    { key: 'title', header: 'Work order', emphasis: 'normal', isRowHeader: true, description: (w) => w.id },
    { key: 'asset', header: 'Asset' },
    { key: 'assignee', header: 'Assignee' },
    { key: 'progress', header: 'Progress', width: 180, cell: (w) => <ProgressBar value={w.progress} color={w.progress === 100 ? 'Positive' : 'Brand'} showPercentage accessibilityLabel={`${w.id} progress`} /> },
];

/* A metric tile, as the Card guard composes it: padding 16, size Medium, a
   header with no rule, and CardMetric in the body (Metric R3). */
function KpiCard({ title, note, value, unit }: { title: string; note: string; value: React.ReactNode; unit?: string }) {
    return (
        <Card size="Medium" padding={16}>
            <CardHeader showDivider={false}>
                <CardHeaderLeading title={title} subtitle={note} />
            </CardHeader>
            <CardBody>
                <CardMetric value={value} unit={unit} />
            </CardBody>
        </Card>
    );
}

/* The demo's figures are last week's, so the PAGE owns the window (C2,
   Chart R13/R15): fixedRange shows it as the subtitle and, with
   fixedPeriodicity, no picker offers a range the data cannot follow. */
const LAST_WEEK = ((): [Date, Date] => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - ((end.getDay() + 6) % 7) - 1); // last Sunday, 00:00 — a range ending at midnight runs through that day (Chart R6)
    const start = new Date(end);
    start.setDate(start.getDate() - 6); // last Monday, 00:00
    return [start, end];
})();

/* C2: the card keeps its 382px default height; chartRef turns on Download. */
function EnergyChart() {
    const chartRef = useRef<ChartHandle>(null);
    return (
        <Chart title="Energy consumption" fixedRange={LAST_WEEK} fixedPeriodicity="Daily" chartRef={chartRef}>
            <LineChart
                ref={chartRef}
                categories={DAYS}
                series={[
                    { name: 'Pune', data: [41200, 43800, 42100, 45900, 44300, 38200, 36100] },
                    { name: 'Chennai', data: [35100, 34900, 36800, 37200, 38900, 33400, 31800] },
                ]}
                valueSuffix=" kWh"
                yAxisTitle="Energy (kWh)"
            />
        </Chart>
    );
}

function ProductionChart() {
    const chartRef = useRef<ChartHandle>(null);
    return (
        <Chart title="Production by line" fixedRange={LAST_WEEK} fixedPeriodicity="Daily" chartRef={chartRef}>
            <ColumnChart
                ref={chartRef}
                categories={DAYS}
                series={[
                    { name: 'Line 1', data: [1240, 1310, 1280, 1350, 1295, 980, 860] },
                    { name: 'Line 2', data: [1080, 1120, 1190, 1150, 1210, 890, 790] },
                ]}
                valueSuffix=" units"
                yAxisTitle="Units"
            />
        </Chart>
    );
}

function AlarmsTable() {
    return (
        <Table
            accessibilityLabel="Active alarms"
            data={ALARMS}
            columns={alarmColumns}
            getRowId={(a) => a.id}
            toolbar={{ title: 'Active alarms', subtitle: `${ALARMS.length} need attention` }}
        />
    );
}

/* ------------------------------------------------------------------ */
/* Pages — bare blocks, no page title (R11, R22)                        */
/* ------------------------------------------------------------------ */

function OverviewPage() {
    return (
        <>
            <div className="ad-kpis">
                <KpiCard title="Energy today" note="4.2% below yesterday" value={fmt(44300)} unit="kWh" />
                <KpiCard title="OEE" note="Target 85%" value="86.4" unit="%" />
                <KpiCard
                    title="Energy cost (month)"
                    note="Within budget"
                    value={<Metric value={3840000} currency="INR" suffix="humanize" type="Heading" size="Large" weight="Semibold" />}
                />
                <KpiCard title="Assets running" note="1 in fault, 1 idle" value="4" unit={`of ${ASSETS.length}`} />
            </div>
            <div className="ad-row">
                <div className="ad-span-8">
                    <EnergyChart />
                </div>
                <div className="ad-span-4">
                    <Card size="Medium">
                        {/* A count beside the title is a Counter in the suffix (Card R11, Badge R1). */}
                        <CardHeader>
                            <CardHeaderLeading title="Open work orders" subtitle="Assigned this week" suffix={<CardHeaderCounter value={WORK_ORDERS.length} />} />
                        </CardHeader>
                        <CardBody>
                            <List size="Medium">
                                {WORK_ORDERS.map((w) => (
                                    <ListItem key={w.id}>{`${w.id} · ${w.title}`}</ListItem>
                                ))}
                            </List>
                        </CardBody>
                    </Card>
                </div>
            </div>
            <AlarmsTable />
        </>
    );
}

function AssetsPage() {
    return (
        <Table
            accessibilityLabel="Asset register"
            data={ASSETS}
            columns={assetColumns}
            getRowId={(a) => a.id}
            toolbar={{ title: 'All assets', subtitle: `${ASSETS.length} assets across 4 sites`, search: { placeholder: 'Search assets', accessibilityLabel: 'Search assets' } }}
            defaultSortState={{ columnKey: 'name', direction: 'asc' }}
        />
    );
}

function WorkOrdersPage() {
    return (
        <Table
            accessibilityLabel="Work orders"
            data={WORK_ORDERS}
            columns={workOrderColumns}
            getRowId={(w) => w.id}
            toolbar={{ title: 'Work orders', subtitle: 'Open and recently closed' }}
        />
    );
}

function EnergyPage() {
    return (
        <>
            <EnergyChart />
            <div className="ad-row">
                <div className="ad-span-6">
                    <ProductionChart />
                </div>
                <div className="ad-span-6">
                    {/* Categories, not time: the window is fixed and there is no periodicity (Chart R7). */}
                    <Chart title="Energy by asset" fixedRange={LAST_WEEK} showPeriodicity={false}>
                        <ColumnChart
                            categories={ASSETS.map((a) => a.name)}
                            series={[{ name: 'This week', data: ASSETS.map((a) => a.energy) }]}
                            valueSuffix=" kWh"
                            yAxisTitle="Energy (kWh)"
                        />
                    </Chart>
                </div>
            </div>
        </>
    );
}

function NotBuilt({ title }: { title: string }) {
    return (
        <EmptyState
            size="Large"
            asset={<NoDataOneIllustration />}
            title={`${title} is not built yet`}
            description="This dashboard is about the shell; open Overview, Assets, Work orders, Alarms or Energy."
        />
    );
}

/* ------------------------------------------------------------------ */
/* Bruce — one conversation, two places:                               */
/*  · the drawer the shell's Bruce button opens, in `panel` (R9, R27);  */
/*    its empty state is AiDrawerHome                                   */
/*  · the Bruce AI page, whose empty state is AiHome                    */
/* ------------------------------------------------------------------ */

const AGENTS = [{ id: 'bruce', name: 'Bruce', mark: <AiMark size={16} /> }];

const PROMPTS: AiSuggestion[] = [
    { id: 'chiller', label: 'Why is Chiller 03 in fault?' },
    { id: 'energy', label: 'Compare energy use across Pune and Chennai this week' },
    { id: 'shift', label: 'Write a shift report for Line 1' },
];

const RECENTS: AiHomeRecent[] = [
    { id: 'r1', title: 'Energy dashboard for the ball mills', meta: 'Viewed 2 hours ago', icon: LayoutDashboard },
    { id: 'r2', title: 'Boiler 01 flue temperature trend', meta: 'Viewed 5 hours ago', icon: ChartLine },
    { id: 'r3', title: 'Open alarms by severity', meta: 'Viewed 9 hours ago', icon: Siren },
    { id: 'r4', title: 'Compressor 02 baseline drift', meta: 'Viewed 15 hours ago', icon: Gauge },
    { id: 'r5', title: 'Work orders overdue in Chennai', meta: 'Viewed yesterday', icon: ClipboardList },
    { id: 'r6', title: 'Monthly energy cost summary', meta: 'Viewed yesterday', icon: FileText },
    { id: 'r7', title: 'Pump 05 vibration analysis', meta: 'Viewed 2 days ago', icon: Cpu },
    { id: 'r8', title: 'OEE by line, last 30 days', meta: 'Viewed 2 days ago', icon: Gauge },
    { id: 'r9', title: 'Peak demand forecast for Pune', meta: 'Viewed 3 days ago', icon: Zap },
    { id: 'r10', title: 'Chiller 03 fault root cause', meta: 'Viewed 3 days ago', icon: Siren },
    { id: 'r11', title: 'Shift report for Line 1', meta: 'Viewed 4 days ago', icon: FileText },
    { id: 'r12', title: 'Cooling tower water usage spike', meta: 'Viewed 5 days ago', icon: ChartLine },
    { id: 'r13', title: 'Press 04 maintenance history', meta: 'Viewed last week', icon: ClipboardList },
    { id: 'r14', title: 'Plant-wide downtime Pareto', meta: 'Viewed last week', icon: LayoutDashboard },
    { id: 'r15', title: 'Compressed air leak estimate', meta: 'Viewed 2 weeks ago', icon: Factory },
];

interface Chat {
    turns: string[];
    draft: string;
    setDraft: (v: string) => void;
    send: (text: string) => void;
    reset: () => void;
}

function useChat(): Chat {
    const [turns, setTurns] = useState<string[]>([]);
    const [draft, setDraft] = useState('');
    return {
        turns,
        draft,
        setDraft,
        send: (text) => {
            if (!text.trim()) return;
            setTurns((t) => [...t, text]);
            setDraft('');
        },
        reset: () => {
            setTurns([]);
            setDraft('');
        },
    };
}

function Transcript({ chat }: { chat: Chat }) {
    return (
        <AiConversation>
            {chat.turns.flatMap((q, i) => [
                <AiMessage key={`q${i}`} role="user">
                    {q}
                </AiMessage>,
                <AiMessage key={`a${i}`} role="assistant">
                    <AiResponse>{`Chiller 03 is the one to watch — its **discharge pressure** alarm is still open and its uptime is down to **62%**. WO-2437 (condenser fan belt) is 40% done.`}</AiResponse>
                </AiMessage>,
            ])}
        </AiConversation>
    );
}

function Composer({ chat, placeholder }: { chat: Chat; placeholder?: string }) {
    return (
        <AiComposer
            value={chat.draft}
            onChange={chat.setDraft}
            onSubmit={({ text }) => chat.send(text)}
            placeholder={placeholder ?? 'Ask Bruce about your plants…'}
        />
    );
}

function BruceDrawer({ chat, isOpen, onDismiss, page }: { chat: Chat; isOpen: boolean; onDismiss: () => void; page: string }) {
    const [agent, setAgent] = useState('bruce');
    return (
        <AiDrawer
            isOpen={isOpen}
            onDismiss={onDismiss}
            title="Bruce AI"
            subtitle={`Looking at ${page}`}
            agents={AGENTS}
            agent={agent}
            onAgentChange={setAgent}
            onNewChat={chat.reset}
            footer={<Composer chat={chat} />}
        >
            {chat.turns.length ? (
                <Transcript chat={chat} />
            ) : (
                <AiDrawerHome
                    title="Bruce"
                    description="Your plant analyst. Ask about any asset, alarm or report."
                    suggestions={PROMPTS}
                    onSuggestionPick={(p) => chat.setDraft(p.label)}
                />
            )}
        </AiDrawer>
    );
}

/* The Bruce AI page is AiHome throughout. S2 step 4: an assistant whose
   composer stays put while the conversation scrolls is a FIXED-FOOTER page —
   pageHeight="fill", the shell's 16px padding kept (AppShell R17). Before a
   chat starts it shows the greeting, suggestions and recents; once a chat
   starts the transcript goes in its `conversation` and the same composer
   glides to the foot. */
function AssistantPage({ chat }: { chat: Chat }) {
    const [preview, setPreview] = useState<string | null>(null);
    return (
        <AiHome
            heading="What are we looking into today?"
            composer={<Composer chat={chat} placeholder={preview ?? undefined} />}
            conversation={chat.turns.length ? <Transcript chat={chat} /> : undefined}
            suggestions={PROMPTS}
            onSuggestionPick={(p) => chat.setDraft(p.label)}
            onSuggestionPreview={(p) => setPreview(p?.label ?? null)}
            recents={RECENTS}
            onRecentOpen={(id) => chat.send(RECENTS.find((r) => r.id === id)?.title ?? '')}
            footnote="Bruce can make mistakes. Check important info."
        />
    );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

const NOTIFICATIONS = ['Chiller 03 alarm escalated to you', 'WO-2437 assigned to you', 'Weekly energy report is ready'];

function App() {
    const [activeId, setActiveId] = useState('overview');
    const [unread, setUnread] = useState(NOTIFICATIONS.length);
    const [bellOpen, setBellOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [bruceOpen, setBruceOpen] = useState(false);
    const chat = useChat();
    const agents = useAgentsHost(activeId);
    const title = PAGE_TITLES[activeId] ?? '';
    const onAssistantPage = activeId === 'assistant';

    const page =
        activeId === 'overview' ? <OverviewPage />
        : onAssistantPage ? <AssistantPage chat={chat} />
        : activeId === 'agents' ? <AgentsPage {...agents.pageProps} />
        : activeId === 'assets' ? <AssetsPage />
        : activeId === 'work-orders' ? <WorkOrdersPage />
        : activeId === 'alarms' ? <AlarmsTable />
        : activeId === 'energy' ? <EnergyPage />
        : activeId === 'reports' ? <ReportsPage />
        : activeId === 'pattern-contact' ? <ContactsPage />
        : activeId === 'pattern-device' ? <DevicesPage />
        : activeId === 'pattern-notification' ? <NotificationsPage />
        : activeId === 'pattern-settings' ? <SettingsPage onConfigure={() => setActiveId('settings')} />
        : <NotBuilt title={title} />;

    return (
        <>
            <AppShell
                navItems={NAV}
                activeId={activeId}
                onNavigate={(id) => {
                    agents.onNavigate(id);
                    setActiveId(resolveSection(id, SECTION_DEFAULTS));
                }}
                trail={agents.trail(buildTrail(activeId, title, { items: NAV, pageTitles: PAGE_TITLES }), title)}
                profile={{ name: 'Siddharth Jha', email: 'siddharth.j@iosense.io', org: 'Faclon Labs' }}
                unreadCount={unread}
                onOpenNotifications={() => setBellOpen(true)}
                /* The Bruce button steps aside on the Bruce AI page — the same
                   conversation is already the whole page. */
                onOpenAssistant={onAssistantPage ? undefined : () => setBruceOpen((o) => !o)}
                isAssistantOpen={bruceOpen}
                panel={<BruceDrawer chat={chat} isOpen={bruceOpen && !onAssistantPage} onDismiss={() => setBruceOpen(false)} page={title} />}
                /* S2: the Bruce AI page is a fixed-footer page (fill, padding
                   kept); an open agent is a canvas page — its own full-width bar,
                   then a workspace filling the rest (fill, no padding). Every
                   other page is a standard page. App tiles get no toast: opening
                   an app is "a page that opens" (S3 step 4). */
                pageHeight={onAssistantPage || agents.isCanvas ? 'fill' : 'auto'}
                pagePadding={agents.isCanvas ? 'none' : 'default'}
                sideNavFooter={<SideNavFooterRow icon={<CircleQuestionMark size={NAV_ICON_SIZE} />} label="Help" onClick={() => setHelpOpen(true)} />}
            >
                {page}
            </AppShell>

            {/* The bell is the shell's; the panel is the host's (R10). */}
            <Drawer isOpen={bellOpen} onDismiss={() => setBellOpen(false)} accessibilityLabel="Notifications">
                <DrawerHeader title="Notifications" subtitle={unread ? `${unread} unread` : 'All caught up'} leading={<Bell size={20} />} />
                <DrawerBody>
                    {unread ? (
                        <List icon={BellRing} size="Medium">
                            {NOTIFICATIONS.slice(0, unread).map((n) => (
                                <ListItem key={n}>{n}</ListItem>
                            ))}
                        </List>
                    ) : (
                        <EmptyState size="Medium" asset={<NoNotificationIllustration />} title="You're all caught up" description="New notifications will appear here." />
                    )}
                </DrawerBody>
                <DrawerFooter>
                    {/* Button: the partner of a primary is primary + neutral, never secondary. */}
                    <Button variant="primary" tone="neutral" label="Close" onClick={() => setBellOpen(false)} />
                    <Button label="Mark all read" isDisabled={!unread} onClick={() => setUnread(0)} />
                </DrawerFooter>
            </Drawer>

            {/* Help opens a panel, so the result is on screen — no toast (S3). */}
            <Drawer isOpen={helpOpen} onDismiss={() => setHelpOpen(false)} accessibilityLabel="Help">
                <DrawerHeader title="Help" leading={<CircleQuestionMark size={20} />} />
                <DrawerBody>
                    <EmptyState size="Medium" title="The help centre is not built yet" description="In the product, guides and ways to contact support open here." />
                </DrawerBody>
            </Drawer>

            {/* G20: one ToastContainer at the root, defaults only. */}
            <ToastContainer />
        </>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
