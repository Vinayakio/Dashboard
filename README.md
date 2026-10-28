# Plant Operations dashboard

A demo dashboard built entirely with the **Faclon Design System** ([`@faclon-labs/fds`](https://www.npmjs.com/package/@faclon-labs/fds)), using its `AppShell` with side navigation, top bar, Bruce AI assistant and toasts.

## Run it

Needs Node.js 20 or newer.

```bash
npm install
npm run dev      # http://localhost:5182
```

Other scripts:

```bash
npm run build    # typecheck, then a production build in dist/
npm run preview  # serve the production build
```

## What's inside

| Section | Pages |
|---|---|
| Overview | KPI cards, energy chart, work orders and alarms |
| Bruce AI | AI assistant home with recent conversations |
| Agents | Agent list and a Build / Playground / Deploy workspace |
| Operations | Assets, Work orders, Alarms |
| Analytics | Energy, OEE, Reports (a sample report form) |
| Pattern | Settings (profile), Notification, Device, Contact |

Every page is composed from FDS components and FDS tokens only.

## Project layout

```
index.html
src/
  main.tsx                 AppShell, navigation and routing
  agentsPage.tsx           Agents section
  settingsPage.tsx         Pattern › Settings
  notificationsPage.tsx    Pattern › Notification
  devicesPage.tsx          Pattern › Device
  deviceConfigDialog.tsx   Device › Edit device wizard
  contactsPage.tsx         Pattern › Contact
  reportsPage.tsx          Analytics › Reports
  *.css                    layout only, FDS tokens
```
