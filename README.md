# Prime Fitness — Gym Membership Management

A simple, clean, and functional Gym Membership Management website.

- **Frontend**: HTML/CSS/JavaScript
- **Backend (included)**: Node.js + Express (cookie sessions)
- **Storage**: Local JSON file (`data/members.json`)

You can still open `index.html` directly (it will fall back to Local Storage), but the recommended way is to run the server.

## How to run

### Option A: Run the Express server (recommended)

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

### Option B: Open directly (fallback mode)
- Double-click `index.html` to open in your browser.
- Login works, but it’s **front-end only**, and members use **Local Storage**.

## Admin Login (basic)
- **Username**: `admin`
- **Password**: `admin123`

> You can change credentials using environment variables when running the server:
> - `ADMIN_USER`
> - `ADMIN_PASS`

## Features
- Add / Edit / Delete members
- Plan-based expiry auto-calculation (Monthly / Quarterly / Yearly)
- Dashboard counts (Total / Active / Expired)
- Search by name or phone
- Filter by status and plan
- Export current filtered list to CSV
- Sample data included on first run

## Data storage
- **Server mode**: members are stored in `data/members.json`
- **Fallback mode**: members are stored in Local Storage (`primeFitness:members`)

