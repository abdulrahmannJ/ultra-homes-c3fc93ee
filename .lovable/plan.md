# Make the platform sellable to Mombasa agencies

Two tracks: close the demo-blocking gaps first (cheap, fast, makes the system look complete in a sales meeting), then add the module agencies actually pay recurring money for.

## Track 1 — Demo-ready polish

- Privacy Policy and Terms pages under the public layout, linked from the footer.
- Testimonials page pulling the existing CMS testimonials, with the homepage section linking to it.
- `sitemap.xml` server route listing home, static pages, all published properties, published units and blog posts; reference it from `robots.txt`.
- Shortlist / favourites: save property or unit IDs locally, a heart control on cards and detail pages, and a "Saved" page.
- Media Library in the admin: browse everything already in the property-images bucket, upload, rename, delete, search.
- Dark/light toggle in the public header and admin topbar using the existing tokens.

## Track 2 — Recurring-revenue rental features

- Maintenance requests: a table with unit, tenant, category, priority, status and notes; admin inbox with status workflow; a tenant-facing submit form.
- Statements and exports: per-tenant rent statement (charges, payments, running balance) plus CSV export for leads, rent roll and arrears.
- Scheduled reminders: a public cron endpoint that finds overdue leases daily and queues reminders, with a log of what was sent.

## Out of scope for now

M-Pesa Daraja collection and auto-reconciliation, invoices, receipts and accounting ledgers. This is the single biggest commercial unlock and should be its own plan once the above is stable.

## Technical notes

- All new tables go in the `public` schema with explicit GRANTs, RLS enabled and staff-only policies gated on the existing `rentals` or `content` permission keys; maintenance requests also allow the owning tenant.
- New admin pages follow the existing `PermissionGate` + `useServerFn` + react-query pattern and get a sidebar entry in `admin.tsx`.
- Reminder cron lives at `src/routes/api/public/*` with the existing cron auth check.
- No changes to current properties, units, leases, charges or payments data.
