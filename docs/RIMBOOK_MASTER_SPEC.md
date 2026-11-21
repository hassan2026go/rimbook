# Rimbook — Master Product & Engineering Specification

> This file is the durable source of truth for the existing Rimbook application. Every future change must extend the same application and update this document; do not create disconnected demo apps or duplicate releases.

## 1. Product principles (user decisions)

- Rimbook is a practical business, project, worker and financial management application. It is not merely a notes/calendar app.
- Keep the application free to use and do not require a permanent paid server or mandatory hosting.
- Local-first storage is the default. Core work must remain usable without an internet connection.
- Google Drive/cloud storage is optional and belongs to the user's own account. Keep a separate local backup path.
- Do not publish a final APK until the application is mature and the workflows have been tested on a real phone.
- Never silently discard existing records when changing screens or data structures.
- Financial records are append-only. Correct financial mistakes with a dated, reasoned reversal entry; do not silently delete or overwrite them.
- Every new feature must be integrated into its proper screen, data model, settings, backups, offline cache, reports and tests where relevant.

## 2. Main navigation and screen structure

1. Dashboard / management home.
2. Projects and business operations.
3. Workers and employees.
4. Workday / daily attendance.
5. Payroll and worker statements.
6. Tasks and work stages.
7. Unified notebook and daily log.
8. Voice work ledger.
9. Clients, suppliers and contacts.
10. Invoices and receipts.
11. Financial reports and statistics.
12. Settings, storage, backups and integrations.
13. About.

### Navigation decisions
- Remove the Habits feature from the active application and its suggestions/search. Legacy habit data may remain stored only to avoid destructive migration; it must not appear as an active feature.
- Notes, appointments and reminders belong in one unified notebook screen, with one place to add, review, edit and link entries to a project or person.
- Old navigation links to notes/appointments/reminders must route to the unified notebook so older actions do not break.

## 3. Workers, attendance and payroll

### Worker records
- Maintain a dedicated record for each worker/employee: full name, phone, trade/job, wage system, wage amount, optional overtime rate, default project, notes and active/archived status.
- Provide direct contact actions from the worker record: phone, WhatsApp, SMS, email and copying contact details where available.
- Archiving a worker must preserve their complete work and financial history. Do not hard-delete a worker with linked records.

### Wage systems and policies
- Support daily, weekly and monthly wage agreements.
- Weekly/monthly conversion to a daily accrual must use configurable working days per week/month; current implementation defaults to 6 and 26 and must remain editable.
- Keep the holiday-pay percentage, normal hours/day, overtime enablement and overtime rate configurable.
- Do not silently assume an overtime multiplier. Use the explicitly configured overtime hourly rate.
- Show the applied calculation basis in worker statements.

### Daily work register
- Record worker, date, project, attendance state (work / holiday / absence), normal hours, late hours, overtime hours and notes.
- Calculate the accrued worker amount from the worker's wage policy and company settings.
- Record overtime hours even when overtime pay is disabled, but clearly show that no overtime amount was calculated.
- Preserve daily history and allow review by worker, project and period.

### Worker account
- Keep accrued wages, actual wage payments and advances as distinct amounts.
- Worker balance = accrued worker wages - wage payments - advances, with reversal entries included in the calculation.
- Provide monthly worker statements showing workdays, holidays, absences, overtime, accrued wages, paid amounts, advances and remaining balance.
- A payment to a worker is not the same as money received from a customer; keep these accounting directions separate.

## 4. Projects and business operations

- Project profile: name, client/owner, location, budget, dates, status and notes.
- Link workers, tasks, workday entries, expenses, purchases, invoices, receipts and notebook records to the correct project.
- Track phases/stages, planned work, completed work and progress.
- Project deletion must never silently delete linked financial or work records. Preserve records and detach them from the deleted project only after clear confirmation.
- Track materials, purchases, operating expenses and other project costs separately from worker wages and customer receipts.
- Dashboard should show active projects, worker counts, pending tasks, financial exposure and items requiring attention.

## 5. Financial management

- Separate customer income/receivables from worker payroll liabilities and company expenses.
- Support incoming receipts, supplier/customer invoices, expenses, worker wage payments, advances, debts and outstanding balances.
- Each transaction needs a date, amount, currency, description, related person and optional project.
- Support multiple currencies and user-managed exchange rates; live rates are optional and require internet.
- Invoices and receipts must be printable/exportable and linked to their underlying transaction so an attached receipt does not duplicate the amount.
- Provide account statements per worker, client, supplier and project.
- Reports must distinguish cash received, cash paid, payroll accrued, payroll paid, advances, expenses and outstanding balances.
- Do not describe a project budget as profit. Profit/loss requires actual income and actual costs.

## 6. Unified notebook and reminders

