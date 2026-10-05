import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

const app = initializeApp({
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
});

const db = getFirestore(app);

async function testFichaWrite() {
  const docId = 'ficha_test_probe_123';
  console.log('Testing setDoc on /fichas/' + docId + ' in project ' + appletConfig.projectId);
  try {
    await setDoc(doc(db, 'fichas', docId), {
      id: docId,
      number: '123',
      name: 'COCINA',
      test: true,
      createdAt: new Date().toISOString()
    });
    console.log('WRITE SUCCESS! Document written to Firestore!');
    const snap = await getDoc(doc(db, 'fichas', docId));
    console.log('READ SUCCESS! Document exists:', snap.exists(), snap.data());
  } catch (err: any) {
    console.error('WRITE ERROR:', err.code, err.message);
  }
}

testFichaWrite().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
