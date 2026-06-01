"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { TrackingEvent } from "@/lib/api";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface MapProps {
  currentLocation?: [number, number];
  events?: TrackingEvent[];
}

export default function Map({ currentLocation, events }: MapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [2.3522, 48.8566],
      zoom: 3,
    });
    
    mapRef.current = map;

    return () => map.remove();
  }, []);

  // Update map and markers when data changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (events && events.length > 0) {
      let isFirstValidEvent = true;

      // Add markers for each event
      events.forEach((event) => {
        if (!event.coordinates) return; // Skip if no coordinates

        const isLatest = isFirstValidEvent;
        isFirstValidEvent = false;
        
        // Create custom element for the marker
        const el = document.createElement('div');
        el.className = isLatest 
          ? 'relative w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-lg cursor-pointer z-10' 
          : 'w-4 h-4 bg-slate-400 rounded-full border-2 border-white shadow cursor-pointer';
        
        // Add a pulse animation to the latest location
        if (isLatest) {
          const pulse = document.createElement('div');
          pulse.className = 'absolute -inset-2 bg-blue-500 rounded-full opacity-50 animate-ping';
          el.appendChild(pulse);
        }

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(event.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false, className: 'tracking-popup' })
              .setHTML(
                `<div class="p-2 font-sans">
                  <p class="font-bold text-sm text-slate-900">${event.location}</p>
                  <p class="text-xs text-slate-600">${event.description}</p>
                  <p class="text-xs text-slate-400 mt-1">${new Date(event.date).toLocaleString('fr-FR')}</p>
                </div>`
              )
          )
          .addTo(map);
          
        markersRef.current.push(marker);
      });

      // Fit bounds to all coordinates
      const validEvents = events.filter(e => e.coordinates);
      if (validEvents.length > 1) {
        const bounds = new mapboxgl.LngLatBounds(
          validEvents[0].coordinates,
          validEvents[0].coordinates
        );
        validEvents.forEach(event => bounds.extend(event.coordinates!));
        map.fitBounds(bounds, { padding: 50, maxZoom: 10 });
      } else if (currentLocation) {
        map.flyTo({ center: currentLocation, zoom: 10 });
      }
    } else if (currentLocation) {
      map.flyTo({ center: currentLocation, zoom: 10 });
    }
  }, [events, currentLocation]);

  return <div ref={mapContainer} className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden shadow-xl border border-slate-800" />;
}