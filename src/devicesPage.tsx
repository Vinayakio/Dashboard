/* Patterns › Device — the device list: a search and Add Device over the
   devices grouped by area (favourites first), one Card per device with its
   type tile, name, type, an actions menu and the date it was added; a Filter
   menu for hidden devices, favourites and name order; an edit mode for bulk
   hide and delete. FDS components and
   tokens only; a standard page inside AppShell (S2 step 5). */
import { useId, useMemo, useState, type FormEvent } from 'react';
import { Atom, Boxes, Download, EllipsisVertical, Eye, EyeOff, Flame, Layers, ListFilter, Pencil, Plus, Settings, Star, Sun, Thermometer, Trash, Waves, Zap, type LucideIcon } from 'lucide-react';
import {
    ActionList,
    ActionListItem,
    ActionListItemIcon,
    ActionListSection,
    Button,
    Card,
    CardBody,
    Checkbox,
    Divider,
    DropdownMenu,
    DropdownMenuFooter,
    DropdownMenuOverlay,
    DropdownMenuTrigger,
    EmptyState,
    FileThumbnail,
    FileUpload,
    IconButton,
    Indicator,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Radio,
    RadioGroup,
    SearchInput,
    Table,
    TextInput,
    Tooltip,
    useToast,
    type DsFile,
} from '@faclon-labs/fds';
import { DeviceConfigDialog, defaultConfig, type DeviceConfig } from './deviceConfigDialog';
import './devices.css';

type Tone = 'brand' | 'info' | 'notice' | 'positive' | 'negative' | 'neutral';
const TYPES: Record<string, { icon: LucideIcon; tone: Tone }> = {
    'Solar Inverter': { icon: Sun, tone: 'notice' },
    Energymeter: { icon: Zap, tone: 'brand' },
    'Electron Beaming': { icon: Atom, tone: 'info' },
    'Temperature - Humidity': { icon: Thermometer, tone: 'positive' },
    'Steam Trap': { icon: Flame, tone: 'negative' },
    'Flow Meter': { icon: Waves, tone: 'info' },
    'Custom Sections': { icon: Boxes, tone: 'neutral' },
};

interface Device { id: string; name: string; deviceId?: string; type: string; area: string; addedOn: Date; isFavourite: boolean; isHidden?: boolean; config?: DeviceConfig }

const d = (y: number, m: number, day: number, h: number, min: number) => new Date(y, m - 1, day, h, min);
const DEVICES: Device[] = [
    { id: 'd1', name: 'ADSIM_F1', type: 'Solar Inverter', area: 'Others', addedOn: d(2025, 10, 2, 11, 15), isFavourite: false },
    { id: 'd2', name: 'ADSIM_F2', type: 'Solar Inverter', area: 'Others', addedOn: d(2025, 10, 3, 16, 30), isFavourite: false },
    { id: 'd3', name: 'AMB_A1', type: 'Energymeter', area: 'Others', addedOn: d(2025, 10, 5, 8, 50), isFavourite: false },
    { id: 'd4', name: 'APREBM_A1', type: 'Electron Beaming', area: 'Others', addedOn: d(2025, 10, 7, 9, 5), isFavourite: false },
    { id: 'd5', name: 'RHT_1005', type: 'Temperature - Humidity', area: 'Others', addedOn: d(2025, 10, 9, 10, 40), isFavourite: false },
    { id: 'd6', name: 'STM_10045001', type: 'Steam Trap', area: 'Others', addedOn: d(2025, 10, 11, 17, 12), isFavourite: false },
    { id: 'd7', name: 'STM_10045002', type: 'Steam Trap', area: 'Others', addedOn: d(2025, 10, 12, 7, 38), isFavourite: false },
    { id: 'd8', name: 'FLW_2201', type: 'Flow Meter', area: 'Others', addedOn: d(2025, 10, 15, 12, 0), isFavourite: false },
    { id: 'd9', name: 'UTLC2312BM_A3', type: 'Custom Sections', area: 'Others', addedOn: d(2025, 10, 18, 15, 25), isFavourite: false },
    { id: 'd10', name: 'JSWREM_T1', type: 'Energymeter', area: 'CCL-01 PDB Panel Room', addedOn: d(2025, 11, 11, 18, 4), isFavourite: false },
    { id: 'd11', name: 'JSWREM_T2', type: 'Energymeter', area: 'CCL-01 PDB Panel Room', addedOn: d(2025, 11, 12, 9, 22), isFavourite: false },
    { id: 'd12', name: 'JSWREM_T3', type: 'Energymeter', area: 'CCL-01 PDB Panel Room', addedOn: d(2025, 11, 14, 14, 47), isFavourite: false },
];

