// 1. HTML-Elemente und gespeicherte Werte
const searchInput = document.getElementById('city-search');
const citySelect = document.getElementById('city-results');
const resultsGroup = document.getElementById('city-results-group');
const searchStatus = document.getElementById('search-status');

// Bereich "Gewählter Ort"
const selectedBlock = document.getElementById('selected-block');
const cityName = document.getElementById('city-name');
const weatherElement = document.getElementById('weather');

// Bereich "Mein Standort"
const ownCityName = document.getElementById('own-city-name');
const ownWeather = document.getElementById('own-weather');

let cities = [];
let map = null;     // Leaflet-Karte, wird beim ersten Ort angelegt
let marker = null;  // Marker auf der Karte

// 2. Hilfsfunktionen: Daten holen, Ortsnamen zusammensetzen, Karte anzeigen
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('HTTP-Fehler: ' + response.status);
    }
    return await response.json();
}

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

// 3. Ort suchen: Enter startet die Anfrage, die Treffer kommen ins Dropdown
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchCities();
    }
});

searchInput.addEventListener('input', function() {
    resultsGroup.hidden = true;
});

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
    const url = 'https://geocoding-api.open-meteo.com/v1/search'
        + '?name=' + encodeURIComponent(query) + '&count=5&language=de';

    try {
        const data = await fetchJson(url);
        cities = data.results || [];
        for (let i = 0; i < cities.length; i++) {
            const city = cities[i];
            const label = getCityLabel(city.name, city.admin1, city.country);
            citySelect.add(new Option(label, String(i)));
        }
        if (cities.length === 0) {
            searchStatus.textContent = 'Keinen Ort gefunden.';
        } else {
            resultsGroup.hidden = false;
            searchStatus.textContent = 'Wähle einen Ort im Dropdown.';
        }
    } catch (error) {
        console.error(error);
        searchStatus.textContent = 'Die Ortssuche ist fehlgeschlagen.';
    }
    searchInput.disabled = false;
    searchInput.focus();
}

// 4. Auswahl im Dropdown: Ortsname anzeigen, Wetter laden, Karte setzen
citySelect.addEventListener('change', function() {
    if (citySelect.disabled || citySelect.value === '') return;
    const city = cities[Number(citySelect.value)];
    if (!city) return;
    selectedBlock.hidden = false; // Muss vor showMap stehen, sonst wird die Karte falsch dargestellt.
    cityName.textContent = getCityLabel(city.name, city.admin1, city.country);
    fetchWeather(city.latitude, city.longitude, weatherElement);
    showMap(city.latitude, city.longitude);
});

// 5. Aktuelle Temperatur laden und im übergebenen Zielelement anzeigen
async function fetchWeather(latitude, longitude, target) {
    // Das Dropdown wird nur gesperrt, wenn der gewählte Ort geladen wird.
    const isSelected = (target === weatherElement);
    if (isSelected) citySelect.disabled = true;

    target.textContent = 'Wetterdaten werden geladen …';
    target.classList.add('loading');
    target.classList.remove('error');
    const url = 'https://api.open-meteo.com/v1/forecast'
        + '?latitude=' + latitude + '&longitude=' + longitude
        + '&current=temperature_2m&temperature_unit=celsius';

    try {
        const data = await fetchJson(url);
        const temperature = data.current.temperature_2m;
        const unit = data.current_units.temperature_2m;
        if (!Number.isFinite(temperature) || typeof unit !== 'string') {
            throw new Error('Keine gültige Temperatur erhalten.');
        }
        const display = document.createElement('div');
        display.className = 'temp-display';
        display.textContent = temperature.toLocaleString('de-DE') + ' ' + unit;
        target.replaceChildren(display);
    } catch (error) {
        console.error(error);
        target.textContent = 'Wetterdaten konnten nicht geladen werden.';
        target.classList.add('error');
    }
    target.classList.remove('loading');
    if (isSelected) citySelect.disabled = false;
}

// 6. Eigener Standort: Der Browser liefert Koordinaten, Photon den Ortsnamen
async function showOwnLocation(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    ownCityName.textContent = 'Standortname wird geladen …';
    fetchWeather(latitude, longitude, ownWeather);
    const url = 'https://photon.komoot.io/reverse'
        + '?lat=' + latitude + '&lon=' + longitude + '&lang=de&limit=1';

    try {
        const data = await fetchJson(url);
        const place = data.features[0].properties;
        let name = place.city;
        if (!name && place.type === 'city') name = place.name;
        if (!name) name = place.district;
        if (!name) throw new Error('Keinen Ortsnamen gefunden.');
        ownCityName.textContent = getCityLabel(name, place.state, place.country);
    } catch (error) {
        console.error(error);
        ownCityName.textContent = 'Standortname nicht verfügbar';
    }
}

function locationError(error) {
    if (error) console.error(error);
    ownCityName.textContent = 'Standort nicht verfügbar';
    ownWeather.textContent = 'Bitte erlaube den Standortzugriff oder nutze die Ortssuche.';
    ownWeather.classList.remove('loading');
}

// Beim Laden der Seite einmal den aktuellen Standort anfragen
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showOwnLocation, locationError, { timeout: 10000 });
} else {
    locationError();
}