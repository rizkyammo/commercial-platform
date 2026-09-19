# UAT Checklist — AmmoBiz v1.0

## 1. AUTHENTICATION

- [ ] Login dengan email + password valid
- [ ] Login gagal dengan password salah → error message
- [ ] Logout dari user menu
- [ ] Forgot password → email terkirim
- [ ] Reset password via email link
- [ ] MFA (jika aktif) → prompt saat login

## 2. MASTER DATA

- [ ] Create customer
- [ ] Edit customer
- [ ] Delete customer
- [ ] Create site dengan lat/lng
- [ ] Create product
- [ ] Create vendor
- [ ] Create transporter
- [ ] Create contract + rules

## 3. ORDER WORKFLOW

- [ ] Create draft order
- [ ] Autosave saat edit draft
- [ ] Submit order
- [ ] Supervisor start review
- [ ] Return order dengan alasan
- [ ] Manager approve order
- [ ] Issue order → cek quota committed
- [ ] Amendment flow
- [ ] Cancellation flow

## 4. FLOW EXECUTION

- [ ] Create procurement (per-vendor)
- [ ] Submit procurement
- [ ] Verify procurement
- [ ] Coverage 100% → shipment unlocked
- [ ] Create shipment
- [ ] Confirm shipment → quota realized
- [ ] Create delivery
- [ ] Create BAST (upload file)
- [ ] Submit BAST
- [ ] Verify BAST
- [ ] Complete BAST → order CLOSED

## 5. COMPLIANCE & QUOTA

- [ ] Create SK
- [ ] Add quota lines
- [ ] Activate SK
- [ ] Amend SK
- [ ] Issue order → quota committed
- [ ] Shipment confirm → quota realized
- [ ] Cancel order → quota released
- [ ] Try over-quota → blocked
- [ ] Concurrent issue → only 1 succeeds

## 6. INVOICING

- [ ] Create invoice dari order
- [ ] Issue invoice
- [ ] Send invoice
- [ ] Record payment partial
- [ ] Record payment full → status PAID
- [ ] Cancel invoice
- [ ] Revisi invoice (before payment)
- [ ] Aging bucket calculation
- [ ] Outstanding = Issued − Paid
- [ ] Uninvoiced detection

## 7. ANALYTICS

- [ ] Time preset (Daily/Monthly/Yearly/All)
- [ ] KPI cards (Order Value, Margin, Tax, dll)
- [ ] Trend chart
- [ ] Orders by Stage pie
- [ ] Margin by Site/Customer/Product
- [ ] Cycle time metrics
- [ ] Compliance quota gauge
- [ ] View all → drill-down pages

## 8. REPORTS

- [ ] Order Register
- [ ] Order Progress
- [ ] Procurement Register
- [ ] Shipment Register
- [ ] BAST Register
- [ ] Outstanding BAST
- [ ] Cost Report
- [ ] Margin Report
- [ ] Tax Report
- [ ] Margin Before/After Tax
- [ ] Export XLSX (dengan styling)
- [ ] Print PDF
- [ ] Custom Report Builder

## 9. SPATIAL

- [ ] Map render dengan markers
- [ ] Toggle layers
- [ ] Click marker → detail panel
- [ ] Add prospect
- [ ] Add base
- [ ] Manage prospects list
- [ ] Lens switch (Portfolio/Opportunity/dll)

## 10. USER MANAGEMENT

- [ ] List users
- [ ] Filter by role/status/dept
- [ ] View user detail
- [ ] Assign/remove role
- [ ] Deactivate user
- [ ] Invite new user

## 11. AUDIT LOG

- [ ] List all events
- [ ] Filter by module/action/result
- [ ] Click row → detail panel
- [ ] JSON changes visible

## 12. ORGANIZATION

- [ ] Tree view
- [ ] Expand/collapse
- [ ] Click node → detail

## 13. SETTINGS

- [ ] Update profile
- [ ] Upload avatar
- [ ] Change password
- [ ] Toggle notifications
- [ ] Dark mode
- [ ] Language
- [ ] Security page

## 14. SECURITY

- [ ] RLS blocks unauthorized access
- [ ] No data leak via direct API
- [ ] XSS not possible
- [ ] SQL injection not possible
- [ ] File upload validated
- [ ] Rate limit works
- [ ] Session expiry
- [ ] Error messages sanitized

## 15. MOBILE

- [ ] Bottom nav visible
- [ ] Tables scroll horizontally
- [ ] Forms usable
- [ ] Map touch works
- [ ] Buttons large enough
- [ ] No horizontal overflow

## 16. BROWSER COMPATIBILITY

- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

## 17. PERFORMANCE

- [ ] First paint < 2s
- [ ] Route transitions < 500ms
- [ ] Large tables paginated
- [ ] No N+1 queries
- [ ] Images optimized

## 18. ERROR HANDLING

- [ ] Error boundary catches errors
- [ ] 404 page
- [ ] Network error message
- [ ] Validation errors clear
- [ ] Reference ID di error

## SIGN-OFF

| Role | Name | Signature | Date |
|---|---|---|---|
| Commercial Staff | | | |
| Supervisor | | | |
| Manager | | | |
| Compliance | | | |
| IT Admin | | | |