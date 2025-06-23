document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('formMeteo'); // Seleziona il form di ricerca
  const inputCitta = document.getElementById('inputCitta'); // Input dove l'utente inserisce la città
  const risultato = document.getElementById('risultatoMeteo'); // Contenitore dei dati meteo
  const animazione = document.getElementById('animazioneMeteo'); // Contenitore dell'icona meteo

  // Oggetto con le API usate
  const api = {
    // API per ottenere le coordinate (lat, lon) da una città usando OpenStreetMap
    geocode: c =>
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(c)}`,
    
    // API per ottenere i dati meteo attuali e l'indice UV da Open-Meteo
    meteo: (lat, lon) =>
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=uv_index&timezone=auto`
  };

  // Quando il form viene inviato (submit)
  form.addEventListener('submit', e => {
    e.preventDefault(); // Evita il ricaricamento della pagina
    ottieniMeteo(inputCitta.value.trim()); // Lancia la richiesta meteo con la città inserita
  });

  // Funzione principale per ottenere e mostrare i dati meteo
  async function ottieniMeteo(citta) {
    if (!citta) {
      mostraMessaggio('Inserisci una città!'); // Se l'input è vuoto, mostra un messaggio
      return;
    }

    try {
      // 1. Geocoding → Ottiene latitudine e longitudine dalla città
      const geo = await fetchJson(api.geocode(citta), { 'User-Agent': 'meteo-demo' });
      if (!geo.length) {
        mostraMessaggio('❌ Città non trovata');
        return;
      }

      const { lat, lon, display_name } = geo[0]; // Estrae dati dalla risposta

      // 2. Dati meteo correnti + indice UV
      const dati = await fetchJson(api.meteo(lat, lon));
      const meteo = dati.current_weather;

      // Calcola l'indice UV per l'ora corrente
      let uvIndex = '—';// Valore predefinito se non disponibile
      if (dati.hourly?.time && dati.hourly?.uv_index) {// Controlla se i dati hourly sono disponibili
        const oraIso = new Date().toISOString().slice(0, 13); // Ottiene l'ora corrente in formato ISO (YYYY-MM-DDTHH)
        const idx = dati.hourly.time.findIndex(t => t.startsWith(oraIso));// Trova l'indice dell'ora corrente
        if (idx !== -1) uvIndex = Number(dati.hourly.uv_index[idx]).toFixed(1);// Ottiene l'indice UV per quell'ora
      }

      // Formatta le coordinate con solo due decimali
      const latLonText = `${parseFloat(lat).toFixed(2)}, ${parseFloat(lon).toFixed(2)}`;

      // Mostra l'icona meteo dinamica usando Font Awesome
      animazione.innerHTML = `<i class="fa-solid ${codiceToIcon(meteo.weathercode)}"></i>`;

      // Mostra le informazioni meteo nella sezione risultato
      risultato.innerHTML = `
        <h2>${display_name.split(',')[0]}</h2>
        <p><span><i class="fa-solid fa-thermometer-half"></i> Temperatura</span><span>${meteo.temperature} °C</span></p>
        <p><span><i class="fa-solid fa-wind"></i> Vento</span><span>${meteo.windspeed} km/h</span></p>
        <p><span><i class="fa-solid fa-cloud"></i> Condizioni</span><span>${descrizioneCondizione(meteo.weathercode)}</span></p>
        <p><span><i class="fa-solid fa-compass"></i> Direzione vento</span><span>${meteo.winddirection}°</span></p>
        <p><span><i class="fa-solid fa-sun"></i> Indice UV</span><span>${uvIndex}</span></p>
        <p><span><i class="fa-solid fa-location-dot"></i> Coordinate</span><span>${latLonText}</span></p>
      `;

      // Cambia lo sfondo dinamicamente in base al meteo
      aggiornaTema(meteo.weathercode, meteo.temperature);

    } catch (err) {
      console.error(err); // Log errore in console
      mostraMessaggio('Si è verificato un errore nel recupero dei dati.');
    }
  }

  // Funzione helper per fare una fetch e restituire JSON
  const fetchJson = async (url, headers = {}) => {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(res.status);// Controlla se la risposta è OK
    return res.json();// Restituisce il JSON della risposta
  };

  // Mostra un messaggio di errore o avviso all'utente
  const mostraMessaggio = msg => {
    animazione.innerHTML = '';
    risultato.innerHTML = `<p style="text-align:center">${msg}</p>`;
  };

  // Mappa i codici meteo in icone Font Awesome
  function codiceToIcon(c) {
    if (c === 0) return 'fa-sun'; // Sereno
    if (c >= 1 && c <= 3) return 'fa-cloud-sun'; // Parzialmente nuvoloso
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'fa-cloud-showers-heavy'; // Pioggia
    if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return 'fa-snowflake'; // Neve
    if (c >= 95 && c <= 99) return 'fa-poo-storm'; // Temporale
    return 'fa-question'; // Non riconosciuto
  }

  // Mappa i codici meteo in descrizioni testuali
  function descrizioneCondizione(c) {
    if (c === 0) return 'Sereno';
    if (c >= 1 && c <= 3) return 'Nuvoloso';
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'Pioggia';
    if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return 'Neve';
    if (c >= 95 && c <= 99) return 'Temporale';
    return '–';
  }

  // Cambia dinamicamente il background del body in base al meteo
  const aggiornaTema = (code, temp) => {
    if (temp >= 35) {
      document.body.style.background = 'var(--grad-fire)'; // Molto caldo
      return;
    }
    if (temp >= 30) {
      document.body.style.background = 'var(--grad-hot)'; // Caldo
      return;
    }
    if (temp <= 0) {
      document.body.style.background = 'var(--grad-ice)'; // Gelo
      return;
    }

    // Default: cielo
    let bg = 'var(--grad-sky)';

    // Condizione sereno
    if (code === 0) {
      bg = 'var(--grad-dusk)';
    }
    // Condizione pioggia
    else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      bg = 'var(--grad-rain)';
    }
    // Condizione temporale
    else if (code >= 95 && code <= 99) {
      bg = 'var(--grad-night)';
    }

    document.body.style.background = bg; // Applica il gradiente selezionato
  };
});
