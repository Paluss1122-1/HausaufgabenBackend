import express from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import cors from 'cors';

const app = express();

// CORS aktivieren
app.use(cors());

// JSON parsing aktivieren
app.use(express.json());

// Firebase Config - genau wie deine Render Environment Variables
const firebaseConfig = {
  apiKey: process.env.apiKey,
  authDomain: process.env.authDomain,
  projectId: process.env.projectId,
};

// Validierung der Firebase Config
const requiredEnvVars = ['apiKey', 'authDomain', 'projectId'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Fehlende Environment Variables:', missingVars);
  process.exit(1);
}

let fbApp, db;

try {
  fbApp = initializeApp(firebaseConfig);
  db = getFirestore(fbApp);
  console.log('Firebase erfolgreich initialisiert');
} catch (error) {
  console.error('Firebase Initialisierung fehlgeschlagen:', error);
  process.exit(1);
}

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hausaufgaben API läuft',
    endpoints: ['/api/hausaufgaben', '/health']
  });
});

app.get('/api/hausaufgaben', async (req, res) => {
    try {
        console.log('Fetching Hausaufgaben...');
        
        const snap = await getDoc(doc(db, 'Hausaufgaben', 'hausaufgaben'));
        
        if (snap.exists()) {
            console.log('Daten erfolgreich abgerufen');
            res.json({ 
              success: true, 
              data: snap.data()
            });
        } else {
            console.log('Dokument nicht gefunden');
            res.status(404).json({ 
              success: false, 
              error: 'Nicht gefunden'
            });
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Hausaufgaben:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`Firebase Project: ${process.env.projectId}`);
});