const pad = (n: number) => String(n).padStart(2, '0');
const addedOn = (t: Date) => {
    const h = t.getHours() % 12 || 12;
    return `${pad(t.getDate())}/${pad(t.getMonth() + 1)}/${t.getFullYear()} @ ${pad(h)}:${pad(t.getMinutes())} ${t.getHours() < 12 ? 'am' : 'pm'}`;
};

function DeviceCard({
    device,
    selection,
    onFavourite,
    onHide,
    onConfig,
    onDelete,
}: {
    device: Device;
    /** Set while the page is in edit mode: the card is picked with a Checkbox instead of its menu. */
    selection?: { isSelected: boolean; onToggle: () => void };
    onFavourite: () => void;
    onHide: () => void;
    onConfig: (what: string) => void;
    onDelete: () => void;
}) {
    const t = TYPES[device.type] ?? TYPES['Custom Sections'];
    return (
        /* Edit mode: the whole card is the control (Card: onClick + isSelected —
           a 2px brand ring, aria-pressed on the overlay). The checkbox mirrors
           that state as a visual mark only, so it is hidden from assistive tech. */
        <Card
            size="Medium"
            padding={16}
            {...(selection ? { onClick: selection.onToggle, isSelected: selection.isSelected, accessibilityLabel: `Select ${device.name}` } : {})}
        >
            <CardBody>
                <div className="dv-card">
                    <div className="dv-card__head">
                        {/* The type's tile — FDS has no tinted icon tile, so tokens only, as on Settings. */}
                        <span className={`dv-tile dv-tile--${t.tone}`} aria-hidden>
                            <t.icon size={20} />
                        </span>
                        <div className="dv-card__name">
                            <span className="BodyLargeSemibold dv-wrap">{device.name}</span>
                            <span className="BodyMediumRegular dv-muted">{device.type}</span>
                        </div>
                        {selection ? (
                            <span className="dv-check" aria-hidden>
                                <Checkbox isChecked={selection.isSelected} onChange={selection.onToggle} tabIndex={-1} aria-label={`Select ${device.name}`} />
                            </span>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <IconButton icon={EllipsisVertical} size="Medium" isHighlighted accessibilityLabel={`Actions for ${device.name}`} onClick={() => {}} />
                                </DropdownMenuTrigger>
                                <DropdownMenuOverlay>
                                    <ActionList accessibilityLabel={`${device.name} actions`}>
                                        <ActionListItem value="fav" title={device.isFavourite ? 'Remove from favourites' : 'Add to favourites'} leading={<ActionListItemIcon icon={Star} />} onClick={onFavourite} />
                                        <ActionListItem
                                            value="hide"
                                            title={device.isHidden ? 'Unhide device' : 'Hide device'}
                                            leading={<ActionListItemIcon icon={device.isHidden ? Eye : EyeOff} />}
                                            onClick={onHide}
                                        />
                                        <ActionListItem value="config" title="Device config" leading={<ActionListItemIcon icon={Settings} />} onClick={() => onConfig('Device config')} />
                                        <ActionListItem value="overview" title="Overview config" leading={<ActionListItemIcon icon={Layers} />} onClick={() => onConfig('Overview config')} />
                                        <ActionListItem value="delete" title="Delete" intent="negative" leading={<ActionListItemIcon icon={Trash} />} onClick={onDelete} />
                                    </ActionList>
                                </DropdownMenuOverlay>
                            </DropdownMenu>
                        )}
                    </div>
                    <Divider />
                    <span className="BodySmallRegular dv-muted">Added On: {addedOn(device.addedOn)}</span>
                </div>
            </CardBody>
        </Card>
    );
}

interface NewDevice { name: string; deviceId: string }
const ID_PATTERN = /^[A-Z0-9_-]+$/i;
const TEMPLATE_NAME = 'Bulk upload template.csv';

