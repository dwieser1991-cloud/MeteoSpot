# MeteoSpot

A small weather web app built with plain HTML, CSS and JavaScript (no framework, no backend).
It shows the current temperature for your own location and for any place you search for, together with a map.

> Training project created during the retraining as an IT specialist for application development (Fachinformatiker/in für Anwendungsentwicklung).

**Live demo:** https://dwieser1991-cloud.github.io/MeteoSpot

## Features

- Place search with a selectable list of results
- Current temperature for the selected place
- Automatic detection of your own location (browser geolocation) with place name
- Two independent display areas: "My location" and "Selected place"
- Map with a marker for the selected place
- Loading and error messages (e.g. no result, location denied, no connection)
- Responsive layout for smartphone and desktop

## Planned

- 7-day forecast
- Optional: packing recommendations based on the forecast (e.g. umbrella when rain is likely)

## Tech stack

- HTML5, CSS3 (Flexbox, media queries)
- JavaScript (ES6+, `fetch`, `async`/`await`)
- [Leaflet](https://leafletjs.com/) for the map (library, loaded via CDN)

## Data sources and attribution

| Purpose | Source |
|---|---|
| Weather data and place search | [Open-Meteo](https://open-meteo.com/) |
| Place data (search) | [GeoNames](https://www.geonames.org/) |
| Place name of your own location | [Photon](https://photon.komoot.io/) |
| Map data and tiles | © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) |

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a browser.

Note: Browsers only allow geolocation on HTTPS pages or on `localhost`.
If the location feature does not work when opening the file directly, use a local server (e.g. the VS Code extension "Live Server") or the live demo.

## Project structure

```
index.html   page structure
main.css     styling
script.js    search, API requests, geolocation, map
```

## Scope

Not part of this project: own backend server, database, user accounts and offline mode.
