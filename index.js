import express from 'express';
import { createClient } from '@supabase/supabase-js';
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

// Supabase Config aus Environment Variables
const supabaseUrl = process.env.supabaseUrl;
const supabaseKey = process.env.supabaseKey;

// Validierung der Supabase Config
const requiredEnvVars = ['supabaseUrl', 'supabaseKey'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Fehlende Environment Variables:', missingVars);
  process.exit(1);
}

// Supabase Client initialisieren
const supabase = createClient(supabaseUrl, supabaseKey);

// Funktion zum Abrufen und Aktualisieren der Hausaufgaben-Daten von Supabase
async function fetchAndCacheHausaufgaben() {
  try {
    console.log('Aktualisiere Hausaufgaben-Daten von Supabase...');
    // Passe den Tabellennamen ggf. an!
    const { data, error } = await supabase
      .from('Hausaufgaben')
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      cachedData = {
        success: true,
        data: data,
        timestamp: new Date().toISOString(),
        source: 'supabase-live'
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

// ...der Rest deines Codes bleibt gleich, außer dem Live-Endpoint unten...

// Ersetze den Live-Endpoint für /api/hausaufgaben durch Supabase:
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

// Entferne den alten Firebase-Live-Endpoint (zweites /api/hausaufgaben)!

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
  console.log(`Supabase Project: ${process.env.supabaseUrl}`);
});