import express from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const app = express();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

app.get('/api/hausaufgaben', async (req, res) => {
    try {
        const snap = await getDoc(doc(db, 'Hausaufgaben', 'hausaufgaben'));
        if (snap.exists()) {
            res.json({ success: true, data: snap.data() });
        } else {
            res.status(404).json({ success: false, error: 'Nicht gefunden' });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server läuft");
});