/* Patterns › Device — Edit device: a three-step wizard in a Modal. A
   horizontal Stepper on top (Stepper R7: a short linear form wizard), one
   step's fields at a time, Back on the left and Cancel / Next on the right.
   Each step is validated when the reader moves on (P1 R11–R12); Save
   changes on the last step writes everything back to the card. */
import { useMemo, useState } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import {
    Accordion,
    AccordionItem,
    AccordionItemBody,
    AccordionItemHeader,
    ActionList,
    ActionListItem,
    ActionListSection,
    Button,
    DropdownMenu,
    DropdownMenuFooter,
    DropdownMenuOverlay,
    DropdownMenuTrigger,
    EmptyState,
    LinkButton,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Pagination,
    SearchInput,
    SelectInput,
    Stepper,
    StepperItem,
    Tag,
    TextInput,
    Tooltip,
    useToast,
} from '@faclon-labs/fds';

export interface Sensor { id: string; name: string; globalAlias: string; unit: string; m: string; c: string; min: string; max: string; t: string; tags: string }
export interface DeviceConfig { deviceId: string; type: string; name: string; timeout: string; tags: string[]; sensors: Sensor[]; latitude: string; longitude: string }

const UNITS = ['V', 'A', 'kW', 'kWh', 'kVAr', 'Hz', 'PF', '%', '°C'];
const SENSOR_NAMES: [string, string][] = [
    ['Line to Neutral Voltage', 'V'], ['Voltage Phase 1 to N', 'V'], ['Voltage Phase 2 to N', 'V'], ['Voltage Phase 3 to N', 'V'],
    ['Line to Line Average Voltage', 'V'], ['Voltage Phase 1 to P', 'V'], ['Voltage Phase 2 to P', 'V'], ['Voltage Phase 3 to P', 'V'],
    ['Current Average', 'A'], ['Current Phase 1', 'A'], ['Current Phase 2', 'A'], ['Current Phase 3', 'A'],
    ['Active Power Total', 'kW'], ['Reactive Power Total', 'kVAr'], ['Power Factor Average', 'PF'], ['Frequency', 'Hz'],
    ['Active Energy Import', 'kWh'], ['Active Energy Export', 'kWh'], ['THD Voltage', '%'], ['Panel Temperature', '°C'],
];
const PAGE_SIZE = 10;

/** A device's configuration as the dialog first shows it. */
export function defaultConfig(d: { name: string; type: string; area: string; deviceId?: string }): DeviceConfig {
    return {
        deviceId: d.deviceId ?? d.name.toLowerCase().replace(/_/g, '-'),
        type: d.type,
        name: d.name,
        timeout: '7200',
        tags: [`sec:${d.area}`, d.name],
        sensors: SENSOR_NAMES.map(([name, unit], i) => ({ id: `D${i + 1}`, name, globalAlias: name, unit, m: '1', c: '0', min: '-10000000000', max: '10000000000', t: '1', tags: '' })),
        latitude: '30.4217608779755',
        longitude: '76.6999320576969',
    };
}

const STEPS = ['Device details', 'Sensors’ config', 'Device location'] as const;
const NUMBER = /^-?\d+(\.\d+)?$/;
type SensorErrors = Partial<Record<keyof Sensor, string>>;

function UnitSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <DropdownMenu selectionType="single" value={[value]} onChange={({ values }) => values[0] && onChange(values[0])}>
            <SelectInput label="Unit" />
            <DropdownMenuOverlay>
                <ActionList accessibilityLabel="Unit">
                    {UNITS.map((u) => (
                        <ActionListItem key={u} value={u} title={u} />
                    ))}
                </ActionList>
            </DropdownMenuOverlay>
        </DropdownMenu>
    );
}

function validateSensor(s: Sensor): SensorErrors {
    const e: SensorErrors = {};
    if (!s.globalAlias.trim()) e.globalAlias = 'Enter a global alias.';
    for (const k of ['m', 'c', 'min', 'max', 't'] as const) if (!NUMBER.test(s[k].trim())) e[k] = 'Enter a number.';
    if (!e.min && !e.max && Number(s.min) >= Number(s.max)) e.max = 'Max must be greater than min.';
    if (!e.t && Number(s.t) <= 0) e.t = 'Enter a number above 0.';
    return e;
}

