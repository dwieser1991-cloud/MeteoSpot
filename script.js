//HTML-Elemente damit JavaScript später darauf zugreifen und Inhalte verändern kann
const searchInput = document.getElementById('city-search');
const citySelect = document.getElementById('city-results');
const resultsGroup = document.getElementById('city-results-group');
const searchStatus = document.getElementById('search-status');

// Ausgewählter Ort
const selectedBlock = document.getElementById('selected-block');
const cityName = document.getElementById('city-name');
const weatherElement = document.getElementById('weather');

// Mein Standort
const ownCityName = document.getElementById('own-city-name');
const ownWeather = document.getElementById('own-weather');

//Wetterbasierter Hintergrund
const weatherbg = document.getElementById('weather-bg');

//Globale Variablen
let cities = [];
let map = null;     // Leaflet-Karte, wird beim ersten Ort angelegt
let marker = null;  // Marker auf der Karte

//Hilfsfunktionen
// Daten fetchen, Ortsnamen zusammensetzen, Karte anzeigen
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('HTTP-Fehler: ' + response.status);
    }
    return await response.json();
}
//Formatiert den Namen eines Ortes indem Region und Land angehängt werden
function getCityLabel(name, region, country) {
    let label = name;
    if (region && region !== name) {
        label += ', ' + region;
    }
    if (country) {
        label += ', ' + country;
    }
    return label;
}
//Wählt entsprechend dem Open-Meteo-Wettercode das korrekte Video.
function setBackgroundVideo(code) {
    let file = '';
    if (code <= 1) {
        file = 'videos/sunny.mp4';
    } else if (code <= 48) {
        file = 'videos/cloudy.mp4';
    } else if (code <= 67 || (code >= 80 && code <= 82) || code >= 95) {
        file = 'videos/rain.mp4';
    }
    //Wird kein Video in einer file gefunden, wird das Element versteckt.
    weatherbg.hidden = (file === '');
    //Gibt es schon ein Video und läuft es aktuell?
    if (file !== '' && !weatherbg.src.endsWith(file)) {
        weatherbg.src = file;
    }
}
//Initialisiert beim ersten Aufruf die Leaflet-Karte
function showMap(latitude, longitude) {
    if (typeof L === 'undefined') return; // Leaflet konnte nicht geladen werden
    if (map === null) {
        map = L.map('map').setView([latitude, longitude], 10);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap-Mitwirkende'
        }).addTo(map);
        marker = L.marker([latitude, longitude]).addTo(map);
    } else {
        map.setView([latitude, longitude], 10);
        marker.setLatLng([latitude, longitude]);
    }
}
//Ortssuche
//Ortssuche startet bei Enter
searchInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchCities();
    }
});

searchInput.addEventListener('input', function () {
    resultsGroup.hidden = true;
});
//Ortssuche
//Vorprüfung & Validierung
async function searchCities() {
    if (searchInput.disabled) return;
    const query = searchInput.value.trim();
    resultsGroup.hidden = true;
    if (query.length < 3) {
        searchStatus.textContent = 'Bitte mindestens drei Buchstaben eingeben.';
        return;
    }

    searchInput.disabled = true;
    searchStatus.textContent = 'Orte werden gesucht …';
    citySelect.replaceChildren(new Option('Bitte einen Ort auswählen …', ''));
    //API-Abfrage
    const url = 'https://geocoding-api.open-meteo.com/v1/search'
        + '?name=' + encodeURIComponent(query) + '&count=5&language=de';

    try {
        const data = await fetchJson(url);
        //Wurden Orte gefunden? Schleife beginnt.
        cities = data.results || [];
        for (let i = 0; i < cities.length; i++) {
            const city = cities[i];
            //Für jeden gefundenen Ort wird ein Label erstellt und es ins Dropdown-Menü eingefügt.
            const label = getCityLabel(city.name, city.admin1, city.country);
            citySelect.add(new Option(label, String(i)));
        }   //Keine Treffer
        if (cities.length === 0) {
            searchStatus.textContent = 'Keinen Ort gefunden.';
        } else {
            resultsGroup.hidden = false;
            searchStatus.textContent = 'Wähle einen Ort im Dropdown.';
        } //API nicht mehr erreichbar, dann folgende Meldung:
    } catch (error) {
        console.error(error);
        searchStatus.textContent = 'Die Ortssuche ist fehlgeschlagen.';
    } //Gesperrtes Eingabefeld wird am Ende wieder freigeschaltet.
    searchInput.disabled = false;
    searchInput.focus();
}