/* The template the bulk file starts from: a header row and one example. */
function downloadTemplate() {
    const blob = new Blob(['Device Name,Device ID\nJSWREM_T4,JSW-EM-0004\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: TEMPLATE_NAME }).click();
    URL.revokeObjectURL(url);
}

/* Reads "Device Name,Device ID" rows; returns the devices or the first problem. */
async function readSheet(file: File): Promise<{ rows: NewDevice[] } | { error: string }> {
    const lines = (await file.text()).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const [head, ...body] = lines;
    if (!head || !/device name/i.test(head) || !/device id/i.test(head)) return { error: 'The first row must be the template’s headers: Device Name, Device ID.' };
    if (!body.length) return { error: 'The file has no devices under the headers.' };
    const rows = body.map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
    const bad = rows.findIndex(([name, id]) => !name || !id || !ID_PATTERN.test(name) || !ID_PATTERN.test(id));
    if (bad >= 0) return { error: `Row ${bad + 2} needs a name and an ID made of letters, numbers, - and _.` };
    return { rows: rows.map(([name, deviceId]) => ({ name: name.toUpperCase(), deviceId })) };
}

/* Add device, as the product draws it: Single or Bulk addition, picked with a
   horizontal RadioGroup. Single is a two-field form (P1, actions in
   ModalFooter, validated on submit); Bulk is a template, a file, then a
   review step before anything is added. */
function AddDeviceDialog({ onAdd, onClose }: { onAdd: (devices: NewDevice[]) => void; onClose: () => void }) {
    const formId = useId();
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [name, setName] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [errors, setErrors] = useState<{ name?: string; deviceId?: string }>({});
    const [files, setFiles] = useState<DsFile[]>([]);
    const [fileError, setFileError] = useState<string>();
    const [review, setReview] = useState<NewDevice[] | null>(null);
    const [isReading, setIsReading] = useState(false);

    /* P1 R11–R12: one validation, run on submit; each field names its problem. */
    const submitSingle = (e: FormEvent) => {
        e.preventDefault();
        const next: typeof errors = {};
        if (!name.trim()) next.name = 'Enter a device name.';
        else if (!ID_PATTERN.test(name.trim())) next.name = 'Use letters, numbers, - and _ only.';
        if (!deviceId.trim()) next.deviceId = 'Enter the device ID.';
        else if (!ID_PATTERN.test(deviceId.trim())) next.deviceId = 'Use letters, numbers, - and _ only.';
        setErrors(next);
        if (next.name || next.deviceId) return;
        onAdd([{ name: name.trim().toUpperCase(), deviceId: deviceId.trim() }]);
        onClose();
    };
    /* Next: read the file — isLoading while it is read (S3 step 2). */
    const next = async () => {
        if (!files[0]) return setFileError('Choose the filled-in template to upload.');
        setIsReading(true);
        const result = await readSheet(files[0]);
        setIsReading(false);
        if ('error' in result) return setFileError(result.error);
        setReview(result.rows);
    };

    return (
        <Modal isOpen onDismiss={onClose} size="md" accessibilityLabel="Add new device">
            <ModalHeader title="Add new device" subtitle={review ? `${review.length} ${review.length === 1 ? 'device' : 'devices'} found in ${files[0]?.name}` : undefined} />
            <ModalBody>
                <div className="dv-add">
                    {!review && (
                        <RadioGroup label="How to add" orientation="horizontal" value={mode} onChange={({ value }) => setMode(value as 'single' | 'bulk')}>
                            <Radio value="single">Single addition</Radio>
                            <Radio value="bulk">Bulk addition</Radio>
                        </RadioGroup>
                    )}

                    {mode === 'single' && (
                        <form id={formId} className="dv-add" onSubmit={submitSingle} noValidate>
                            <TextInput
                                label="Device name"
                                necessityIndicator="required"
                                placeholder="e.g. JSWREM_T4"
                                value={name}
                                onChange={({ value }) => {
                                    setName(value ?? '');
                                    setErrors((x) => ({ ...x, name: undefined }));
                                }}
                                validationState={errors.name ? 'error' : 'none'}
                                errorText={errors.name}
                            />
                            <TextInput
                                label="Device ID"
                                necessityIndicator="required"
                                placeholder="e.g. JSW-EM-0004"
                                helpText="The ID printed on the device or set on its gateway."
                                value={deviceId}
                                onChange={({ value }) => {
                                    setDeviceId(value ?? '');
                                    setErrors((x) => ({ ...x, deviceId: undefined }));
                                }}
                                validationState={errors.deviceId ? 'error' : 'none'}
                                errorText={errors.deviceId}
                            />
                        </form>
                    )}

                    {mode === 'bulk' && !review && (
                        <>
                            <div className="dv-template">
                                <FileThumbnail type="csv" />
                                <div className="dv-template__text">
                                    <span className="BodyMediumMedium">{TEMPLATE_NAME}</span>
                                    <span className="BodySmallRegular dv-muted">Start by downloading the template, then fill in one device per row.</span>
                                </div>
                                <Button variant="secondary" tone="neutral" size="sm" label="Download template" leadingIcon={<Download size={14} />} onClick={downloadTemplate} />
                            </div>
                            <FileUpload
                                label="Filled-in template"
                                accept=".csv"
                                uploadType="single"
                                files={files}
                                onChange={({ files: next }) => {
                                    setFiles(next);
                                    setFileError(undefined);
                                }}
                                helpText="Upload the template as a CSV file."
                                validationState={fileError ? 'error' : 'none'}
                                errorText={fileError}
                            />
                        </>
                    )}

                    {review && (
                        <Table<NewDevice & { id: string }>
                            accessibilityLabel="Devices to add"
                            data={review.map((r, i) => ({ ...r, id: `${i}` }))}
                            columns={[
                                { key: 'name', header: 'Device name', emphasis: 'normal', isRowHeader: true },
                                { key: 'deviceId', header: 'Device ID' },
                            ]}
                            getRowId={(r) => r.id}
                            maxHeight={240}
                        />
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                {review ? (
                    <>
                        <Button variant="primary" tone="neutral" label="Back" onClick={() => setReview(null)} />
                        <Button
                            label={`Add ${review.length} ${review.length === 1 ? 'device' : 'devices'}`}
                            onClick={() => {
                                onAdd(review);
                                onClose();
                            }}
                        />
                    </>
                ) : (
                    <>
                        <Button variant="primary" tone="neutral" label="Cancel" onClick={onClose} />
                        {mode === 'single' ? <Button type="submit" form={formId} label="Add" /> : <Button label="Next" isLoading={isReading} onClick={next} />}
                    </>
                )}
            </ModalFooter>
        </Modal>
    );
}

const FILTERS = { hidden: 'show:hidden', favourites: 'show:favourites', asc: 'sort:asc', desc: 'sort:desc' } as const;

export function DevicesPage() {
    const { show } = useToast();
    const [devices, setDevices] = useState(DEVICES);
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<string[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [configuring, setConfiguring] = useState<Device | null>(null);
    const [deleting, setDeleting] = useState<Device[] | null>(null);
    /* Edit mode: cards are picked for a bulk hide or delete; Add device waits until it ends. */
    const [isEditing, setIsEditing] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const endEditing = () => {
        setIsEditing(false);
        setSelected([]);
    };
    const toggle = (id: string) => setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
    const areas = useMemo(() => [...new Set(devices.map((x) => x.area))], [devices]);

    /* The two sorts are one choice inside a multi-select menu: picking one drops the other. */
    const changeFilters = (next: string[]) => {
        const sorts = next.filter((v) => v.startsWith('sort:'));
        setFilters(sorts.length > 1 ? next.filter((v) => !v.startsWith('sort:') || !filters.includes(v)) : next);
    };

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const showHidden = filters.includes(FILTERS.hidden);
        const favouritesOnly = filters.includes(FILTERS.favourites);
        const order = filters.includes(FILTERS.asc) ? 1 : filters.includes(FILTERS.desc) ? -1 : 0;
        const match = devices
            .filter((x) => !q || `${x.name} ${x.type}`.toLowerCase().includes(q))
            /* Hidden devices is its own view: on, only hidden cards; off, none of them. */
            .filter((x) => (showHidden ? x.isHidden : !x.isHidden))
            .filter((x) => !favouritesOnly || x.isFavourite)
            .sort((a, b) => order * a.name.localeCompare(b.name));
        /* A favourite moves to the Favourites section at the top. */
        return [
            { key: 'favourites', title: 'Favourites', rows: match.filter((x) => x.isFavourite) },
            ...areas.map((area) => ({ key: area, title: area, rows: match.filter((x) => !x.isFavourite && x.area === area) })),
        ].filter((g) => g.rows.length);
    }, [devices, query, filters, areas]);

    const update = (ids: string[], patch: Partial<Device>) => setDevices((xs) => xs.map((x) => (ids.includes(x.id) ? { ...x, ...patch } : x)));
    /* The card moves into or out of Favourites in front of the reader — no toast (S3 step 4). */
    const toggleFavourite = (dv: Device) => update([dv.id], { isFavourite: !dv.isFavourite });
    /* Hiding takes the card off the page, so a toast says where it went (S3 step 3). */
    const hide = (list: Device[], isHidden: boolean) => {
        update(list.map((x) => x.id), { isHidden });
        const what = list.length === 1 ? list[0].name : `${list.length} devices`;
        /* Either way the card leaves the view it was in, so a toast says where it went (S3 step 3). */
        show({
            color: 'Positive',
            content: isHidden ? `${what} hidden. Turn on “Hidden devices” in Filter to see ${list.length === 1 ? 'it' : 'them'}.` : `${what} ${list.length === 1 ? 'is' : 'are'} visible again.`,
        });
    };
    /* Delete: confirm first, then a toast — the card just disappears (S3). */
    const remove = () => {
        if (!deleting) return;
        const ids = deleting.map((x) => x.id);
        setDevices((xs) => xs.filter((x) => !ids.includes(x.id)));
        show({ color: 'Positive', content: deleting.length === 1 ? `${deleting[0].name} deleted.` : `${deleting.length} devices deleted.` });
        setDeleting(null);
        endEditing();
    };
    const picked = devices.filter((x) => selected.includes(x.id));
    const inHiddenView = filters.includes(FILTERS.hidden);
    const pickedLabel = selected.length ? `${selected.length} selected ${selected.length === 1 ? 'device' : 'devices'}` : 'selected devices';

    return (
        <div className="dv">
            <div className="dv-toolbar">
                <div className="dv-toolbar__search">
                    <SearchInput accessibilityLabel="Search devices" placeholder="Search devices…" value={query} onChange={({ value }) => setQuery(value ?? '')} />
                </div>
                {/* Active filters show as a dot on the button's corner. Indicator never
                    goes INSIDE a Button (Indicator guard), so it sits beside it in this
                    wrapper and is placed on the corner — corner layout is ours. */}
                <span className="dv-filter">
                    <DropdownMenu selectionType="multiple" value={filters} onChange={({ values }) => changeFilters(values)}>
                        <DropdownMenuTrigger>
                            <Button variant="secondary" tone="neutral" label="Filter" leadingIcon={<ListFilter size={16} />} />
                        </DropdownMenuTrigger>
                        <DropdownMenuOverlay>
                            {/* No header: the list names the menu itself. */}
                            <ActionList accessibilityLabel="Filter devices">
                                <ActionListSection title="Show">
                                    <ActionListItem value={FILTERS.hidden} title="Hidden devices" leading={<ActionListItemIcon icon={EyeOff} />} />
                                    <ActionListItem value={FILTERS.favourites} title="Favourites only" leading={<ActionListItemIcon icon={Star} />} />
                                </ActionListSection>
                                <ActionListSection title="Sort by name">
                                    <ActionListItem value={FILTERS.asc} title="A to Z" />
                                    <ActionListItem value={FILTERS.desc} title="Z to A" />
                                </ActionListSection>
                            </ActionList>
                            <DropdownMenuFooter actions={{ secondary: { text: 'Clear all', onClick: () => setFilters([]) } }} />
                        </DropdownMenuOverlay>
                    </DropdownMenu>
                    {filters.length > 0 && (
                        <span className="dv-filter__dot">
                            <Indicator color="Information" accessibilityLabel={`${filters.length} ${filters.length === 1 ? 'filter' : 'filters'} on`} />
                        </span>
                    )}
                </span>
                {isEditing ? (
                    <>
                        {/* A disabled trigger shows no Tooltip (Tooltip guard), so these two
                            explain themselves only once something is selected. */}
                        {/* In the hidden view every card is already hidden, so the button unhides. */}
                        <Tooltip content={inHiddenView ? 'Unhide selected devices' : 'Hide selected devices'}>
                            <Button
                                variant="secondary"
                                tone="neutral"
                                iconOnly
                                aria-label={`${inHiddenView ? 'Unhide' : 'Hide'} ${pickedLabel}`}
                                isDisabled={!selected.length}
                                onClick={() => {
                                    hide(picked, !inHiddenView);
                                    endEditing();
                                }}
                            >
                                {inHiddenView ? <Eye size={16} /> : <EyeOff size={16} />}
                            </Button>
                        </Tooltip>
                        <Tooltip content="Delete selected devices">
                            <Button tone="negative" iconOnly aria-label={`Delete ${pickedLabel}`} isDisabled={!selected.length} onClick={() => setDeleting(picked)}>
                                <Trash size={16} />
                            </Button>
                        </Tooltip>
                        <Button variant="primary" tone="neutral" label="Cancel" onClick={endEditing} />
                    </>
                ) : (
                    <Tooltip content="Edit devices">
                        <Button variant="secondary" tone="neutral" iconOnly aria-label="Edit devices" onClick={() => setIsEditing(true)}>
                            <Pencil size={16} />
                        </Button>
                    </Tooltip>
                )}
                {/* Last in the row, so it sits in the right corner: the search grows to fill the space. */}
                <Button label="Add device" leadingIcon={<Plus size={16} />} isDisabled={isEditing} onClick={() => setIsAdding(true)} />
            </div>

            {groups.length === 0 ? (
                <EmptyState
                    size="Medium"
                    title={inHiddenView && !query.trim() ? 'No hidden devices' : 'No devices match'}
                    description={query.trim() ? `Nothing is called or typed “${query.trim()}”.` : inHiddenView ? 'Devices you hide from a card’s menu are listed here.' : 'Change or clear the filters to see devices.'}
                />
            ) : (
                groups.map(({ key, title, rows }) => (
                    <section key={key} className="dv-group" aria-labelledby={`dv-${key}`}>
                        <header>
                            <h2 id={`dv-${key}`} className="HeadingMediumSemibold dv-flush">
                                {title}
                            </h2>
                            <span className="BodySmallSemibold dv-muted dv-caps">Devices</span>
                        </header>
                        <div className="dv-grid">
                            {rows.map((dv) => (
                                <DeviceCard
                                    key={dv.id}
                                    device={dv}
                                    onFavourite={() => toggleFavourite(dv)}
                                    onHide={() => hide([dv], !dv.isHidden)}
                                    onConfig={(what) => (what === 'Device config' ? setConfiguring(dv) : show({ color: 'Neutral', content: `${what} isn't built in this demo.` }))}
                                    onDelete={() => setDeleting([dv])}
                                    selection={isEditing ? { isSelected: selected.includes(dv.id), onToggle: () => toggle(dv.id) } : undefined}
                                />
                            ))}
                        </div>
                    </section>
                ))
            )}

            {isAdding && (
                <AddDeviceDialog
                    onClose={() => setIsAdding(false)}
                    onAdd={(list) => {
                        /* A new device has no type yet, so it lands in Others as a custom section. */
                        setDevices((xs) => [...xs, ...list.map((x, i) => ({ id: `d${Date.now()}-${i}`, name: x.name, deviceId: x.deviceId, type: 'Custom Sections', area: 'Others', addedOn: new Date(), isFavourite: false }))]);
                        show({ color: 'Positive', content: list.length === 1 ? `${list[0].name} added.` : `${list.length} devices added.` });
                    }}
                />
            )}

            {configuring && (
                <DeviceConfigDialog
                    initial={configuring.config ?? defaultConfig(configuring)}
                    onClose={() => setConfiguring(null)}
                    onSave={(config) => update([configuring.id], { config, name: config.name, deviceId: config.deviceId })}
                />
            )}

            <Modal isOpen={!!deleting} onDismiss={() => setDeleting(null)} size="sm" accessibilityLabel="Delete device">
                <ModalHeader title={deleting?.length === 1 ? `Delete ${deleting[0].name}?` : `Delete ${deleting?.length ?? 0} devices?`} />
                <ModalBody>
                    <p className="BodyMediumRegular dv-flush">
                        {deleting?.length === 1 ? 'The device and its history are' : 'These devices and their history are'} removed from this workspace. This can't be undone.
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button variant="primary" tone="neutral" label="Cancel" onClick={() => setDeleting(null)} />
                    <Button tone="negative" label="Delete" onClick={remove} />
                </ModalFooter>
            </Modal>
        </div>
    );
}
