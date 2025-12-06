Simulation harness for multi-device sync

This folder contains a small Node.js script to simulate cloud-side writes (device A) and a subsequent read/restore (device B).

Requirements
- Node.js 14+
- A Firebase project and a service account JSON key with Firestore access.

Setup
1. Copy your service account JSON into this folder and name it `serviceAccountKey.json`.
2. Install dependencies:

```bash
cd scripts/simulate_multi_device_sync
npm install firebase-admin
```

Usage

- Run the script to create sample transactions in Firestore for a test user id (replace USER_UID):

```bash
node simulate_sync.js USER_UID
```

What it does
- Creates two sample transactions (BUY and LEND) in Firestore under `users/{uid}/transactions` using different payload shapes.
- Prints the created docs and their ids. Use the mobile app (or CloudBackupService.restoreFromCloud) to verify restore behavior.

Notes
- This script is intentionally minimal. Do not commit your service account key to source control.
