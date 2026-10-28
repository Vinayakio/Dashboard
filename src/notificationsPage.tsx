/* Patterns › Notification — the IO Sense notification centre from Figma
   ("IO Sense Reference" › Notifications): a searchable, filterable feed in
   All / Alerts / Activity tabs, grouped by day, and an Alert Detail drawer
   with Details and a comment thread. FDS components and tokens only. A
   standard page inside AppShell (S2 step 5), so the shell padding stays. */
import { useId, useMemo, useState, type FormEvent } from 'react';
import {
    ArrowDownWideNarrow,
    ChevronDown,
    ChevronRight,
    Download,
    EllipsisVertical,
    ExternalLink,
    Eye,
    ListFilter,
    MessageSquarePlus,
    Pencil,
    Reply,
    SendHorizontal,
    ThumbsUp,
    Check,
    Trash,
    TriangleAlert,
} from 'lucide-react';
import {
    ActionList,
    ActionListItem,
    ActionListItemIcon,
    ActionListSection,
    Avatar,
    Badge,
    Button,
    Card,
    CardBody,
    Counter,
    Divider,
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    DropdownMenu,
    DropdownMenuFooter,
    DropdownMenuOverlay,
    DropdownMenuTrigger,
    EmptyState,
    IconButton,
    Indicator,
    LinkButton,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    SearchInput,
    SelectInput,
    Switch,
    TabItem,
    TabList,
    TabPanel,
    Tabs,
    TextArea,
    Tooltip,
    useToast,
} from '@faclon-labs/fds';
import { AREAS, DEVICES, NOTIFICATIONS, type Comment, type Notification, type Severity, type Status } from './notificationsData';
import './notifications.css';

/* Severity is meaning, so it carries the colour (the mark and the Badge). */
const SEVERITY: Record<Severity, { label: string; badge: 'Negative' | 'Notice' | 'Information' | 'Brand' | 'Positive' }> = {
    critical: { label: 'Critical', badge: 'Negative' },
    major: { label: 'Major', badge: 'Notice' },
    minor: { label: 'Minor', badge: 'Information' },
    info: { label: 'Info', badge: 'Brand' },
    resolved: { label: 'Resolved', badge: 'Positive' },
};
const STATUS: Record<Status, string> = { open: 'Open', acknowledged: 'Acknowledged', resolved: 'Resolved' };

/* One multi-select menu, one value per pick: "<group>:<key>". Picks apply
   at once (commitMode immediate), so the footer's Clear all is just an action. */
const QUICK = [
    { value: 'q:unread', title: 'Unread', test: (n: Notification) => n.isUnread },
    { value: 'q:comments', title: 'Has comments', test: (n: Notification) => n.comments.length > 0 },
    { value: 'q:today', title: 'Today', test: (n: Notification) => dayGroup(n.at) === 'Today' },
];
const GROUPS: { key: 'severity' | 'status' | 'device' | 'area'; title: string; options: { value: string; title: string }[] }[] = [
    { key: 'severity', title: 'Severity', options: (Object.keys(SEVERITY) as Severity[]).map((s) => ({ value: s, title: SEVERITY[s].label })) },
    { key: 'status', title: 'Stage', options: (Object.keys(STATUS) as Status[]).map((s) => ({ value: s, title: STATUS[s] })) },
    { key: 'device', title: 'Device', options: DEVICES.map((d) => ({ value: d, title: d })) },
    { key: 'area', title: 'Area', options: AREAS.map((a) => ({ value: a, title: a })) },
];

