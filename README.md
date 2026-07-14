# Ciergo Finance – Bookings Frontend

React + TypeScript implementation of the supplied Finance Bookings and Booking Calendar designs.

## Run locally

Start the seeded backend first:

```powershell
cd backend
npm run dev
```

Then start the frontend:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

The frontend automatically authenticates with the seeded demo account. Override its configuration using:

```text
VITE_API_URL=/api/v1
VITE_DEMO_EMAIL=admin@ciergo.test
VITE_DEMO_PASSWORD=Password@123
```

## Implemented UI behavior

- Active, deleted, and waiting-for-approval tabs
- Approval-status filter
- Booking/travel date, booking type, owner, text, and incomplete-booking filters
- Basic and advanced primary/secondary owner selection
- Service multi-select filter
- Sorting and pagination
- Row and voucher menus
- Selection mode and bulk-action presentation
- Approval, rejection, resubmission, restore, and duplicate actions
- Confirmation dialogs and server feedback
- Payment pending-amount tooltips
- Calendar navigation, scheduled events, status menu, rescheduling, and status changes
- Responsive sidebar/table behavior

Operations intentionally deferred in the backend are presented in the UI and display an explanatory message rather than pretending to succeed.
