import express from 'express';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import cors from 'cors';

// Cache für die Hausaufgaben-Daten
let cachedData = null;
let lastFetch = null;
const CACHE_DURATION = 30 * 1000; // 30 Sekunden Cache

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
// Funktion zum Abrufen und Aktualisieren der Hausaufgaben-Daten
async function fetchAndCacheHausaufgaben() {
    try {
        console.log('Aktualisiere Hausaufgaben-Daten...');
        const snap = await getDoc(doc(db, 'Hausaufgaben', 'hausaufgaben'));
        
        if (snap.exists()) {
            cachedData = {
                success: true,
                data: snap.data(),
                timestamp: new Date().toISOString(),
                source: 'firebase-live'
            };
            lastFetch = Date.now();
            console.log('Daten erfolgreich aktualisiert und gecacht');
        } else {
            cachedData = {
                success: false,
                error: 'Keine Hausaufgaben gefunden',
                timestamp: new Date().toISOString()
            };
            lastFetch = Date.now();
        }
        return cachedData;
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Daten:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Daten beim Server-Start einmal laden
fetchAndCacheHausaufgaben();

// Health Check Endpoint - mit Datenaktualisierung
app.get('/health', async (req, res) => {
  // Daten bei Health Check auch aktualisieren
  await fetchAndCacheHausaufgaben();
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    dataStatus: cachedData ? 'Loaded' : 'Not loaded',
    lastDataFetch: lastFetch ? new Date(lastFetch).toISOString() : 'Never'
  });
});

// Root endpoint - automatische Datenaktualisierung
app.get('/', async (req, res) => {
  // Daten bei jedem Root-Aufruf aktualisieren
  await fetchAndCacheHausaufgaben();
  
  res.json({ 
    message: 'Hausaufgaben API für Chatbase läuft',
    endpoints: [
      '/api/hausaufgaben - Alle Hausaufgaben',
      '/api/hausaufgaben/today - Heutige Hausaufgaben',
      '/health - Server Status'
    ],
    lastDataUpdate: lastFetch ? new Date(lastFetch).toISOString() : 'Noch nicht geladen'
  });
});

app.get('/api/hausaufgaben', async (req, res) => {
    try {
        // Cache prüfen - wenn älter als 30 Sekunden, neu laden
        const now = Date.now();
        if (!cachedData || !lastFetch || (now - lastFetch) > CACHE_DURATION) {
            console.log('Cache abgelaufen - lade neue Daten...');
            await fetchAndCacheHausaufgaben();
        } else {
            console.log('Verwende gecachte Daten');
        }
        
        // Cache-Control Header für Browser
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Expires', '0');
        
        if (cachedData.success) {
            res.json({
                ...cachedData,
                cached: (now - lastFetch) < CACHE_DURATION,
                cacheAge: Math.floor((now - lastFetch) / 1000) + ' Sekunden'
            });
        } else {
            res.status(404).json(cachedData);
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Live-Daten:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
    }
});
// Spezifische Abfrage für heutige Hausaufgaben
app.get('/api/hausaufgaben/today', async (req, res) => {
    try {
        // Cache prüfen und ggf. aktualisieren
        const now = Date.now();
        if (!cachedData || !lastFetch || (now - lastFetch) > CACHE_DURATION) {
            await fetchAndCacheHausaufgaben();
        }
        
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        if (cachedData.success) {
            const today = new Date().toLocaleDateString('de-DE');
            res.json({ 
              ...cachedData,
              filter: 'today',
              date: today,
              cached: (now - lastFetch) < CACHE_DURATION
            });
        } else {
            res.status(404).json({ 
              success: false, 
              error: 'Keine Hausaufgaben für heute gefunden'
            });
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der heutigen Hausaufgaben:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message
        });
    }
});
});

app.get('/api/hausaufgaben', async (req, res) => {
    try {
        console.log('Fetching live Hausaufgaben data...');
        
        // Cache-Control Header für immer frische Daten
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Expires', '0');
        
        const snap = await getDoc(doc(db, 'Hausaufgaben', 'hausaufgaben'));
        
        if (snap.exists()) {
            const data = snap.data();
            console.log('Live Daten erfolgreich abgerufen');
            res.json({ 
              success: true, 
              data: data,
              timestamp: new Date().toISOString(),
              source: 'firebase-live'
            });
        } else {
            console.log('Dokument nicht gefunden');
            res.status(404).json({ 
              success: false, 
              error: 'Keine Hausaufgaben gefunden'
            });
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Live-Daten:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`Firebase Project: ${process.env.projectId}`);
});