- One screen contains notes, appointments, reminders, attachments and daily log entries.
- Entries may be independent or linked to a project/person.
- Preserve editing, deletion for non-financial notes, attachments and text-to-speech.
- Reminders include wages, payments, advances, holidays, meetings and general reminders.
- Notification permission must be explicit. Current web notifications are best-effort while the app/browser is active; do not promise reliable closed-app background delivery until native Android scheduling is implemented and tested.

## 7. Voice and accessibility

- Arabic speech input should recognize short practical phrases such as work, holiday, received payment, advance and expense.
- Always show a review/confirmation step before converting speech into financial records.
- Save the recognized phrase as an auditable voice log.
- Provide a separate original-audio recording and playback path, not only text-to-speech playback of the transcript.
- Keep large, clear quick-action controls for workers who have limited reading/writing skills.
- Speech recognition support and microphone permissions vary by browser/device and must be tested on Android.

## 8. Contacts and communication

- Worker/client/supplier profiles should expose phone calling, WhatsApp, SMS, email, copying phone/email and sharing relevant reports/documents.
- WhatsApp should open the correct international number when available. The user confirms sending inside WhatsApp; Rimbook must not claim a message was sent merely because WhatsApp opened.
- Communication integrations are optional and should not block offline work.

## 9. Storage, backup, sync and security

- Store core structured records locally and keep the application usable offline.
- Store binary attachments in IndexedDB and ensure backup/restore includes them; exporting only localStorage JSON is not a complete backup.
- Provide local full backup, encrypted full backup, restore, CSV/ICS export, share to other apps, optional Google Drive backup and direct device-to-device transfer.
- Full restore must validate the backup before replacing data and must preserve attachment links.
- Preserve backward compatibility with older JSON backups.
- ZIP export/import of the full data set and attachments has been added; it uses stored ZIP entries and requires compatibility tests with large files and external ZIP tools.
- Explain storage quota and persistent-storage support honestly. Browser storage persistence is not a substitute for backups.
- Cloud sync is optional and must not become a dependency for ordinary local operation.
- Keep secrets/tokens out of public source files and never include API keys in exports without an explicit user choice.
- Worker role/UI separation is not secure authentication by itself. Before multi-user deployment, implement an explicit user/role/permission model and protect private worker/financial records.

## 10. Settings

Settings must control real behavior, not merely appearance:
- theme, font size and language;
- base currency and exchange rates;
- daily/weekly/monthly wage settings;
- normal working hours, overtime and holiday policies;
- workweek/month workday counts;
- notification permission and reminder lead time;
- local storage health and persistent-storage request;
- backup, restore, encryption and Google Drive connection;
- contacts/communication preferences;
- user roles and permissions;
- export, import and data-retention options.

## 11. Current implementation state on main (not a final release)

- The accumulated storage-integrity, worker communication, reminders, receipts and voice-ledger changes were consolidated into main.
- The notebook screen now combines notes, appointments and reminders; Habits is removed from active navigation.
- Worker directory, daily attendance and monthly payroll screens have been added and linked from the management dashboard.
- Worker profiles now link to their personal view; workers see only their assigned tasks and their own work/voice records in the worker role.
- Management tasks can be assigned to a worker. Project profiles now capture client, location, description, start/due dates and budget; project cards show assigned workers, payroll, operating expenses, purchases, receivables and receipts.
- Project archival replaces destructive deletion, preserving all linked work and financial history.
- A project-linked materials/purchases ledger records suppliers, quantities, unit prices, partial payments, outstanding supplier balances and documented cancellations/refunds.
- Worker wage accrual, payments and advances are separate fields; audited reversal entries include these values.
- Arabic speech-to-record review exists; original audio recording/playback has been added to the voice log.
- Full backup/restore now packages records and IndexedDB attachments for local, encrypted, Google Drive, sharing and WebRTC paths.
- Automated tests were extended for notebook, workforce, reversals, attachments and audio.
- These code changes still require successful CI verification and real-device functional/accounting tests before being called complete.

## 12. Remaining work before the final APK

- Verify all new JavaScript and tests in GitHub Actions.
- Exercise worker create/archive/edit, attendance, late hours, overtime, weekly/monthly wage conversions, payment/advance and reversal scenarios with hand-calculated examples.
- Verify worker-to-profile association and real user/role permissions; do not expose another worker's account through a simple role toggle.
- Finish company/client/supplier accounting separation, project purchases/materials and project profit/loss reports.
- Complete the full settings hub and ensure every setting affects the relevant calculation or workflow.
- Implement ZIP full backup/restore and test large attachments.
- Test microphone recording/playback, speech recognition, notifications, offline launch, backup/restore and device transfer on actual Android phones.
- Only then produce the final installable APK and a single maintained application release.
