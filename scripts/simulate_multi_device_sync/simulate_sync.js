/**
 * Minimal script to create sample transactions in Firestore for a given user.
 * Usage: node simulate_sync.js <USER_UID>
 *
 * You'll need to place a Firebase service account JSON at
 * scripts/simulate_multi_device_sync/serviceAccountKey.json
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('serviceAccountKey.json not found. Copy your service account JSON here.');
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node simulate_sync.js <USER_UID>');
    process.exit(1);
  }

  const txCol = db.collection('users').doc(uid).collection('transactions');

  const buy = {
    localId: 'buy-cloud-1',
    transactionType: 'BUY',
    data: {
      id: 'buy-cloud-1',
      transactionType: 'BUY',
      date: new Date().toISOString(),
      totalAmount: 1000,
      supplierName: 'Sample Supplier',
      invoiceNumber: `SIM-${Date.now()}-B`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const lend = {
    localId: 'lend-cloud-1',
    transactionType: 'LEND',
    data: {
      id: 'lend-cloud-1',
      transactionType: 'LEND',
      date: new Date().toISOString(),
      amount: 500,
      personName: 'Test Person',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const buyRef = txCol.doc(buy.localId);
    await buyRef.set(buy, {merge: true});
    console.log('Created BUY doc:', buyRef.id);

    const lendRef = txCol.doc(lend.localId);
    await lendRef.set(lend, {merge: true});
    console.log('Created LEND doc:', lendRef.id);

    const snapshot = await txCol.get();
    console.log('Current transactions for user:', uid, snapshot.docs.map(d => d.id));
  } catch (e) {
    console.error('Failed to create docs', e);
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
