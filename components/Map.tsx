"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import { TrackingEvent } from "@/lib/api";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface MapProps {
  currentLocation?: [number, number];
  events?: TrackingEvent[];
  destination?: {
    label: string;
    coordinates: [number, number];
  };
  origin?: {
    label: string;
    coordinates: [number, number];
  };
  status?: string;
}

// IDs des sources et layers Mapbox pour pouvoir les nettoyer
const PAST_LINE_SOURCE = 'past-route-source';
const PAST_LINE_LAYER = 'past-route-layer';
const FUTURE_LINE_SOURCE = 'future-route-source';
const FUTURE_LINE_LAYER = 'future-route-layer';

export default function Map({ currentLocation, events, destination, origin, status }: MapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapLoadedRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [2.3522, 48.8566],
      zoom: 3,
    });

    map.on('load', () => {
      mapLoadedRef.current = true;
    });

    mapRef.current = map;

    return () => {
      mapLoadedRef.current = false;
      map.remove();
    };
  }, []);

  // Update map when data changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const updateMap = () => {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Clean up existing layers and sources
      [PAST_LINE_LAYER, FUTURE_LINE_LAYER].forEach(layerId => {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      });
      [PAST_LINE_SOURCE, FUTURE_LINE_SOURCE].forEach(sourceId => {
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      });

      if (!events || events.length === 0) {
        if (currentLocation) {
          map.flyTo({ center: currentLocation, zoom: 10 });
        }
        return;
      }

      const isDelivered = status === 'Delivered';

      // Events are ordered most recent first — reverse for chronological order (oldest → newest)
      const chronologicalEvents = [...events].reverse();

      // Collect coordinates of events that have them (in chronological order)
      const pastCoords: [number, number][] = [];
      chronologicalEvents.forEach((event) => {
        if (event.coordinates) {
          // Avoid adding duplicate consecutive coordinates
          const last = pastCoords[pastCoords.length - 1];
          if (!last || last[0] !== event.coordinates[0] || last[1] !== event.coordinates[1]) {
            pastCoords.push(event.coordinates);
          }
        }
      });

      // --- Draw PAST route (blue dashed line) ---
      if (pastCoords.length >= 2) {
        map.addSource(PAST_LINE_SOURCE, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: pastCoords
            }
          }
        });

        map.addLayer({
          id: PAST_LINE_LAYER,
          type: 'line',
          source: PAST_LINE_SOURCE,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6', // blue-500
            'line-width': 3,
            'line-dasharray': [3, 3]
          }
        });
      }

      // --- Draw FUTURE route (gray dashed line from last known position to destination) ---
      if (destination && !isDelivered && pastCoords.length > 0) {
        const lastKnownCoord = pastCoords[pastCoords.length - 1];
        const destCoord = destination.coordinates;

        map.addSource(FUTURE_LINE_SOURCE, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [lastKnownCoord, destCoord]
            }
          }
        });

        map.addLayer({
          id: FUTURE_LINE_LAYER,
          type: 'line',
          source: FUTURE_LINE_SOURCE,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#94a3b8', // slate-400
            'line-width': 2.5,
            'line-dasharray': [4, 4]
          }
        });
      }

      // --- Add markers for events ---
      let isFirstValidEvent = true;
      events.forEach((event) => {
        if (!event.coordinates) return;

        const isLatest = isFirstValidEvent;
        isFirstValidEvent = false;

        const el = document.createElement('div');
        if (isLatest) {
          // Latest event: larger blue pulsing dot
          el.style.cssText = 'position:relative;width:24px;height:24px;';
          const dot = document.createElement('div');
          dot.style.cssText = 'width:24px;height:24px;background:#3b82f6;border-radius:50%;border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:relative;z-index:2;';
          const pulse = document.createElement('div');
          pulse.style.cssText = 'position:absolute;inset:-8px;background:#3b82f6;border-radius:50%;opacity:0.4;z-index:1;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;';
          el.appendChild(pulse);
          el.appendChild(dot);
        } else {
          // Past events: smaller blue dot
          el.style.cssText = 'width:14px;height:14px;background:#60a5fa;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);cursor:pointer;';
        }

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(event.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false, className: 'tracking-popup' })
              .setHTML(
                `<div style="padding:8px;font-family:system-ui,sans-serif;">
                  <p style="font-weight:700;font-size:13px;color:#1e293b;margin:0 0 4px;">${event.location}</p>
                  <p style="font-size:12px;color:#64748b;margin:0 0 4px;">${event.description}</p>
                  <p style="font-size:11px;color:#94a3b8;margin:0;">${new Date(event.date).toLocaleString('fr-FR')}</p>
                </div>`
              )
          )
          .addTo(map);

        markersRef.current.push(marker);
      });

      // --- Add destination marker (if not delivered) ---
      if (destination && !isDelivered) {
        const el = document.createElement('div');
        el.style.cssText = 'width:20px;height:20px;background:transparent;border:3px dashed #94a3b8;border-radius:50%;cursor:pointer;position:relative;';
        const inner = document.createElement('div');
        inner.style.cssText = 'width:8px;height:8px;background:#94a3b8;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);';
        el.appendChild(inner);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(destination.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false })
              .setHTML(
                `<div style="padding:8px;font-family:system-ui,sans-serif;">
                  <p style="font-weight:700;font-size:13px;color:#1e293b;margin:0 0 4px;">📍 Destination</p>
                  <p style="font-size:12px;color:#64748b;margin:0;">${destination.label}</p>
                </div>`
              )
          )
          .addTo(map);

        markersRef.current.push(marker);
      }

      // --- Fit bounds to include all points ---
      const allCoords: [number, number][] = [...pastCoords];
      if (destination && !isDelivered) {
        allCoords.push(destination.coordinates);
      }

      if (allCoords.length > 1) {
        const bounds = new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]);
        allCoords.forEach(coord => bounds.extend(coord));
        map.fitBounds(bounds, { padding: 60, maxZoom: 10 });
      } else if (allCoords.length === 1) {
        map.flyTo({ center: allCoords[0], zoom: 8 });
      } else if (currentLocation) {
        map.flyTo({ center: currentLocation, zoom: 10 });
      }
    };

    // Wait for map to be loaded before adding sources/layers
    if (mapLoadedRef.current) {
      updateMap();
    } else {
      map.on('load', updateMap);
    }
  }, [events, currentLocation, destination, origin, status]);

  return (
    <>
      {/* CSS animation for the pulse effect */}
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
      <div ref={mapContainer} className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden shadow-xl border border-slate-800" />
    </>
  );
}