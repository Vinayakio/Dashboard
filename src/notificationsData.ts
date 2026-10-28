/* Demo data for Patterns › Notification — the IO Sense notification centre
   (Figma "IO Sense Reference" › Notifications section). */

export type Severity = 'critical' | 'major' | 'minor' | 'info' | 'resolved';
export type Status = 'open' | 'acknowledged' | 'resolved';

export interface Comment {
    id: string;
    author: string;
    at: Date;
    text: string;
    replies: Comment[];
}

export interface Notification {
    id: string;
    kind: 'alert' | 'activity';
    severity: Severity;
    title: string;
    description: string;
    tags: string[];
    at: Date;
    isUnread: boolean;
    status: Status;
    current: number;
    threshold: number;
    sensor: string;
    device: string;
    deviceType: string;
    area: string;
    duration: string;
    event: string;
    comments: Comment[];
}

const now = Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(now - ms);

const thread = (): Comment[] => [
    {
        id: 'c1',
        author: 'Rahul Pongde',
        at: ago(5 * MIN),
        text: 'Load is still above the limit. I have asked the shift lead to check the winding temperature sensor.',
        replies: [
            { id: 'c1r1', author: 'Hritik Sawant', at: ago(4 * MIN), text: 'Sensor reads fine from the panel. Looks like a real overload on the kiln drive.', replies: [] },
            { id: 'c1r2', author: 'Rahul Pongde', at: ago(3 * MIN), text: 'Thanks. Moving the raw mill start to the off-peak slot.', replies: [] },
        ],
    },
    {
        id: 'c2',
        author: 'Priya Nair',
        at: ago(2 * HOUR),
        text: 'This crossed the threshold twice last week as well. Worth a maintenance check.',
        replies: [
            { id: 'c2r1', author: 'Arjun Mehta', at: ago(90 * MIN), text: 'Work order WO-2437 raised for Friday.', replies: [] },
            { id: 'c2r2', author: 'Priya Nair', at: ago(80 * MIN), text: 'Great, thanks.', replies: [] },
        ],
    },
];

const base = { current: 43, threshold: 23, sensor: 'Active Power', deviceType: 'Energy meter', duration: '16 min and counting', event: 'Threshold breach', comments: [] as Comment[] };

export const NOTIFICATIONS: Notification[] = [
    { ...base, id: 'n1', kind: 'alert', severity: 'critical', title: 'Energy consumption above threshold', description: 'Winding temperature has been above the configured limit for 18 minutes. Load has not dropped.', tags: ['Energy', 'Steam Leak'], at: ago(5 * MIN), isUnread: true, status: 'open', device: 'Energymeter 473', area: 'Kiln', comments: thread() },
    { ...base, id: 'n2', kind: 'alert', severity: 'major', title: 'Compressor 02 pressure dropping', description: 'Discharge pressure fell 12% in the last hour. Check for a leak on the main header.', tags: ['Compressed Air', 'Steam Loss'], at: ago(42 * MIN), isUnread: true, status: 'open', current: 5.8, threshold: 6.5, sensor: 'Discharge pressure', device: 'Compressor 02', deviceType: 'Compressor', area: 'Utilities' },
    { ...base, id: 'n3', kind: 'activity', severity: 'info', title: 'Report generated: Energy Analytics', description: 'The weekly energy analytics report for Pune plant is ready to download.', tags: ['Report Generated', 'Energy'], at: ago(3 * HOUR), isUnread: false, status: 'resolved', sensor: '—', device: 'Report service', deviceType: 'Service', area: 'Plant', duration: '—', event: 'Scheduled report' },
    { ...base, id: 'n4', kind: 'alert', severity: 'minor', title: 'Pump 05 vibration above baseline', description: 'Vibration is 8% above its 30-day baseline. Not yet at the alarm limit.', tags: ['Vibration'], at: ago(5 * HOUR), isUnread: false, status: 'acknowledged', current: 4.6, threshold: 4.2, sensor: 'Vibration RMS', device: 'Pump 05', deviceType: 'Pump', area: 'Raw mill' },
    { ...base, id: 'n5', kind: 'alert', severity: 'resolved', title: 'Boiler 01 flue temperature back to normal', description: 'Flue gas temperature has been within limits for 30 minutes.', tags: ['Steam', 'Energy'], at: ago(DAY + 2 * HOUR), isUnread: false, status: 'resolved', current: 182, threshold: 210, sensor: 'Flue temperature', device: 'Boiler 01', deviceType: 'Boiler', area: 'Utilities', duration: '42 min' },
    { ...base, id: 'n6', kind: 'alert', severity: 'critical', title: 'Peak demand crossed the contract', description: '497 kW against a 480 kW contract — 17 kW over. The demand charge is billed on this peak.', tags: ['Energy', 'Demand'], at: ago(DAY + 6 * HOUR), isUnread: true, status: 'open', current: 497, threshold: 480, sensor: 'Demand', device: 'Main incomer', deviceType: 'Energy meter', area: 'Plant' },
    { ...base, id: 'n7', kind: 'activity', severity: 'info', title: 'Rahul Pongde acknowledged an alert', description: 'Cooling tower 01 water usage spike was acknowledged and assigned to Utilities.', tags: ['Water'], at: ago(DAY + 9 * HOUR), isUnread: false, status: 'resolved', sensor: '—', device: 'Cooling tower 01', deviceType: 'Cooling tower', area: 'Utilities', duration: '—', event: 'Acknowledgement' },
    { ...base, id: 'n8', kind: 'alert', severity: 'major', title: 'Chiller 03 discharge pressure high', description: 'Discharge pressure has stayed above the limit for 25 minutes.', tags: ['HVAC'], at: ago(3 * DAY), isUnread: false, status: 'acknowledged', current: 18.2, threshold: 16, sensor: 'Discharge pressure', device: 'Chiller 03', deviceType: 'Chiller', area: 'Lighting & HVAC' },
];

export const DEVICES = [...new Set(NOTIFICATIONS.map((n) => n.device))];
export const AREAS = [...new Set(NOTIFICATIONS.map((n) => n.area))];
