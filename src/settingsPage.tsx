/* Patterns › Settings — the account profile page from the vercel dashboard
   (/profile), rebuilt from FDS parts only. Left: who you are, where to
   configure the account, and one instant preference. Right: the profile
   form, read-only until Edit (FormGroup, P1). */
import { useState, type FormEvent } from 'react';
import { Bell, Camera, ChevronRight, KeyRound, Lock, Mail, Pencil, Phone, User, UserPlus, Users } from 'lucide-react';
import {
    ActionList,
    ActionListItem,
    ActionListItemIcon,
    Avatar,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    CardHeaderLeading,
    CardHeaderTrailing,
    Divider,
    DropdownMenu,
    DropdownMenuOverlay,
    FileUpload,
    Modal,
    ModalBody,
    ModalHeader,
    PasswordInput,
    SelectInput,
    Switch,
    TextArea,
    TextInput,
    useToast,
} from '@faclon-labs/fds';
import { FormDialog } from './agentsPage';
import './settings.css';

interface Profile {
    firstName: string;
    lastName: string;
    gender: string;
    jobTitle: string;
    email: string;
    mobile: string;
    location: string;
    organisation: string;
    about: string;
    avatarUrl?: string;
}

const PROFILE: Profile = {
    firstName: 'Siddharth',
    lastName: 'Jha',
    gender: 'Prefer not to say',
    jobTitle: 'Operations Lead',
    email: 'siddharth.j@iosense.io',
    mobile: '+91 98200 41122',
    location: 'Mumbai, India',
    organisation: 'Faclon Labs',
    about: 'Runs cold-chain monitoring across 240 retail sites. Watches door events and humidity more than anyone should.',
};

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const LOCATIONS = ['Mumbai, India', 'Pune, India', 'Bengaluru, India', 'Delhi, India', 'Chennai, India', 'Dubai, UAE', 'Singapore'];

/* Each row is a different area of the account, so its tile is tinted by
   that category. FDS has no tinted icon tile (gap), so this one is made
   from tokens only, as the vercel source does; ActionList R14 would take an
   icon, an asset or an avatar here. */
const CONFIGURE = [
    {
        id: 'sub-users',
        title: 'Sub user management',
        description: 'Invite and manage sub users',
        icon: UserPlus,
        tone: 'brand',
    },
    {
        id: 'entities',
        title: 'User entities management',
        description: 'Assign devices and sites',
        icon: Users,
        tone: 'info',
    },
    {
        id: 'notifications',
        title: 'User notification management',
        description: 'Alert channels and rules',
        icon: Bell,
        tone: 'notice',
    },
    {
        id: 'token',
        title: 'Generate token',
        description: 'API access for integrations',
        icon: KeyRound,
        tone: 'positive',
    },
    {
        id: 'security',
        title: 'Security management',
        description: 'Password and sessions',
        icon: Lock,
        tone: 'negative',
    },
] as const;

const fullName = (p: Profile) => [p.firstName, p.lastName].filter(Boolean).join(' ');

