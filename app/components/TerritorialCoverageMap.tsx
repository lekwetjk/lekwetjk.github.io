"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

type CoverageRegion = {
  name: string;
  specialist: string;
  phone: string;
  email: string;
  coverage: string;
  latitude: number;
  longitude: number;
  color: string;
};

const regions: CoverageRegion[] = [
  { name: "Zachodniopomorskie", specialist: "Mateusz Grzelak", phone: "698 630 689", email: "m.grzelak@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 53.7, longitude: 15.6, color: "#d95d39" },
  { name: "Pomorskie", specialist: "Mateusz Grzelak", phone: "698 630 689", email: "m.grzelak@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 54.2, longitude: 18.3, color: "#3d7c70" },
  { name: "Warmińsko-mazurskie", specialist: "Mateusz Grzelak / Agnieszka Sobierajska", phone: "698 630 689 / 698 630 696", email: "m.grzelak@krd-ig.pl / a.sobierajska@krd-ig.pl", coverage: "iławski, nowomiejski, Miłomłyn oraz pozostałe powiaty wskazane w tabeli", latitude: 53.8, longitude: 20.8, color: "#e0a458" },
  { name: "Podlaskie", specialist: "Agnieszka Sobierajska", phone: "698 630 696", email: "a.sobierajska@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 53.3, longitude: 23.2, color: "#6d7cbd" },
  { name: "Lubuskie", specialist: "Wojciech Suchocki", phone: "698 630 697", email: "w.suchocki@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 52.2, longitude: 15.5, color: "#b45f8c" },
  { name: "Kujawsko-pomorskie", specialist: "Mateusz Grzelak", phone: "698 630 689", email: "m.grzelak@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 53.1, longitude: 18.2, color: "#5d8fbd" },
  { name: "Mazowieckie", specialist: "Marta Pałyszka / Krzysztof Winiarski / Agnieszka Sobierajska", phone: "698 630 692 / 698 630 695 / 698 630 696", email: "m.palyszka@krd-ig.pl / k.winiarski@krd-ig.pl / a.sobierajska@krd-ig.pl", coverage: "podział według powiatów wskazany w tabeli", latitude: 52.3, longitude: 21.0, color: "#8caa5d" },
  { name: "Wielkopolskie", specialist: "Wojciech Suchocki / Krzysztof Winiarski", phone: "698 630 697 / 698 630 695", email: "w.suchocki@krd-ig.pl / k.winiarski@krd-ig.pl", coverage: "podział według powiatów wskazany w tabeli", latitude: 52.3, longitude: 17.2, color: "#d47b45" },
  { name: "Łódzkie", specialist: "Agnieszka Sobierajska", phone: "698 630 696", email: "a.sobierajska@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 51.7, longitude: 19.5, color: "#497e78" },
  { name: "Dolnośląskie", specialist: "Krzysztof Winiarski", phone: "698 630 695", email: "k.winiarski@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 51.0, longitude: 16.2, color: "#bc6689" },
  { name: "Opolskie", specialist: "Łukasz Kozak", phone: "698 630 694", email: "l.kozak@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 50.6, longitude: 17.9, color: "#d19b4a" },
  { name: "Śląskie", specialist: "Krzysztof Winiarski", phone: "698 630 695", email: "k.winiarski@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 50.3, longitude: 19.0, color: "#587ca9" },
  { name: "Lubelskie", specialist: "Marta Pałyszka", phone: "698 630 692", email: "m.palyszka@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 51.2, longitude: 22.6, color: "#879e5c" },
  { name: "Świętokrzyskie", specialist: "Marta Pałyszka", phone: "698 630 692", email: "m.palyszka@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 50.8, longitude: 20.7, color: "#d06242" },
  { name: "Małopolskie", specialist: "Marta Pałyszka / Krzysztof Winiarski", phone: "698 630 692 / 698 630 695", email: "m.palyszka@krd-ig.pl / k.winiarski@krd-ig.pl", coverage: "podział według powiatów wskazany w tabeli", latitude: 49.9, longitude: 20.1, color: "#4d817a" },
  { name: "Podkarpackie", specialist: "Marta Pałyszka", phone: "698 630 692", email: "m.palyszka@krd-ig.pl", coverage: "wszystkie powiaty", latitude: 49.9, longitude: 22.4, color: "#6d78b2" },
];

export function TerritorialCoverageMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("leaflet").then(({ default: L }) => {
      if (!isMounted || !mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([52.1, 19.4], 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      regions.forEach((region) => {
        L.circleMarker([region.latitude, region.longitude], {
          radius: 16,
          color: "#fff",
          weight: 3,
          fillColor: region.color,
          fillOpacity: 0.9,
        })
          .bindTooltip(
            `<strong>${region.name}</strong><br>${region.specialist}<br>${region.phone}<br>${region.email}<br><small>${region.coverage}</small>`,
            { direction: "top", opacity: 0.97, sticky: true },
          )
          .addTo(map);
      });

      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      isMounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section className="territorial-map-section" aria-labelledby="territorial-map-title">
      <div className="territorial-map-heading">
        <div>
          <p className="eyebrow">Mapa obszarów</p>
          <h3 id="territorial-map-title">Terytorialny zasięg specjalistów</h3>
        </div>
      </div>
      <div ref={mapContainerRef} className="territorial-map-frame territorial-map-osm" aria-label="Mapa Polski OpenStreetMap" />
      <p className="territorial-map-note">Najedź na kolorowy punkt, aby zobaczyć osobę odpowiedzialną i zakres obsługi.</p>
    </section>
  );
}
