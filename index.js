import express from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import cors from 'cors';

const app = express();

// CORS aktivieren (wichtig für Web-APIs)
app.use(cors());

// JSON parsing aktivieren
app.use(express.json());

// Firebase Config mit Validierung
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID
};

// Validierung der Firebase Config
const requiredEnvVars = ['FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID'];
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
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
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
        
        const docRef = doc(db, 'Hausaufgaben', 'hausaufgaben');
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
            const data = snap.data();
            console.log('Daten erfolgreich abgerufen');
            res.json({ 
              success: true, 
              data: data,
              timestamp: new Date().toISOString()
            });
        } else {
            console.log('Dokument nicht gefunden');
            res.status(404).json({ 
              success: false, 
              error: 'Dokument nicht gefunden',
              path: 'Hausaufgaben/hausaufgaben'
            });
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Hausaufgaben:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          code: error.code || 'UNKNOWN_ERROR'
        });
    }
});

// Error Handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Interner Server Fehler'
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint nicht gefunden',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
});