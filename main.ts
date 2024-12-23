// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

interface Cell {
  readonly i: number;
  readonly j: number;
}

class GridCell {
  private cells: Map<string, Cell> = new Map();

  getCell(lat: number, lng: number): Cell {
    const i = Math.floor(lat * 10000);
    const j = Math.floor(lng * 10000);

    const key = `${i}:${j}`;

    if (!this.cells.has(key)) {
      this.cells.set(key, { i, j });
    }

    return this.cells.get(key)!;
  }
}

const gridCellFactory = new GridCell();

const latLng = leaflet.latLng(36.9995, -122.0533);

const cell = gridCellFactory.getCell(latLng.lat, latLng.lng);
console.log(cell);

const sameCell = gridCellFactory.getCell(latLng.lat, latLng.lng);
console.log(cell === sameCell);

const anotherlatlng = leaflet.latLng(36.9994, -122.0532);
const anotherCell = gridCellFactory.getCell(
  anotherlatlng.lat,
  anotherlatlng.lng,
);
console.log(anotherCell);

const title = document.createElement("h1");
title.textContent = "Eder's GeoCoins";
document.body.appendChild(title);

// Location of the classroom
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("This is You!!");
playerMarker.addTo(map);

// Display the player's coins
let playerCoins = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins 😔";

// assign serial numbers to coins
let cacheSerial = 0;

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds, {
    className: "cool-cache-box",
  });
  rect.addTo(map);

  // function to update the player's coins on the status panel (used in popupDiv)
  function updateStatusPanel() {
    statusPanel.innerHTML = `Player Coins: ${playerCoins}`;
  }

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random point value, mutable by the player
    let cacheCoins = Math.floor(luck([i, j, "initialCoins"].toString()) * 50);
    const cacheSerials: { i: number; j: number; serial: number }[] = [];

    for (let k = 0; k < cacheCoins; k++) {
      cacheSerials.push({ i, j, serial: cacheSerial++ });
    }

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>Cache at "${i},${j}" - Coins: <span id="cacheCoins">${cacheCoins}</span></div>
      <button id="collect" class="button-collect">Collect</button>
      <button id="deposit" class="button-deposit" ${
      playerCoins > 0 ? "" : "disabled"
    }>Deposit</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        if (cacheCoins > 0) {
          cacheCoins--;
          playerCoins++;
          popupDiv.querySelector<HTMLSpanElement>("#cacheCoins")!.textContent =
            cacheCoins.toString();
          updateStatusPanel();
        }
      });

    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerCoins > 0) {
          cacheCoins++;
          playerCoins--;
          popupDiv.querySelector<HTMLSpanElement>("#cacheCoins")!.textContent =
            cacheCoins.toString();
          updateStatusPanel();
          popupDiv.querySelector<HTMLButtonElement>("#deposit")!.disabled =
            playerCoins === 0;
        }
      });

    return popupDiv;
  });
}

// Look around the player's neighborhood for caches to spawn
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // If location i,j is lucky enough, spawn a cache!
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
