/* Analytics › Reports — a sample report form, laid out by FormGroup (P1):
   a header, two sections (fields 16 apart, sections 32 apart), one set of
   actions. The Recipients field carries a trailing action icon: an
   IconButton in TextInput's `trailing` slot that adds the typed address.
   Repeat every carries a trailing dropdown: a DropdownMenu around a
   TextInputDropdownButton in the same slot (TextInput R24). */
import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { ActionList, ActionListItem, Button, DropdownMenu, DropdownMenuOverlay, DropdownMenuTrigger, IconButton, SelectInput, Tag, TextArea, TextInput, TextInputDropdownButton, useToast } from '@faclon-labs/fds';
import './reports.css';

const TYPES = ['Energy consumption', 'Demand and tariff', 'Power quality', 'Asset health'];
const PLANTS = ['Pune', 'Chennai', 'Mumbai', 'Delhi'];
const PERIODS = ['Last 7 days', 'Last 30 days', 'This month', 'Last month'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNITS = [
    { value: 'day', one: 'day', many: 'days' },
    { value: 'week', one: 'week', many: 'weeks' },
    { value: 'month', one: 'month', many: 'months' },
] as const;
type Unit = (typeof UNITS)[number]['value'];
const unitLabel = (unit: Unit, n: number) => {
    const u = UNITS.find((x) => x.value === unit)!;
    return n === 1 ? u.one : u.many;
};

function Select({ label, value, options, onChange, errorText, isRequired }: { label: string; value?: string; options: string[]; onChange: (v: string) => void; errorText?: string; isRequired?: boolean }) {
    return (
        <DropdownMenu selectionType="single" value={value ? [value] : []} onChange={({ values }) => values[0] && onChange(values[0])}>
            <SelectInput label={label} necessityIndicator={isRequired ? 'required' : 'none'} validationState={errorText ? 'error' : 'none'} errorText={errorText} />
            <DropdownMenuOverlay>
                <ActionList accessibilityLabel={label}>
                    {options.map((o) => (
                        <ActionListItem key={o} value={o} title={o} />
                    ))}
                </ActionList>
            </DropdownMenuOverlay>
        </DropdownMenu>
    );
}

type Errors = Partial<Record<'name' | 'type' | 'recipient' | 'recipients' | 'every', string>>;

export function ReportsPage() {
    const { show } = useToast();
    const [name, setName] = useState('');
    const [type, setType] = useState<string>();
    const [plant, setPlant] = useState(PLANTS[0]);
    const [period, setPeriod] = useState(PERIODS[0]);
    const [recipient, setRecipient] = useState('');
    const [recipients, setRecipients] = useState<string[]>([]);
    const [every, setEvery] = useState('1');
    const [unit, setUnit] = useState<Unit>('week');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<Errors>({});
    const [isSending, setIsSending] = useState(false);
    const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: undefined }));

    /* The trailing action: add the typed address to the list below the field. */
    const addRecipient = () => {
        const value = recipient.trim().toLowerCase();
        if (!value) return setErrors((e) => ({ ...e, recipient: 'Type an email, then add it.' }));
        if (!EMAIL.test(value)) return setErrors((e) => ({ ...e, recipient: 'Enter an email like name@company.com.' }));
        if (recipients.includes(value)) return setErrors((e) => ({ ...e, recipient: 'That address is already on the list.' }));
        setRecipients((r) => [...r, value]);
        setRecipient('');
        clear('recipient');
        clear('recipients');
    };

    const reset = () => {
        setName('');
        setType(undefined);
        setPlant(PLANTS[0]);
        setPeriod(PERIODS[0]);
        setRecipient('');
        setRecipients([]);
        setEvery('1');
        setUnit('week');
        setNotes('');
        setErrors({});
    };

    /* P1 R11–R12, R18: validate on submit, never disable the submit; isLoading
       while it runs, then a toast — the report is sent, nothing shows here (S3). */
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const next: Errors = {};
        if (!name.trim()) next.name = 'Give the report a name.';
        if (!type) next.type = 'Pick a report type.';
        if (!recipients.length) next.recipients = 'Add at least one recipient.';
        const n = Number(every);
        if (!Number.isInteger(n) || n < 1 || n > 99) next.every = 'Enter a whole number from 1 to 99.';
        setErrors(next);
        if (Object.keys(next).length) return;
        setIsSending(true);
        window.setTimeout(() => {
            setIsSending(false);
            const n = Number(every);
            show({ color: 'Positive', content: `“${name.trim()}” sent to ${recipients.length} ${recipients.length === 1 ? 'person' : 'people'}, then every ${n === 1 ? '' : `${n} `}${unitLabel(unit, n)}.` });
            reset();
        }, 1200);
    };

    return (
        <form className="rp" onSubmit={submit} noValidate>
            <header>
                <h1 className="HeadingLargeSemibold rp-flush">Generate a report</h1>
                <p className="BodyMediumRegular rp-muted rp-flush">Pick what goes in it and who receives it. It is emailed as a PDF.</p>
            </header>

            <section className="rp-section" aria-labelledby="rp-details">
                <div>
                    <h2 id="rp-details" className="HeadingMediumSemibold rp-flush">Report details</h2>
                    <p className="BodyMediumRegular rp-muted rp-flush">What the report covers</p>
                </div>
                <TextInput
                    label="Report name"
                    necessityIndicator="required"
                    placeholder="e.g. Pune weekly energy review"
                    value={name}
                    onChange={({ value }) => {
                        setName(value ?? '');
                        clear('name');
                    }}
                    validationState={errors.name ? 'error' : 'none'}
                    errorText={errors.name}
                />
                <Select
                    label="Report type"
                    isRequired
                    value={type}
                    options={TYPES}
                    onChange={(v) => {
                        setType(v);
                        clear('type');
                    }}
                    errorText={errors.type}
                />
                {/* P1 R10: two short related fields share a row. */}
                <div className="rp-row">
                    <Select label="Plant" value={plant} options={PLANTS} onChange={setPlant} />
                    <Select label="Period" value={period} options={PERIODS} onChange={setPeriod} />
                </div>
            </section>

            <section className="rp-section" aria-labelledby="rp-delivery">
                <div>
                    <h2 id="rp-delivery" className="HeadingMediumSemibold rp-flush">Delivery</h2>
                    <p className="BodyMediumRegular rp-muted rp-flush">Who gets it, and anything they should know</p>
                </div>
                <div className="rp-recipients">
                    <TextInput
                        label="Recipients"
                        necessityIndicator="required"
                        type="email"
                        placeholder="name@company.com"
                        helpText={errors.recipient || errors.recipients ? undefined : 'Type an address, then press Enter or the + button.'}
                        value={recipient}
                        onChange={({ value }) => {
                            setRecipient(value ?? '');
                            clear('recipient');
                        }}
                        onKeyDown={({ key, event }) => {
                            if (key === 'Enter') {
                                event.preventDefault();
                                addRecipient();
                            }
                        }}
                        trailing={<IconButton icon={Plus} size="Medium" isHighlighted accessibilityLabel="Add recipient" onClick={addRecipient} />}
                        validationState={errors.recipient || errors.recipients ? 'error' : 'none'}
                        errorText={errors.recipient ?? errors.recipients}
                    />
                    {recipients.length > 0 && (
                        <div className="rp-tags" aria-label="Recipients added">
                            {recipients.map((r) => (
                                <Tag key={r} onDismiss={() => setRecipients((xs) => xs.filter((x) => x !== r))}>
                                    {r}
                                </Tag>
                            ))}
                        </div>
                    )}
                </div>
                <TextInput
                    label="Repeat every"
                    type="number"
                    necessityIndicator="required"
                    helpText={errors.every ? undefined : 'The first report goes now; the next ones follow on this schedule.'}
                    value={every}
                    onChange={({ value }) => {
                        setEvery(value ?? '');
                        clear('every');
                    }}
                    trailing={
                        <DropdownMenu selectionType="single" value={[unit]} onChange={({ values }) => values[0] && setUnit(values[0] as Unit)}>
                            <DropdownMenuTrigger>
                                <TextInputDropdownButton value={unitLabel(unit, Number(every) || 1)} />
                            </DropdownMenuTrigger>
                            <DropdownMenuOverlay>
                                <ActionList accessibilityLabel="Repeat unit">
                                    {UNITS.map((u) => (
                                        <ActionListItem key={u.value} value={u.value} title={u.many[0].toUpperCase() + u.many.slice(1)} />
                                    ))}
                                </ActionList>
                            </DropdownMenuOverlay>
                        </DropdownMenu>
                    }
                    validationState={errors.every ? 'error' : 'none'}
                    errorText={errors.every}
                />
                <TextArea label="Note" placeholder="Optional — a line for the people receiving it" numberOfLines={3} value={notes} onChange={({ value }) => setNotes(value ?? '')} />
            </section>

            {/* P1 R16: Discard (primary neutral) then the submit, right-aligned, 12 apart. */}
            <div className="rp-actions">
                <Button variant="primary" tone="neutral" label="Discard" type="button" onClick={reset} />
                <Button label="Generate report" type="submit" isLoading={isSending} />
            </div>
        </form>
    );
}