/* Quick filters must all hold; within a group any pick matches; across groups all must. */
function matches(n: Notification, picked: string[]) {
    const quick = QUICK.filter((q) => picked.includes(q.value));
    if (!quick.every((q) => q.test(n))) return false;
    return GROUPS.every((g) => {
        const want = picked.filter((v) => v.startsWith(`${g.key}:`)).map((v) => v.slice(g.key.length + 1));
        return !want.length || want.includes(String(n[g.key]));
    });
}

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const dayGroup = (d: Date) => {
    const diff = (startOfDay(new Date()) - startOfDay(d)) / DAY;
    return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : 'Earlier';
};
const dateLine = (d: Date) => {
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
    const rel = mins < 60 ? `${Math.max(mins, 1)} min ago` : mins < 24 * 60 ? plural(Math.round(mins / 60), 'hour') : plural(Math.round(mins / (24 * 60)), 'day');
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} • ${rel}`;
};
const timeOf = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/* ------------------------------------------------------------------ */
/* Feed                                                                */
/* ------------------------------------------------------------------ */

function NotificationCard({ n, onOpen, onRemark, onStatus }: { n: Notification; onOpen: (tab: 'details' | 'comments') => void; onRemark: () => void; onStatus: (s: Status) => void }) {
    const sev = SEVERITY[n.severity];
    return (
        <div className="nt-item">
            {/* A filled severity mark, as in Figma: the icon on a solid tone fill. */}
            <span className={`nt-mark nt-mark--${n.severity}`} role="img" aria-label={`${sev.label} severity`}>
                <TriangleAlert size={16} aria-hidden />
            </span>
            <Card size="Medium" padding={16}>
                <CardBody>
                    <div className="nt-card">
                        <div className="nt-card__main">
                            {/* Title and description read as one block, 8 apart. */}
                            <div className="nt-card__text">
                                <div className="nt-title">
                                    {n.isUnread && <Indicator color="Negative" size="Small" accessibilityLabel="Unread" />}
                                    <span className="BodyMediumMedium">{n.title}</span>
                                </div>
                                <p className="BodySmallRegular nt-flush">{n.description}</p>
                            </div>
                            <div className="nt-tags">
                                <Badge label={sev.label} color={sev.badge} size="Small" />
                                {n.status !== 'open' && n.severity !== 'resolved' && <Badge label={STATUS[n.status]} color="Neutral" size="Small" />}
                                {n.tags.map((t) => (
                                    <Badge key={t} label={t} color="Neutral" size="Small" />
                                ))}
                            </div>
                            <span className="BodySmallRegular nt-muted">{dateLine(n.at)}</span>
                        </div>
                        {/* isHighlighted: the 32px square appears on hover and focus (IconButton). */}
                        <div className="nt-card__actions">
                            {/* Tooltip on the icon-only action, same words as its name (Tooltip guard). */}
                            <Tooltip content="Add remark">
                                <IconButton icon={MessageSquarePlus} size="Medium" isHighlighted accessibilityLabel="Add remark" onClick={onRemark} />
                            </Tooltip>
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <IconButton icon={EllipsisVertical} size="Medium" isHighlighted accessibilityLabel={`More actions for ${n.title}`} onClick={() => {}} />
                                </DropdownMenuTrigger>
                                <DropdownMenuOverlay>
                                    <ActionList accessibilityLabel="Notification actions">
                                        <ActionListItem value="view" title="View details" leading={<ActionListItemIcon icon={Eye} />} onClick={() => onOpen('details')} />
                                        <ActionListItem value="ack" title="Acknowledge" leading={<ActionListItemIcon icon={ThumbsUp} />} isDisabled={n.status !== 'open'} onClick={() => onStatus('acknowledged')} />
                                        <ActionListItem value="resolve" title="Mark as resolved" leading={<ActionListItemIcon icon={Check} />} isDisabled={n.status === 'resolved'} onClick={() => onStatus('resolved')} />
                                    </ActionList>
                                </DropdownMenuOverlay>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}

function Feed({ items, onOpen, onRemark, onStatus }: { items: Notification[]; onOpen: (n: Notification, tab: 'details' | 'comments') => void; onRemark: (n: Notification) => void; onStatus: (n: Notification, s: Status) => void }) {
    if (!items.length) return <EmptyState size="Medium" title="No notifications match" description="Try a different search or clear the filters." />;
    const groups = ['Today', 'Yesterday', 'Earlier'].map((g) => ({ g, rows: items.filter((n) => dayGroup(n.at) === g) })).filter((x) => x.rows.length);
    return (
        <div className="nt-feed">
            {groups.map(({ g, rows }) => (
                <section key={g} className="nt-group" aria-label={g}>
                    <div className="nt-group__head">
                        <span className="BodyMediumRegular nt-muted">{g}</span>
                        <Divider />
                    </div>
                    {rows.map((n) => (
                        <NotificationCard key={n.id} n={n} onOpen={(tab) => onOpen(n, tab)} onRemark={() => onRemark(n)} onStatus={(s) => onStatus(n, s)} />
                    ))}
                </section>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Alert Detail drawer                                                 */
/* ------------------------------------------------------------------ */

function CommentRow({ c, isReply, onReply, onDelete }: { c: Comment; isReply?: boolean; onReply?: () => void; onDelete: (id: string) => void }) {
    return (
        <div className="nt-comment">
            <Avatar size="Small" name={c.author} />
            <div className="nt-comment__main">
                <div className="nt-comment__head">
                    <span className="BodyMediumMedium">{c.author}</span>
                    <span className="BodyXSmallRegular nt-muted">{dateLine(c.at)}</span>
                    <span className="nt-comment__tools">
                        {!isReply && onReply && <IconButton icon={Reply} accessibilityLabel={`Reply to ${c.author}`} onClick={onReply} />}
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <IconButton icon={EllipsisVertical} accessibilityLabel={`Actions for ${c.author}'s comment`} onClick={() => {}} />
                            </DropdownMenuTrigger>
                            <DropdownMenuOverlay>
                                <ActionList accessibilityLabel="Comment actions">
                                    <ActionListItem value="edit" title="Edit" leading={<ActionListItemIcon icon={Pencil} />} isDisabled />
                                    <ActionListItem value="delete" title="Delete" intent="negative" leading={<ActionListItemIcon icon={Trash} />} onClick={() => onDelete(c.id)} />
                                </ActionList>
                            </DropdownMenuOverlay>
                        </DropdownMenu>
                    </span>
                </div>
                <p className="BodyMediumRegular nt-flush">{c.text}</p>
            </div>
        </div>
    );
}

