import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';
import type { Feature } from 'geojson';

const zoom: number = 19;
const map: L.Map = L.map('map').setView([34.8436, -82.3940], zoom);

//Add map layer using arcgis rest api (https://developers.arcgis.com/rest/)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: zoom,
}).addTo(map);

// const marker: L.CircleMarker = L.circleMarker([34.8436, -82.3940], { radius: 8 }).addTo(map);

const input = document.querySelector<HTMLInputElement>('#address')!;
const button = document.querySelector<HTMLButtonElement>('#search')!;

// A point on the map in degrees. (Leaflet and ArcGIS don't take the same input)
// Leaflet - [lat, lng]
// ArcGIS - [lng, lat]
interface LatLng {
  lat: number;
  lng: number;
}

// A point with a cleaned up address. Before, the address would land on the street outside of any parcels.
interface GeocodeResult extends LatLng {
    matched: string;
}


async function geocode(address: string): Promise<GeocodeResult | null> 
{
    const url = '/geocode/geocoder/locations/onelineaddress' + '?address=' + encodeURIComponent(address) + '&benchmark=Public_AR_Current&format=json';
    const response = await fetch(url);
    const data = await response.json();
    const matches = data.result.addressMatches;
    if (matches.length === 0){
	return null;
    }
    return {
	lat: matches[0].coordinates.y, lng: matches[0].coordinates.x, matched: matches[0].matchedAddress,
    };
}

//Parcels

const PARCEL_URL = 'https://citygis.greenvillesc.gov/arcgis/rest/services/AddressSearch/Property/MapServer/3/query';
const ADDRESS_URL = 'https://citygis.greenvillesc.gov/arcgis/rest/services/AddressSearch/Property/MapServer/0/query';

async function queryPoint(layerUrl: string, lat: number, lng: number): Promise<Feature | null>
{
    const params = new URLSearchParams({
	geometry: `${lng}, ${lat}`,
	geometryType: 'esriGeometryPoint',
	inSR: '4326',
	spatialRel: 'esriSpatialRelIntersects',
	outFields: '*',
	returnGeometry: 'true',
	outSR: '4326',
	f: 'geojson',
    });
    const response = await fetch(`${layerUrl}?${params}`);
    const data = await response.json();
    return data.features.length > 0 ? data.features[0] : null;
}

async function addressPointLookup(matched: string): Promise<LatLng | null> {
    const street = matched.split(',')[0].trim().toUpperCase().replace(/'/g, "''");
    const params = new URLSearchParams({
        where: `UPPER(FULLADDRESS) LIKE '${street}%'`,
        outFields: 'FULLADDRESS',
        returnGeometry: 'true',
        outSR: '4326',
        resultRecordCount: '1',
        f: 'geojson',
    });
    const response = await fetch(`${ADDRESS_URL}?${params}`);
    const data = await response.json();
    if (!data.features || data.features.length === 0) {
        return null;
    }
    const [lng, lat] = data.features[0].geometry.coordinates;  // GeoJSON order is [lng, lat]
    return { lat, lng };
}

let parcelLayer: L.GeoJSON | null = null;

async function showParcelAt(lat: number, lng: number): Promise <boolean>
{
    const parcel = await queryPoint(PARCEL_URL, lat, lng);
    if (parcelLayer){
	parcelLayer.remove();
    }
    parcelLayer = null;
    if (parcel === null){
	return false;
    }
    parcelLayer = L.geoJSON(parcel, {
	style: { color: 'yellow', weight: 3, fillOpacity: 0.15 },
    }).addTo(map);
    return true;
}

map.on('click', async (e: L.LeafletMouseEvent) => {
    try {
	await showParcelAt(e.latlng.lat, e.latlng.lng);
    } catch (error) {
	console.error(error);
    }
});

button.addEventListener('click', async () => {
    if (input.value.trim() === ''){
	alert('Type an address first');
	return;
    }
    try {
	const result = await geocode(input.value);
	if (result === null){
	    alert('Address not found');
	    return;
	}
	const exact = await addressPointLookup(result.matched);
	const point: LatLng = exact ?? result;
	marker.setLatLng([point.lat, point.lng]);
	const found = await showParcelAt(point.lat, point.lng);
        if (found && parcelLayer) {
	map.fitBounds(parcelLayer.getBounds(), { maxZoom: 19 });
    }
    else {
	map.setView([result.lat, result.lng], 19);
	alert('Found the address, but no parcel at that point');
    }
    } catch (error) {
	console.error(error);
	alert('Something went wrong looking up that address');
    }
});