// Auswahl im Dropdown (Ortsname anzeigen, Wetter laden, Karte setzen)
citySelect.addEventListener('change', function () {
    if (citySelect.disabled || citySelect.value === '') return;
    const city = cities[Number(citySelect.value)];
    if (!city) return;
    selectedBlock.hidden = false; // Muss vor showMap stehen, sonst wird die Karte falsch dargestellt.
    cityName.textContent = getCityLabel(city.name, city.admin1, city.country);
    fetchWeather(city.latitude, city.longitude, weatherElement);
    showMap(city.latitude, city.longitude);
});
//Wetterdaten
//Aktuelle Temperatur laden und im übergebenen Zielelement anzeigen
async function fetchWeather(latitude, longitude, target) {
    // Das Dropdown wird nur gesperrt, wenn der gewählte Ort geladen wird.
    const isSelected = (target === weatherElement);
    if (isSelected) citySelect.disabled = true;

    target.textContent = 'Wetterdaten werden geladen …';
    //Fügt die CSS-Klasse "loading" hinzu.
    target.classList.add('loading');
    //Entfernt die ggf. vorhandene Error-Klasse
    target.classList.remove('error');
    const url = 'https://api.open-meteo.com/v1/forecast'
        + '?latitude=' + latitude + '&longitude=' + longitude
        + '&current=temperature_2m,weather_code&temperature_unit=celsius';
    //Try&Catch für ExceptionHandling (Verhindern das Laufzeitfehler Programm abstürzt)
    try {
        //Daten werden ausgelesen
        const data = await fetchJson(url);
        const temperature = data.current.temperature_2m;
        const unit = data.current_units.temperature_2m;
        if (!Number.isFinite(temperature) || typeof unit !== 'string') {
            throw new Error('Keine gültige Temperatur erhalten.');
        }
        //Setzt Hintergrundvideo anhand von aktuellem Wettercode
        setBackgroundVideo(data.current.weather_code);
        //Daten erfolgreich aufgerufen und werden angezeigt.
        const display = document.createElement('div');
        display.className = 'temp-display';
        display.textContent = temperature.toLocaleString('de-DE') + ' ' + unit;
        target.replaceChildren(display);
        //Fehleranzeige falls Error existiert.
    } catch (error) {
        console.error(error);
        target.textContent = 'Wetterdaten konnten nicht geladen werden.';
        target.classList.add('error');
    }
    target.classList.remove('loading');
    //Dropdown wird wieder entsperrt.
    if (isSelected) citySelect.disabled = false;
}

// Eigener Standort: Der Browser liefert Koordinaten, Photon den Ortsnamen
async function showOwnLocation(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    ownCityName.textContent = 'Standortname wird geladen …';
    fetchWeather(latitude, longitude, ownWeather);
    const url = 'https://photon.komoot.io/reverse'
        + '?lat=' + latitude + '&lon=' + longitude + '&lang=de&limit=1';
    //Empfängt Geodaten. Liest und wertet sie aus
    try {
        const data = await fetchJson(url);
        const place = data.features[0].properties;
        //Nimmt aktuellen Stadtnamen falls vorhanden.
        let name = place.city;
        if (!name && place.type === 'city') name = place.name;
        //Falls nicht dann Stadtteil.
        if (!name) name = place.district;
        //Falls gar nichts gefunden wurde.
        if (!name) throw new Error('Keinen Ortsnamen gefunden.');
        //Wenn gefunden wird er wie hier geshrieben angezeigt.
        ownCityName.textContent = getCityLabel(name, place.state, place.country);
        //Nicht erreichbar? Wird dieser Error ausgeworfen.
    } catch (error) {
        console.error(error);
        ownCityName.textContent = 'Standortname nicht verfügbar';
    }
}

function locationError(error) {
    if (error) console.error(error);
    ownCityName.textContent = 'Standort nicht verfügbar';
    let message = 'Bitte nutze die Ortssuche.';
    if (error && error.code === 1) {
        message = 'Der Standortzugriff wurde verweigert. Bitte erlaube ihn im Browser oder nutze die Ortssuche.';
    } else if (error && error.code === 3) {
        message = 'Die Standortermittlung hat zu lange gedauert. Bitte nutze die Ortssuche.';
    }
    ownWeather.textContent = message;
    ownWeather.classList.remove('loading');
}

// Beim Seitenaufruf den Standort abfragen, bei Fehlschlag Meldung anzeigen
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showOwnLocation, locationError, { timeout: 10000 });
} else {
    locationError();
}