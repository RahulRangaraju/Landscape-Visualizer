import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';

const zoom: number = 19;
const map: L.Map = L.map('map').setView([34.8436, -82.3940], zoom);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: zoom,
}).addTo(map);

L.circleMarker([34.8436, -82.3940], { radius: 8 }).addTo(map);

const marker: L.CircleMarker = L.circleMarker([34.8436, -82.3940], { radius: 8 }).addTo(map);

const input = document.querySelector<HTMLInputElement>('#address')!;
const button = document.querySelector<HTMLButtonElement>('#search')!;

interface LatLng {
  lat: number;
  lng: number;
}

async function geocode(address: string): Promise<LatLng | null> {
    const url = '/geocode/geocoder/locations/onelineaddress' + '?address=' + encodeURIComponent(address) + '&benchmark=Public_AR_Current&format=json';
    const response = await fetch(url);
    const data = await response.json();
    const matches = data.result.addressMatches;
    if (matches.length === 0){
	return null;
    }
    return {
	lat: matches[0].coordinates.y, lng: matches[0].coordinates.x
    };
}

button.addEventListener('click', async () => {
    if (input.value.trim() === ''){
	alert('Type an adress first');
	return;
    }
    try {
	const result = await geocode(input.value);
	if (result === null){
	    alert('Address not found');
	    return;
	}
    map.setView([result.lat, result.lng], zoom);
    marker.setLatLng([result.lat, result.lng]);
    } catch (error) {
	console.error(error);
	alert('Something went wrong looking up that address');
    }
});