function Thread({ c, onReply, onDelete }: { c: Comment; onReply: (c: Comment) => void; onDelete: (id: string) => void }) {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="nt-thread">
            <div className="nt-thread__toggle">
                {c.replies.length > 0 && (
                    <IconButton icon={isOpen ? ChevronDown : ChevronRight} accessibilityLabel={isOpen ? 'Hide replies' : 'Show replies'} onClick={() => setIsOpen((o) => !o)} />
                )}
            </div>
            <div className="nt-thread__body">
                <CommentRow c={c} onReply={() => onReply(c)} onDelete={onDelete} />
                <div className="nt-thread__indent">
                    {c.replies.length === 0 ? null : isOpen ? (
                        c.replies.map((r) => <CommentRow key={r.id} c={r} isReply onDelete={onDelete} />)
                    ) : (
                        <div>
                            <Button variant="secondary" tone="neutral" size="sm" label={`${c.replies.length} ${c.replies.length === 1 ? 'reply' : 'replies'}`} onClick={() => setIsOpen(true)} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AlertDrawer({
    n,
    tab,
    onTab,
    onDismiss,
    onStatus,
    onComments,
}: {
    n: Notification | null;
    tab: 'details' | 'comments';
    onTab: (t: 'details' | 'comments') => void;
    onDismiss: () => void;
    onStatus: (s: Status) => void;
    onComments: (comments: Comment[]) => void;
}) {
    const { show } = useToast();
    const [draft, setDraft] = useState('');
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const count = n ? n.comments.reduce((s, c) => s + 1 + c.replies.length, 0) : 0;
    const sev = n ? SEVERITY[n.severity] : null;

    /* A new comment appears in the thread — no toast (S3 step 4). */
    const send = () => {
        if (!n || !draft.trim()) return;
        const c: Comment = { id: `c${Date.now()}`, author: 'Siddharth Jha', at: new Date(), text: draft.trim(), replies: [] };
        onComments(replyTo ? n.comments.map((x) => (x.id === replyTo.id ? { ...x, replies: [...x.replies, c] } : x)) : [...n.comments, c]);
        setDraft('');
        setReplyTo(null);
    };
    /* Delete: confirm first, then a toast — nothing else confirms it (S3). */
    const remove = () => {
        if (!n || !deleting) return;
        onComments(n.comments.filter((c) => c.id !== deleting).map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== deleting) })));
        setDeleting(null);
        show({ color: 'Positive', content: 'Comment deleted.' });
    };

    return (
        <>
            <Drawer isOpen={!!n} onDismiss={onDismiss} accessibilityLabel="Alert detail">
                <DrawerHeader title="Alert detail" />
                <DrawerBody>
                    {n && sev && (
                        <div className="nt-detail">
                            <div className="nt-detail__summary">
                                <div className="nt-title">
                                    {n.isUnread && <Indicator color="Negative" size="Small" accessibilityLabel="Unread" />}
                                    <span className="BodyLargeMedium">{n.title}</span>
                                </div>
                                <p className="BodyMediumRegular nt-flush">{n.description}</p>
                                <div className="nt-tags">
                                    <Badge label={sev.label} color={sev.badge} size="Small" />
                                    {n.status !== 'open' && n.severity !== 'resolved' && <Badge label={STATUS[n.status]} color="Neutral" size="Small" />}
                                    {n.tags.map((t) => (
                                        <Badge key={t} label={t} color="Neutral" size="Small" />
                                    ))}
                                </div>
                                <dl className="nt-stats">
                                    <div>
                                        <dt className="BodyMediumRegular nt-muted">Current</dt>
                                        <dd className={`BodyLargeMedium ${n.current > n.threshold && n.status !== 'resolved' ? 'nt-over' : ''}`}>{n.current}</dd>
                                    </div>
                                    <div>
                                        <dt className="BodyMediumRegular nt-muted">Threshold</dt>
                                        <dd className="BodyLargeMedium">{n.threshold}</dd>
                                    </div>
                                    <div>
                                        <dt className="BodyMediumRegular nt-muted">Triggered on</dt>
                                        <dd className="BodyLargeMedium">{timeOf(n.at)}</dd>
                                    </div>
                                </dl>
                                <span className="BodySmallRegular nt-muted">{dateLine(n.at)}</span>
                                {/* The new status shows as a Badge at once — no toast (S3 step 4). */}
                                <div className="nt-detail__actions">
                                    <Button variant="secondary" tone="neutral" label="Mark as resolved" isFullWidth isDisabled={n.status === 'resolved'} onClick={() => onStatus('resolved')} />
                                    <Button variant="secondary" tone="neutral" label="Acknowledge" isFullWidth isDisabled={n.status !== 'open'} onClick={() => onStatus('acknowledged')} />
                                </div>
                            </div>

                            <Tabs value={tab} onChange={(v) => onTab(v as 'details' | 'comments')}>
                                <TabList>
                                    <TabItem value="details">Details</TabItem>
                                    <TabItem value="comments" trailing={<Counter value={count} />}>
                                        Comments
                                    </TabItem>
                                </TabList>
                                <TabPanel value="details">
                                    <div className="nt-tabpanel">
                                        <dl className="nt-kv">
                                            {[
                                                ['Sensor', n.sensor],
                                                ['Device', n.device],
                                                ['Device type', n.deviceType],
                                                ['Area', n.area],
                                                ['Duration', n.duration],
                                                ['Event', n.event],
                                            ].map(([k, v]) => (
                                                <div key={k} className="nt-kv__row">
                                                    <dt className="BodyMediumRegular nt-muted">{k}</dt>
                                                    <dd className="BodyMediumRegular">{v}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                        <div className="nt-links">
                                            <span className="BodyMediumRegular nt-muted">Quicklinks</span>
                                            <div className="nt-links__row">
                                                <LinkButton href="#/assets" label={n.device} icon={<ExternalLink />} iconPosition="right" />
                                                <LinkButton href="#/energy" label="Energy dashboard" icon={<ExternalLink />} iconPosition="right" />
                                            </div>
                                        </div>
                                    </div>
                                </TabPanel>
                                <TabPanel value="comments">
                                    <div className="nt-tabpanel">
                                        {n.comments.length ? (
                                            n.comments.map((c) => (
                                                <Thread
                                                    key={c.id}
                                                    c={c}
                                                    onReply={(x) => {
                                                        setReplyTo(x);
                                                        onTab('comments');
                                                    }}
                                                    onDelete={setDeleting}
                                                />
                                            ))
                                        ) : (
                                            <EmptyState size="Medium" title="No comments yet" description="Leave a note for the team below." />
                                        )}
                                    </div>
                                </TabPanel>
                            </Tabs>
                        </div>
                    )}
                </DrawerBody>
                {tab === 'comments' && (
                    <DrawerFooter>
                        <div className="nt-composer">
                            <TextArea
                                label={replyTo ? `Reply to ${replyTo.author}` : 'Comment'}
                                placeholder="Leave a note"
                                numberOfLines={2}
                                isResizable={false}
                                value={draft}
                                onChange={({ value }) => setDraft(value ?? '')}
                                onKeyDown={({ key, event }) => {
                                    if (key === 'Enter' && !event.shiftKey) {
                                        event.preventDefault();
                                        send();
                                    }
                                }}
                                helpText={replyTo ? undefined : 'Enter to send, Shift + Enter for a new line.'}
                            />
                            <div className="nt-composer__actions">
                                {replyTo && <Button variant="primary" tone="neutral" size="sm" label="Cancel reply" onClick={() => setReplyTo(null)} />}
                                <Button size="sm" label="Send" leadingIcon={<SendHorizontal size={14} />} onClick={send} />
                            </div>
                        </div>
                    </DrawerFooter>
                )}
            </Drawer>

            <Modal isOpen={!!deleting} onDismiss={() => setDeleting(null)} size="sm" accessibilityLabel="Delete comment">
                <ModalHeader title="Delete this comment?" />
                <ModalBody>
                    <p className="BodyMediumRegular nt-flush">The comment is removed for everyone. This can't be undone.</p>
                </ModalBody>
                <ModalFooter>
                    <Button variant="primary" tone="neutral" label="Cancel" onClick={() => setDeleting(null)} />
                    <Button tone="negative" label="Delete" onClick={remove} />
                </ModalFooter>
            </Modal>
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Add notification remark                                             */
/* ------------------------------------------------------------------ */

const REMARK_GROUPS = ['Under investigation', 'Maintenance scheduled', 'False alarm', 'Resolved by operator', 'Escalated to plant head'];
const REMARK_MAX = 500;

/* A form in a Modal (P1 R3): the fields, then Cancel / Add in ModalFooter,
   validated on submit (R11–R12). The group is the remark; Custom remark
   swaps in your own words, so only then is the text field required. */
function RemarkDialog({ n, onAdd, onClose }: { n: Notification; onAdd: (text: string) => void; onClose: () => void }) {
    const formId = useId();
    const [group, setGroup] = useState<string>();
    const [isCustom, setIsCustom] = useState(false);
    const [text, setText] = useState('');
    const [errors, setErrors] = useState<{ group?: string; text?: string }>({});

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const next: typeof errors = {};
        if (!group) next.group = 'Pick a remark group.';
        if (isCustom && !text.trim()) next.text = 'Write the remark.';
        else if (isCustom && text.length > REMARK_MAX) next.text = `Keep it to ${REMARK_MAX} characters.`;
        setErrors(next);
        if (next.group || next.text) return;
        onAdd(isCustom ? `${group}: ${text.trim()}` : group!);
        onClose();
    };

    return (
        <Modal isOpen onDismiss={onClose} size="md" accessibilityLabel="Add notification remark">
            <ModalHeader title="Add notification remark" subtitle={n.title} />
            <ModalBody>
                <form id={formId} className="nt-remark" onSubmit={submit} noValidate>
                    <DropdownMenu
                        selectionType="single"
                        value={group ? [group] : []}
                        onChange={({ values }) => {
                            if (!values[0]) return;
                            setGroup(values[0]);
                            setErrors((x) => ({ ...x, group: undefined }));
                        }}
                    >
                        <SelectInput label="Remark group name" necessityIndicator="required" placeholder="Select a group" validationState={errors.group ? 'error' : 'none'} errorText={errors.group} />
                        <DropdownMenuOverlay>
                            <ActionList accessibilityLabel="Remark group name">
                                {REMARK_GROUPS.map((g) => (
                                    <ActionListItem key={g} value={g} title={g} />
                                ))}
                            </ActionList>
                        </DropdownMenuOverlay>
                    </DropdownMenu>
                    {/* The switch changes the form at once (shows the text field), so it is a Switch, labelled by its row. */}
                    <div className="nt-remark__switch">
                        <span className="BodyMediumMedium">Custom remark</span>
                        <Switch
                            accessibilityLabel="Custom remark"
                            isChecked={isCustom}
                            onChange={({ isChecked }) => {
                                setIsCustom(isChecked);
                                setErrors((x) => ({ ...x, text: undefined }));
                            }}
                        />
                    </div>
                    {isCustom && (
                        <TextArea
                            label="Custom remark"
                            necessityIndicator="required"
                            placeholder="Enter custom remark"
                            numberOfLines={3}
                            maxCharacters={REMARK_MAX}
                            value={text}
                            onChange={({ value }) => {
                                setText(value ?? '');
                                setErrors((x) => ({ ...x, text: undefined }));
                            }}
                            validationState={errors.text ? 'error' : 'none'}
                            errorText={errors.text}
                        />
                    )}
                </form>
            </ModalBody>
            <ModalFooter>
                <Button variant="primary" tone="neutral" label="Cancel" onClick={onClose} />
                <Button type="submit" form={formId} label="Add" />
            </ModalFooter>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function NotificationsPage() {
    const { show } = useToast();
    const [items, setItems] = useState(NOTIFICATIONS);
    const [remarkFor, setRemarkFor] = useState<Notification | null>(null);
    const [tab, setTab] = useState('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
    const [picked, setPicked] = useState<string[]>([]);
    const [openId, setOpenId] = useState<string | null>(null);
    const [drawerTab, setDrawerTab] = useState<'details' | 'comments'>('details');
    const open = items.find((n) => n.id === openId) ?? null;

    const update = (id: string, patch: Partial<Notification>) => setItems((xs) => xs.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    const openDrawer = (n: Notification, t: 'details' | 'comments') => {
        setOpenId(n.id);
        setDrawerTab(t);
        update(n.id, { isUnread: false });
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items
            .filter((n) => (tab === 'alerts' ? n.kind === 'alert' : tab === 'activity' ? n.kind === 'activity' : true))
            .filter((n) => !q || `${n.title} ${n.description} ${n.tags.join(' ')}`.toLowerCase().includes(q))
            .filter((n) => matches(n, picked))
            .sort((a, b) => (sort === 'newest' ? b.at.getTime() - a.at.getTime() : a.at.getTime() - b.at.getTime()));
    }, [items, tab, query, picked, sort]);

    const counts = { all: items.length, alerts: items.filter((n) => n.kind === 'alert').length };
    const feed = <Feed items={visible} onOpen={openDrawer} onRemark={setRemarkFor} onStatus={(n, s) => update(n.id, { status: s, isUnread: false })} />;

    return (
        <div className="nt">
            <Tabs value={tab} onChange={setTab}>
                <TabList>
                    <TabItem value="all" trailing={<Counter value={counts.all} />}>
                        All
                    </TabItem>
                    <TabItem value="alerts" trailing={<Counter value={counts.alerts} />}>
                        Alerts
                    </TabItem>
                    <TabItem value="activity">Activity</TabItem>
                </TabList>

                <div className="nt-toolbar">
                    <div className="nt-toolbar__search">
                        <SearchInput accessibilityLabel="Search notifications" placeholder="Search notifications" value={query} onChange={({ value }) => setQuery(value ?? '')} />
                    </div>
                    <div className="nt-toolbar__end">
                        {/* As on Device: active filters show as a dot on the button's corner,
                            beside the Button, never inside it (Indicator guard). */}
                        <span className="nt-filter">
                            <DropdownMenu selectionType="multiple" value={picked} onChange={({ values }) => setPicked(values)}>
                                <DropdownMenuTrigger>
                                    <Button variant="secondary" tone="neutral" label="Filter" leadingIcon={<ListFilter size={16} />} />
                                </DropdownMenuTrigger>
                                <DropdownMenuOverlay>
                                    {/* No header: the list names the menu itself. */}
                                    <ActionList accessibilityLabel="Filters">
                                        <ActionListSection title="Quick filters">
                                            {QUICK.map((q) => (
                                                <ActionListItem key={q.value} value={q.value} title={q.title} />
                                            ))}
                                        </ActionListSection>
                                        {GROUPS.map((g) => (
                                            <ActionListSection key={g.key} title={g.title}>
                                                {g.options.map((o) => (
                                                    <ActionListItem key={o.value} value={`${g.key}:${o.value}`} title={o.title} />
                                                ))}
                                            </ActionListSection>
                                        ))}
                                    </ActionList>
                                    <DropdownMenuFooter actions={{ secondary: { text: 'Clear all', onClick: () => setPicked([]) } }} />
                                </DropdownMenuOverlay>
                            </DropdownMenu>
                            {picked.length > 0 && (
                                <span className="nt-filter__dot">
                                    <Indicator color="Information" accessibilityLabel={`${picked.length} ${picked.length === 1 ? 'filter' : 'filters'} on`} />
                                </span>
                            )}
                        </span>
                        <DropdownMenu selectionType="single" value={[sort]} onChange={({ values }) => values[0] && setSort(values[0] as 'newest' | 'oldest')}>
                            <DropdownMenuTrigger>
                                <Button variant="secondary" tone="neutral" iconOnly aria-label="Sort notifications">
                                    <ArrowDownWideNarrow size={16} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuOverlay>
                                <ActionList accessibilityLabel="Sort">
                                    <ActionListItem value="newest" title="Newest first" />
                                    <ActionListItem value="oldest" title="Oldest first" />
                                </ActionList>
                            </DropdownMenuOverlay>
                        </DropdownMenu>
                        {/* An export leaves nothing on screen — it gets a toast (S3 step 3). */}
                        <Button
                            variant="secondary"
                            tone="neutral"
                            iconOnly
                            aria-label="Export notifications"
                            onClick={() => show({ color: 'Positive', content: `${visible.length} notifications exported as CSV.` })}
                        >
                            <Download size={16} />
                        </Button>
                    </div>
                </div>

                <TabPanel value="all">{feed}</TabPanel>
                <TabPanel value="alerts">{feed}</TabPanel>
                <TabPanel value="activity">{feed}</TabPanel>
            </Tabs>

            {remarkFor && (
                <RemarkDialog
                    n={remarkFor}
                    onClose={() => setRemarkFor(null)}
                    onAdd={(text) => {
                        const c: Comment = { id: `c${Date.now()}`, author: 'Siddharth Jha', at: new Date(), text, replies: [] };
                        update(remarkFor.id, { comments: [...remarkFor.comments, c], isUnread: false });
                        /* The remark lands in the drawer, not on the card — a toast confirms it (S3 step 3). */
                        show({ color: 'Positive', content: `Remark added to “${remarkFor.title}”.` });
                    }}
                />
            )}

            <AlertDrawer
                n={open}
                tab={drawerTab}
                onTab={setDrawerTab}
                onDismiss={() => setOpenId(null)}
                onStatus={(s) => open && update(open.id, { status: s })}
                onComments={(comments) => open && update(open.id, { comments })}
            />
        </div>
    );
}
