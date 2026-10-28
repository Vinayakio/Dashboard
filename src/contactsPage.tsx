/* Patterns › Contact — the contact list as one FDS Table: a toolbar with
   search and Add contact, multi-select with a bulk delete, three row actions
   and client pagination. Add and Edit share one FormDialog (P1); deletes are
   confirmed in a Modal, then toasted (S3). A standard page (S2 step 5). */
import { useState } from 'react';
import { Download, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import {
    ActionList,
    ActionListItem,
    Badge,
    Button,
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    DropdownMenu,
    DropdownMenuOverlay,
    EmptyState,
    LinkButton,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    SelectInput,
    Table,
    TextInput,
    useToast,
    type TableColumn,
} from '@faclon-labs/fds';
import { FormDialog } from './agentsPage';
import './contacts.css';

type ContactStatus = 'Active' | 'Lead' | 'Inactive';
interface Contact { id: string; firstName: string; lastName: string; email: string; phone: string; company: string; role: string; status: ContactStatus }

const STATUS_COLOR: Record<ContactStatus, 'Positive' | 'Information' | 'Neutral'> = { Active: 'Positive', Lead: 'Information', Inactive: 'Neutral' };
const STATUSES = Object.keys(STATUS_COLOR) as ContactStatus[];

const SEED: [string, string, string, string, ContactStatus][] = [
    ['Aarav', 'Shah', 'Tata Steel', 'Plant Head', 'Active'],
    ['Priya', 'Nair', 'JSW Energy', 'Energy Manager', 'Active'],
    ['Rohan', 'Das', 'UltraTech Cement', 'Maintenance Lead', 'Lead'],
    ['Kavya', 'Rao', 'Hindalco', 'Procurement', 'Active'],
    ['Arjun', 'Mehta', 'Adani Power', 'Operations Manager', 'Inactive'],
    ['Sneha', 'Patil', 'Asian Paints', 'Sustainability Head', 'Lead'],
    ['Vikram', 'Iyer', 'Reliance Industries', 'Utilities Engineer', 'Active'],
    ['Ananya', 'Gupta', 'Mahindra', 'Plant Engineer', 'Active'],
    ['Rahul', 'Pongde', 'Faclon Labs', 'Solutions Architect', 'Active'],
    ['Hritik', 'Sawant', 'Faclon Labs', 'Field Engineer', 'Active'],
    ['Neha', 'Kulkarni', 'Bajaj Auto', 'Energy Auditor', 'Lead'],
    ['Siddharth', 'Joshi', 'L&T', 'Project Manager', 'Inactive'],
    ['Ishita', 'Verma', 'Dalmia Bharat', 'Quality Head', 'Active'],
    ['Karan', 'Malhotra', 'Godrej', 'Facilities Manager', 'Lead'],
    ['Meera', 'Pillai', 'NTPC', 'Shift Supervisor', 'Active'],
    ['Aditya', 'Singh', 'Vedanta', 'Electrical Lead', 'Inactive'],
    ['Pooja', 'Reddy', 'Dr. Reddy’s', 'EHS Manager', 'Active'],
    ['Nikhil', 'Bansal', 'Ambuja Cements', 'Kiln Engineer', 'Lead'],
    ['Tanvi', 'Desai', 'Tata Power', 'Grid Analyst', 'Active'],
    ['Manish', 'Agarwal', 'Shree Cement', 'Plant Head', 'Active'],
    ['Ritu', 'Sharma', 'Hero MotoCorp', 'Utilities Head', 'Lead'],
    ['Dev', 'Patel', 'Torrent Power', 'Commercial Manager', 'Active'],
];
const CONTACTS: Contact[] = SEED.map(([f, l, company, role, status], i) => ({
    id: `c${i + 1}`,
    firstName: f,
    lastName: l,
    email: `${f}.${l}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`.toLowerCase(),
    phone: `+91 98${String(20000000 + i * 734219).slice(0, 3)} ${String(10000 + i * 3917).slice(0, 5)}`,
    company,
    role,
    status,
}));

const fullName = (c: Pick<Contact, 'firstName' | 'lastName'>) => `${c.firstName} ${c.lastName}`.trim();

/* Table R33: one 'normal' column with isRowHeader (the person), supporting
   columns at the default 'subtle'. */
const columns: TableColumn<Contact>[] = [
    { key: 'firstName', header: 'Name', emphasis: 'normal', isRowHeader: true, isSortable: true, cell: (c) => fullName(c), description: (c) => c.email },
    { key: 'company', header: 'Company', isSortable: true },
    { key: 'role', header: 'Role' },
    { key: 'phone', header: 'Phone' },
    { key: 'status', header: 'Status', isSortable: true, cell: (c) => <Badge label={c.status} color={STATUS_COLOR[c.status]} /> },
];

type Draft = Omit<Contact, 'id'>;
const EMPTY: Draft = { firstName: '', lastName: '', email: '', phone: '', company: '', role: '', status: 'Lead' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ContactDialog({ initial, onSave, onClose }: { initial?: Contact; onSave: (d: Draft) => void; onClose: () => void }) {
    const start: Draft = initial ? { ...initial } : EMPTY;
    const [d, setD] = useState<Draft>(start);
    const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
        setD((x) => ({ ...x, [k]: v }));
        setErrors((e) => ({ ...e, [k]: undefined }));
    };
    /* P1 R11–R12: one validation function, run on submit. */
    const submit = () => {
        const e: typeof errors = {};
        if (!d.firstName.trim()) e.firstName = 'Enter a first name.';
        if (!d.email.trim()) e.email = 'Enter an email.';
        else if (!EMAIL.test(d.email.trim())) e.email = 'Enter an email like name@company.com.';
        if (!d.company.trim()) e.company = 'Enter a company.';
        setErrors(e);
        if (Object.keys(e).length) return false;
        onSave({ ...d, firstName: d.firstName.trim(), lastName: d.lastName.trim(), email: d.email.trim().toLowerCase() });
        return true;
    };
    const field = (k: keyof Draft) => ({ validationState: errors[k] ? ('error' as const) : ('none' as const), errorText: errors[k] });
    return (
        <FormDialog
            title={initial ? `Edit ${fullName(initial)}` : 'Add contact'}
            subtitle={initial ? undefined : 'They show in the list as soon as you save.'}
            submitLabel={initial ? 'Save changes' : 'Add contact'}
            submitIcon={initial ? undefined : <Plus size={16} />}
            isDirty={JSON.stringify(d) !== JSON.stringify(start)}
            onSubmit={submit}
            onClose={onClose}
        >
            {/* P1 R10: two short related fields share a row. */}
            <div className="ct-row">
                <TextInput label="First name" necessityIndicator="required" value={d.firstName} onChange={({ value }) => set('firstName', value ?? '')} {...field('firstName')} />
                <TextInput label="Last name" value={d.lastName} onChange={({ value }) => set('lastName', value ?? '')} />
            </div>
            <TextInput label="Email" type="email" necessityIndicator="required" value={d.email} onChange={({ value }) => set('email', value ?? '')} {...field('email')} />
            <TextInput label="Phone" type="telephone" value={d.phone} onChange={({ value }) => set('phone', value ?? '')} />
            <div className="ct-row">
                <TextInput label="Company" necessityIndicator="required" value={d.company} onChange={({ value }) => set('company', value ?? '')} {...field('company')} />
                <TextInput label="Role" value={d.role} onChange={({ value }) => set('role', value ?? '')} />
            </div>
            <DropdownMenu selectionType="single" value={[d.status]} onChange={({ values }) => values[0] && set('status', values[0] as ContactStatus)}>
                <SelectInput label="Status" />
                <DropdownMenuOverlay>
                    <ActionList accessibilityLabel="Status">
                        {STATUSES.map((s) => (
                            <ActionListItem key={s} value={s} title={s} />
                        ))}
                    </ActionList>
                </DropdownMenuOverlay>
            </DropdownMenu>
        </FormDialog>
    );
}

/* The selected rows as a CSV sheet — it opens in Excel, Numbers or Sheets. */
function downloadSheet(rows: Contact[]) {
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [['Name', 'Email', 'Phone', 'Company', 'Role', 'Status'], ...rows.map((c) => [fullName(c), c.email, c.phone, c.company, c.role, c.status])];
    const blob = new Blob([lines.map((l) => l.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `contacts-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
}

export function ContactsPage() {
    const { show } = useToast();
    const [contacts, setContacts] = useState(CONTACTS);
    const [dialog, setDialog] = useState<{ contact?: Contact } | null>(null);
    const [deleting, setDeleting] = useState<string[] | null>(null);
    const [viewingId, setViewingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    /* While rows are selected the toolbar's bulk actions take over; per-row
       actions are disabled so a click can't act on one row by mistake (Table:
       selection does not reach rowActions — isDisabled on each). */
    const isBulk = selectedIds.length > 0;
    const viewing = contacts.find((c) => c.id === viewingId) ?? null;

    const save = (d: Draft) => {
        const editing = dialog?.contact;
        if (editing) setContacts((xs) => xs.map((x) => (x.id === editing.id ? { ...x, ...d } : x)));
        else setContacts((xs) => [{ ...d, id: `c${Date.now()}` }, ...xs]);
        show({ color: 'Positive', content: editing ? `${fullName(d)} updated.` : `${fullName(d)} added.` });
    };
    const remove = () => {
        if (!deleting) return;
        const names = contacts.filter((c) => deleting.includes(c.id)).map(fullName);
        setContacts((xs) => xs.filter((x) => !deleting.includes(x.id)));
        show({ color: 'Positive', content: names.length === 1 ? `${names[0]} deleted.` : `${names.length} contacts deleted.` });
        setSelectedIds((ids) => ids.filter((id) => !deleting.includes(id)));
        setDeleting(null);
    };
    const deletingOne = deleting?.length === 1 ? contacts.find((c) => c.id === deleting[0]) : undefined;

    return (
        <>
            <Table<Contact>
                accessibilityLabel="Contacts"
                data={contacts}
                columns={columns}
                getRowId={(c) => c.id}
                selectionType="multiple"
                selectedIds={selectedIds}
                onSelectionChange={({ selectedIds: ids }) => setSelectedIds(ids.map(String))}
                toolbar={{
                    title: 'Contacts',
                    subtitle: `${contacts.length} people across ${new Set(contacts.map((c) => c.company)).size} companies`,
                    search: { placeholder: 'Search contacts', accessibilityLabel: 'Search contacts' },
                    actions: <Button label="Add contact" leadingIcon={<Plus size={16} />} onClick={() => setDialog({})} />,
                }}
                bulkActions={[
                    {
                        label: 'Download',
                        icon: Download,
                        /* A file leaves nothing on the page — a toast confirms it (S3 step 3). */
                        onClick: (ids) => {
                            const rows = contacts.filter((c) => ids.map(String).includes(c.id));
                            downloadSheet(rows);
                            show({ color: 'Positive', content: `${rows.length} ${rows.length === 1 ? 'contact' : 'contacts'} downloaded as a sheet.` });
                        },
                    },
                    { label: 'Delete', icon: Trash2, intent: 'negative', onClick: (ids) => setDeleting(ids.map(String)) },
                ]}
                rowActions={(c) => [
                    { label: `View ${fullName(c)}`, icon: Eye, isDisabled: isBulk, onClick: () => setViewingId(c.id) },
                    { label: `Edit ${fullName(c)}`, icon: Pencil, isDisabled: isBulk, onClick: () => setDialog({ contact: c }) },
                    { label: `Delete ${fullName(c)}`, icon: Trash2, isDisabled: isBulk, onClick: () => setDeleting([c.id]) },
                ]}
                defaultSortState={{ columnKey: 'firstName', direction: 'asc' }}
                pagination={{ type: 'client', defaultPageSize: 10 }}
                emptyState={<EmptyState title="No contacts yet" description="Add the people you work with at each plant." />}
            />

            {/* View: the contact's details in a Drawer, the list kept beside it. */}
            <Drawer isOpen={!!viewing} onDismiss={() => setViewingId(null)} accessibilityLabel="Contact details">
                {viewing && (
                    <>
                        <DrawerHeader title={fullName(viewing)} subtitle={[viewing.role, viewing.company].filter(Boolean).join(' · ')} />
                        <DrawerBody>
                            <dl className="ct-kv">
                                <div className="ct-kv__row">
                                    <dt className="BodyMediumRegular ct-muted">Email</dt>
                                    <dd><LinkButton href={`mailto:${viewing.email}`} label={viewing.email} /></dd>
                                </div>
                                {[
                                    ['Phone', viewing.phone || '—'],
                                    ['Company', viewing.company],
                                    ['Role', viewing.role || '—'],
                                ].map(([k, v]) => (
                                    <div key={k} className="ct-kv__row">
                                        <dt className="BodyMediumRegular ct-muted">{k}</dt>
                                        <dd className="BodyMediumRegular">{v}</dd>
                                    </div>
                                ))}
                                <div className="ct-kv__row">
                                    <dt className="BodyMediumRegular ct-muted">Status</dt>
                                    <dd><Badge label={viewing.status} color={STATUS_COLOR[viewing.status]} /></dd>
                                </div>
                            </dl>
                        </DrawerBody>
                        <DrawerFooter>
                            <Button variant="primary" tone="neutral" label="Close" onClick={() => setViewingId(null)} />
                            <Button
                                label="Edit"
                                leadingIcon={<Pencil size={16} />}
                                onClick={() => {
                                    setViewingId(null);
                                    setDialog({ contact: viewing });
                                }}
                            />
                        </DrawerFooter>
                    </>
                )}
            </Drawer>

            {dialog && <ContactDialog initial={dialog.contact} onSave={save} onClose={() => setDialog(null)} />}

            <Modal isOpen={!!deleting} onDismiss={() => setDeleting(null)} size="sm" accessibilityLabel="Delete contacts">
                <ModalHeader title={deletingOne ? `Delete ${fullName(deletingOne)}?` : `Delete ${deleting?.length ?? 0} contacts?`} />
                <ModalBody>
                    <p className="BodyMediumRegular ct-flush">They're removed from this workspace for everyone. This can't be undone.</p>
                </ModalBody>
                <ModalFooter>
                    <Button variant="primary" tone="neutral" label="Cancel" onClick={() => setDeleting(null)} />
                    <Button tone="negative" label="Delete" onClick={remove} />
                </ModalFooter>
            </Modal>
        </>
    );
}