function Select({ label, value, options, isReadOnly, onChange }: { label: string; value: string; options: string[]; isReadOnly: boolean; onChange: (v: string) => void }) {
    return (
        <DropdownMenu selectionType="single" value={[value]} onChange={({ values }) => values[0] && onChange(values[0])}>
            <SelectInput label={label} isReadOnly={isReadOnly} />
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

/** P1 in a Modal: validated on submit, Update never disabled (R12, R18);
 *  the change leaves nothing on screen, so it gets a toast (R15, S3 step 3). */
function PasswordDialog({ onClose }: { onClose: () => void }) {
    const { show } = useToast();
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [errors, setErrors] = useState<Partial<Record<keyof typeof pw, string>>>({});
    const edit = (k: keyof typeof pw, v: string) => {
        setPw((p) => ({ ...p, [k]: v }));
        setErrors((e) => ({ ...e, [k]: undefined }));
    };
    const submit = () => {
        const e: typeof errors = {};
        if (!pw.current) e.current = 'Enter your current password.';
        if (pw.next.length < 8) e.next = 'Use at least 8 characters.';
        if (pw.confirm !== pw.next) e.confirm = "The passwords don't match.";
        setErrors(e);
        if (Object.keys(e).length) return false;
        show({
            color: 'Positive',
            content: 'Password updated. Other sessions were signed out.',
        });
        return true;
    };
    return (
        <FormDialog
            title="Change password"
            subtitle="You stay signed in here; other sessions are signed out."
            size="sm"
            submitLabel="Update password"
            isDirty={!!(pw.current || pw.next || pw.confirm)}
            onSubmit={submit}
            onClose={onClose}
        >
            <PasswordInput
                label="Current password"
                value={pw.current}
                onChange={({ value }) => edit('current', value ?? '')}
                validationState={errors.current ? 'error' : 'none'}
                errorText={errors.current}
            />
            <PasswordInput
                label="New password"
                value={pw.next}
                onChange={({ value }) => edit('next', value ?? '')}
                helpText="At least 8 characters."
                validationState={errors.next ? 'error' : 'none'}
                errorText={errors.next}
            />
            <PasswordInput
                label="Confirm new password"
                value={pw.confirm}
                onChange={({ value }) => edit('confirm', value ?? '')}
                validationState={errors.confirm ? 'error' : 'none'}
                errorText={errors.confirm}
            />
        </FormDialog>
    );
}

export function SettingsPage({ onConfigure }: { onConfigure: (id: string) => void }) {
    const { show } = useToast();
    const [saved, setSaved] = useState(PROFILE);
    const [draft, setDraft] = useState(PROFILE);
    const [isEditing, setIsEditing] = useState(false);
    const [firstNameError, setFirstNameError] = useState<string>();
    const [dialog, setDialog] = useState<'picture' | 'password' | null>(null);
    const [centralSearch, setCentralSearch] = useState(false);
    const isReadOnly = !isEditing;

    const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
        setDraft((d) => ({ ...d, [k]: v }));
        if (k === 'firstName') setFirstNameError(undefined);
    };
    const discard = () => {
        setDraft(saved);
        setFirstNameError(undefined);
        setIsEditing(false);
    };
    const save = (e: FormEvent) => {
        e.preventDefault();
        if (!draft.firstName.trim()) {
            setFirstNameError('Enter your first name.');
            return;
        }
        const next = {
            ...draft,
            firstName: draft.firstName.trim(),
            lastName: draft.lastName.trim(),
        };
        setSaved(next);
        setDraft(next);
        setIsEditing(false);
        show({ color: 'Positive', content: 'Profile updated.' });
    };
    /* The picture shows on the card at once — no toast (S3 step 4). */
    const setPicture = (avatarUrl?: string) => {
        setSaved((p) => ({ ...p, avatarUrl }));
        setDraft((p) => ({ ...p, avatarUrl }));
        setDialog(null);
    };

    return (
        <div className="st">
            <div className="st-side">
                {/* Full-bleed card (Card R18: padding 0, content padded inside) so
                    the banner reaches the edges; the avatar overlaps its foot. */}
                <Card size="Medium" padding={0}>
                    <CardBody>
                        <div className="st-id">
                            <div className="st-id__banner" aria-hidden />
                            <div className="st-id__avatar">
                                <Avatar size="XLarge" name={fullName(saved)} src={saved.avatarUrl} />
                            </div>
                            <span className="HeadingSmallSemibold">{fullName(saved)}</span>
                            <span className="BodySmallRegular st-muted">{saved.jobTitle}</span>
                            <Badge label={saved.organisation} color="Brand" size="Small" />
                            <div className="st-id__action">
                                <Button variant="secondary" tone="neutral" label="Change picture" leadingIcon={<Camera size={16} />} isFullWidth onClick={() => setDialog('picture')} />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card size="Medium" padding={16}>
                    <CardHeader>
                        <CardHeaderLeading title="Configure user" />
                    </CardHeader>
                    <CardBody>
                        <div className="st-config">
                            <ActionList accessibilityLabel="Configure user">
                                {CONFIGURE.map((c) => (
                                    <ActionListItem
                                        key={c.id}
                                        value={c.id}
                                        title={c.title}
                                        description={c.description}
                                        leading={
                                            <span className={`st-tile st-tile--${c.tone}`} aria-hidden>
                                                <c.icon size={16} />
                                            </span>
                                        }
                                        trailing={<ActionListItemIcon icon={ChevronRight} />}
                                        onClick={() => (c.id === 'security' ? setDialog('password') : onConfigure(c.id))}
                                    />
                                ))}
                            </ActionList>
                        </div>
                    </CardBody>
                </Card>

                <Card size="Medium" padding={16}>
                    <CardHeader>
                        <CardHeaderLeading title="Preferences" />
                    </CardHeader>
                    <CardBody>
                        <div className="st-pref">
                            <div className="st-pref__text">
                                <span className="BodyMediumMedium">Central search</span>
                                <span className="BodySmallRegular st-muted">Search pages, organizations, people and activity from the top bar, or with ⌘K / Ctrl K.</span>
                            </div>
                            {/* Flipping it is its own feedback — no toast (S3 step 4). */}
                            <Switch accessibilityLabel="Central search" isChecked={centralSearch} onChange={({ isChecked }) => setCentralSearch(isChecked)} />
                        </div>
                    </CardBody>
                </Card>
            </div>

            <Card size="Medium" padding={16}>
                <CardHeader>
                    <CardHeaderLeading title="Profile" subtitle="Details your team sees across the workspace." />
                    {isReadOnly && (
                        <CardHeaderTrailing visual={<Button variant="secondary" tone="neutral" size="sm" label="Edit" leadingIcon={<Pencil size={14} />} onClick={() => setIsEditing(true)} />} />
                    )}
                </CardHeader>
                <CardBody>
                    <form className="st-form" onSubmit={save} noValidate>
                        <div className="st-grid">
                            <TextInput
                                label="First name"
                                necessityIndicator={isEditing ? 'required' : 'none'}
                                isReadOnly={isReadOnly}
                                value={draft.firstName}
                                onChange={({ value }) => set('firstName', value ?? '')}
                                trailingIcon={User}
                                validationState={firstNameError ? 'error' : 'none'}
                                errorText={firstNameError}
                            />
                            <TextInput label="Last name" isReadOnly={isReadOnly} value={draft.lastName} onChange={({ value }) => set('lastName', value ?? '')} trailingIcon={User} />
                            <Select label="Gender" value={draft.gender} options={GENDERS} isReadOnly={isReadOnly} onChange={(v) => set('gender', v)} />
                            <TextInput label="Job title" isReadOnly={isReadOnly} value={draft.jobTitle} onChange={({ value }) => set('jobTitle', value ?? '')} />
                            <TextInput label="Email" value={draft.email} isDisabled trailingIcon={Mail} helpText="Sign-in address. Changing it needs re-verification." />
                            <TextInput label="Mobile" type="telephone" isReadOnly={isReadOnly} value={draft.mobile} onChange={({ value }) => set('mobile', value ?? '')} trailingIcon={Phone} />
                            <Select label="Location" value={draft.location} options={LOCATIONS} isReadOnly={isReadOnly} onChange={(v) => set('location', v)} />
                            <TextInput label="Organisation" isReadOnly={isReadOnly} value={draft.organisation} onChange={({ value }) => set('organisation', value ?? '')} />
                        </div>
                        <TextArea label="About" isReadOnly={isReadOnly} value={draft.about} onChange={({ value }) => set('about', value ?? '')} helpText="A short line about what you work on." />
                        <Divider />
                        <div className="st-actions">
                            <Button variant="secondary" tone="neutral" label="Change password" leadingIcon={<KeyRound size={16} />} onClick={() => setDialog('password')} />
                            {isEditing && (
                                /* P1 R16: Discard (primary neutral) then the submit. */
                                <div className="st-actions__end">
                                    <Button variant="primary" tone="neutral" label="Discard" onClick={discard} />
                                    <Button type="submit" label="Update profile" />
                                </div>
                            )}
                        </div>
                    </form>
                </CardBody>
            </Card>

            <Modal isOpen={dialog === 'picture'} onDismiss={() => setDialog(null)} size="sm" accessibilityLabel="Change picture">
                <ModalHeader title="Change picture" subtitle="A square image works best — it's shown as a circle." />
                <ModalBody>
                    <div className="st-form">
                        <FileUpload
                            accessibilityLabel="Upload a picture"
                            uploadType="single"
                            accept="image/*"
                            files={[]}
                            onChange={({ files }) => files[0] && setPicture(URL.createObjectURL(files[0]))}
                        />
                        {saved.avatarUrl && <Button variant="secondary" tone="neutral" label="Remove picture" onClick={() => setPicture(undefined)} />}
                    </div>
                </ModalBody>
            </Modal>

            {dialog === 'password' && <PasswordDialog onClose={() => setDialog(null)} />}
        </div>
    );
}