export function DeviceConfigDialog({ initial, onSave, onClose }: { initial: DeviceConfig; onSave: (c: DeviceConfig) => void; onClose: () => void }) {
    const { show } = useToast();
    const [step, setStep] = useState(0);
    const [cfg, setCfg] = useState(initial);
    const set = <K extends keyof DeviceConfig>(k: K, v: DeviceConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

    /* Step 1 */
    const [tagDraft, setTagDraft] = useState('');
    const [detailErrors, setDetailErrors] = useState<{ name?: string; timeout?: string; tag?: string }>({});
    const addTag = () => {
        const t = tagDraft.trim();
        if (!t) return setDetailErrors((e) => ({ ...e, tag: 'Type a tag, then add it.' }));
        if (cfg.tags.includes(t)) return setDetailErrors((e) => ({ ...e, tag: 'That tag is already on the device.' }));
        set('tags', [...cfg.tags, t]);
        setTagDraft('');
        setDetailErrors((e) => ({ ...e, tag: undefined }));
    };

    /* Step 2 */
    const [query, setQuery] = useState('');
    const [units, setUnits] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState<string | null>(null);
    const [sensorErrors, setSensorErrors] = useState<Record<string, SensorErrors>>({});
    const matched = useMemo(() => {
        const q = query.trim().toLowerCase();
        return cfg.sensors.filter((s) => (!q || `${s.name} ${s.id} ${s.globalAlias}`.toLowerCase().includes(q)) && (!units.length || units.includes(s.unit)));
    }, [cfg.sensors, query, units]);
    const pageCount = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
    const rows = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const setSensor = (id: string, patch: Partial<Sensor>) => {
        setCfg((c) => ({ ...c, sensors: c.sensors.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
        setSensorErrors((all) => ({ ...all, [id]: Object.fromEntries(Object.entries(all[id] ?? {}).filter(([k]) => !(k in patch))) }));
    };

    /* Step 3 */
    const [locErrors, setLocErrors] = useState<{ latitude?: string; longitude?: string }>({});

    /* Moving on validates the step being left; a failure stays on it. */
    const validate = (i: number) => {
        if (i === 0) {
            const e: typeof detailErrors = {};
            if (!cfg.name.trim()) e.name = 'Enter a device name.';
            else if (!/^[A-Z0-9_-]+$/i.test(cfg.name.trim())) e.name = 'Use letters, numbers, - and _ only.';
            if (!/^\d+$/.test(cfg.timeout.trim()) || Number(cfg.timeout) < 60) e.timeout = 'Enter a whole number of seconds, 60 or more.';
            setDetailErrors(e);
            return !e.name && !e.timeout;
        }
        if (i === 1) {
            const all: Record<string, SensorErrors> = {};
            for (const s of cfg.sensors) {
                const e = validateSensor(s);
                if (Object.keys(e).length) all[s.id] = e;
            }
            setSensorErrors(all);
            const first = cfg.sensors.find((s) => all[s.id]);
            if (first) {
                /* Open the first sensor that needs fixing, on its page. */
                setQuery('');
                setUnits([]);
                setPage(Math.floor(cfg.sensors.indexOf(first) / PAGE_SIZE) + 1);
                setOpenId(first.id);
                return false;
            }
            return true;
        }
        const e: typeof locErrors = {};
        const lat = Number(cfg.latitude);
        const lon = Number(cfg.longitude);
        if (!NUMBER.test(cfg.latitude.trim())) e.latitude = 'Enter the latitude.';
        else if (lat < -90 || lat > 90) e.latitude = 'Latitude runs from -90 to 90.';
        if (!NUMBER.test(cfg.longitude.trim())) e.longitude = 'Enter the longitude.';
        else if (lon < -180 || lon > 180) e.longitude = 'Longitude runs from -180 to 180.';
        setLocErrors(e);
        return !e.latitude && !e.longitude;
    };
    const next = () => {
        if (!validate(step)) return;
        if (step < STEPS.length - 1) return setStep(step + 1);
        onSave({ ...cfg, name: cfg.name.trim().toUpperCase() });
        show({ color: 'Positive', content: `${cfg.name.trim().toUpperCase()} updated.` });
        onClose();
    };

    const visibleRows = rows;
    const expandedIndex = visibleRows.findIndex((s) => s.id === openId);

    return (
        <Modal isOpen onDismiss={onClose} size="lg" accessibilityLabel={`Edit device ${initial.name}`}>
            <ModalHeader title={`Edit device — ${initial.name}`} subtitle="Update identity, sensors and location for this device." />
            <ModalBody>
                <div className="dv-edit">
                    {/* Stepper R12–R18: done steps Positive with progress full, the current one Brand + selected. */}
                    <Stepper orientation="horizontal">
                        {STEPS.map((title, i) => (
                            <StepperItem
                                key={title}
                                title={title}
                                state={i < step ? 'Positive' : i === step ? 'Brand' : 'Neutral'}
                                isSelected={i === step}
                                stepProgress={i < step ? 'full' : i === step ? 'start' : 'none'}
                            />
                        ))}
                    </Stepper>

                    {step === 0 && (
                        <div className="dv-edit__form">
                            <div className="dv-edit__row">
                                <TextInput label="Device ID" value={cfg.deviceId} isDisabled />
                                <TextInput label="Device type" value={cfg.type} isDisabled />
                            </div>
                            <TextInput
                                label="Device name"
                                necessityIndicator="required"
                                value={cfg.name}
                                onChange={({ value }) => {
                                    set('name', value ?? '');
                                    setDetailErrors((e) => ({ ...e, name: undefined }));
                                }}
                                validationState={detailErrors.name ? 'error' : 'none'}
                                errorText={detailErrors.name}
                            />
                            <TextInput
                                label="Breakdown timeout (seconds)"
                                type="number"
                                value={cfg.timeout}
                                helpText={detailErrors.timeout ? undefined : 'How long before this device is marked offline.'}
                                onChange={({ value }) => {
                                    set('timeout', value ?? '');
                                    setDetailErrors((e) => ({ ...e, timeout: undefined }));
                                }}
                                validationState={detailErrors.timeout ? 'error' : 'none'}
                                errorText={detailErrors.timeout}
                            />
                            <div className="dv-edit__tags">
                                <span className="BodyMediumMedium">Tags</span>
                                {cfg.tags.length > 0 && (
                                    <div className="dv-edit__tag-list">
                                        {cfg.tags.map((t) => (
                                            <Tag key={t} onDismiss={() => set('tags', cfg.tags.filter((x) => x !== t))}>
                                                {t}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                                <div className="dv-edit__tag-add">
                                    <TextInput
                                        accessibilityLabel="Add a tag"
                                        placeholder="Add a tag"
                                        value={tagDraft}
                                        onChange={({ value }) => {
                                            setTagDraft(value ?? '');
                                            setDetailErrors((e) => ({ ...e, tag: undefined }));
                                        }}
                                        onKeyDown={({ key, event }) => {
                                            if (key === 'Enter') {
                                                event.preventDefault();
                                                addTag();
                                            }
                                        }}
                                        validationState={detailErrors.tag ? 'error' : 'none'}
                                        errorText={detailErrors.tag}
                                    />
                                    <Button variant="secondary" tone="neutral" label="Add" leadingIcon={<Plus size={16} />} onClick={addTag} />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="dv-edit__form">
                            <div className="dv-edit__search">
                                <div className="dv-edit__search-field">
                                    <SearchInput
                                        accessibilityLabel="Search sensors"
                                        placeholder="Search sensors…"
                                        value={query}
                                        onChange={({ value }) => {
                                            setQuery(value ?? '');
                                            setPage(1);
                                        }}
                                    />
                                </div>
                                <DropdownMenu
                                    selectionType="multiple"
                                    value={units}
                                    onChange={({ values }) => {
                                        setUnits(values);
                                        setPage(1);
                                    }}
                                >
                                    <Tooltip content="Filter sensors">
                                        <DropdownMenuTrigger>
                                            <Button variant="secondary" tone="neutral" iconOnly aria-label={units.length ? `Filter sensors, ${units.length} on` : 'Filter sensors'}>
                                                <SlidersHorizontal size={16} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </Tooltip>
                                    <DropdownMenuOverlay>
                                        <ActionList accessibilityLabel="Filter sensors">
                                            <ActionListSection title="Unit">
                                                {[...new Set(cfg.sensors.map((s) => s.unit))].map((u) => (
                                                    <ActionListItem key={u} value={u} title={u} />
                                                ))}
                                            </ActionListSection>
                                        </ActionList>
                                        <DropdownMenuFooter actions={{ secondary: { text: 'Clear all', onClick: () => setUnits([]) } }} />
                                    </DropdownMenuOverlay>
                                </DropdownMenu>
                            </div>

                            {visibleRows.length === 0 ? (
                                <EmptyState size="Medium" title="No sensors match" description="Try another name, or clear the unit filter." />
                            ) : (
                                /* Accordion R13: the list filters and pages, so the open
                                   panel is keyed by sensor id, not held as an index. */
                                <Accordion
                                    key={`${page}-${query}-${units.join()}`}
                                    expandedIndex={expandedIndex >= 0 ? expandedIndex : undefined}
                                    onExpandChange={({ expandedIndex: i }) => setOpenId(typeof i === 'number' && i >= 0 ? (visibleRows[i]?.id ?? null) : null)}
                                >
                                    {visibleRows.map((s) => {
                                        const e = sensorErrors[s.id] ?? {};
                                        const field = (k: keyof Sensor) => ({ validationState: e[k] ? ('error' as const) : ('none' as const), errorText: e[k] });
                                        return (
                                            <AccordionItem key={s.id}>
                                                <AccordionItemHeader title={`${s.name} (${s.id})`} trailing={<span className="BodyMediumRegular dv-muted">Edit sensor alias, units &amp; params</span>} />
                                                <AccordionItemBody>
                                                    <div className="dv-edit__form">
                                                        <div className="dv-edit__row">
                                                            <TextInput label="Sensor ID" value={s.id} isDisabled />
                                                            <TextInput label="Sensor alias" value={s.name} isReadOnly />
                                                        </div>
                                                        <div className="dv-edit__row">
                                                            <TextInput label="Global alias" value={s.globalAlias} onChange={({ value }) => setSensor(s.id, { globalAlias: value ?? '' })} {...field('globalAlias')} />
                                                            <UnitSelect value={s.unit} onChange={(v) => setSensor(s.id, { unit: v })} />
                                                        </div>
                                                        <div className="dv-edit__row">
                                                            <TextInput label="m" value={s.m} onChange={({ value }) => setSensor(s.id, { m: value ?? '' })} {...field('m')} />
                                                            <TextInput label="c" value={s.c} onChange={({ value }) => setSensor(s.id, { c: value ?? '' })} {...field('c')} />
                                                        </div>
                                                        <div className="dv-edit__row">
                                                            <TextInput label="min" value={s.min} onChange={({ value }) => setSensor(s.id, { min: value ?? '' })} {...field('min')} />
                                                            <TextInput label="max" value={s.max} onChange={({ value }) => setSensor(s.id, { max: value ?? '' })} {...field('max')} />
                                                        </div>
                                                        <div className="dv-edit__row">
                                                            <TextInput label="t" value={s.t} onChange={({ value }) => setSensor(s.id, { t: value ?? '' })} {...field('t')} />
                                                        </div>
                                                        <TextInput label="Sensor tags" placeholder="Multiple, comma separated" value={s.tags} onChange={({ value }) => setSensor(s.id, { tags: value ?? '' })} />
                                                        <div>
                                                            <LinkButton label="Advanced configurator" onClick={() => show({ color: 'Neutral', content: 'The advanced configurator isn’t built in this demo.' })} />
                                                        </div>
                                                    </div>
                                                </AccordionItemBody>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>
                            )}

                            {matched.length > 0 && (
                                <div className="dv-edit__pages">
                                    <span className="BodySmallRegular dv-muted">
                                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, matched.length)} of {matched.length} sensors
                                    </span>
                                    <Pagination totalPages={pageCount} page={page} onPageChange={({ page: p }) => setPage(p)} accessibilityLabel="Sensor pages" />
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="dv-edit__form">
                            <TextInput
                                label="Latitude"
                                necessityIndicator="required"
                                value={cfg.latitude}
                                onChange={({ value }) => {
                                    set('latitude', value ?? '');
                                    setLocErrors((e) => ({ ...e, latitude: undefined }));
                                }}
                                validationState={locErrors.latitude ? 'error' : 'none'}
                                errorText={locErrors.latitude}
                            />
                            <TextInput
                                label="Longitude"
                                necessityIndicator="required"
                                value={cfg.longitude}
                                onChange={({ value }) => {
                                    set('longitude', value ?? '');
                                    setLocErrors((e) => ({ ...e, longitude: undefined }));
                                }}
                                validationState={locErrors.longitude ? 'error' : 'none'}
                                errorText={locErrors.longitude}
                            />
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <div className="dv-edit__footer">
                    <div>{step > 0 && <Button variant="secondary" tone="neutral" label="Back" onClick={() => setStep(step - 1)} />}</div>
                    <div className="dv-edit__footer-end">
                        <Button variant="primary" tone="neutral" label="Cancel" onClick={onClose} />
                        <Button label={step === STEPS.length - 1 ? 'Save changes' : 'Next'} onClick={next} />
                    </div>
                </div>
            </ModalFooter>
        </Modal>
    );
}
