"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Package } from "lucide-react";
import TrackingForm from "@/components/TrackingForm";
import TrackingSummary from "@/components/TrackingSummary";
import TrackingTimeline from "@/components/TrackingTimeline";
import { fetchTrackingData } from "@/lib/api";
import type { TrackingData } from "@/lib/types";

// mapbox-gl est lourd et n'a de sens que dans le navigateur : chargé à part, sans rendu serveur
const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-800" />,
});

export default function Home() {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Annule la requête en cours si la page est quittée
  useEffect(() => () => requestRef.current?.abort(), []);

  const handleSearch = async (trackingNumber: string) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      setTrackingData(await fetchTrackingData(trackingNumber, controller.signal));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setTrackingData(null);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30">
              <Package className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Parcel Tracker</h1>
          </div>
          <p className="text-lg text-slate-600 max-w-xl">
            Suivez vos colis en temps réel. Entrez votre numéro de suivi ci-dessous pour voir
            l&apos;itinéraire de votre livraison.
          </p>

          <TrackingForm onSearch={handleSearch} isLoading={isLoading} />

          {error && (
            <div
              role="alert"
              className="w-full max-w-xl p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-start space-x-3 text-left animate-fade-in"
            >
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline Panel */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px] overflow-hidden">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Détails du suivi</h2>

            {trackingData ? (
              <div className="flex-1 overflow-y-auto pr-2 animate-fade-in">
                <TrackingSummary data={trackingData} />
                <TrackingTimeline events={trackingData.events} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
                <Package className="h-16 w-16 text-slate-200" />
                <p className="text-sm">Entrez un numéro de suivi pour voir les étapes de livraison.</p>
              </div>
            )}
          </div>

          {/* Map Panel */}
          <div className="lg:col-span-2 h-[600px] bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
            <TrackingMap
              events={trackingData?.events}
              destination={trackingData?.destination}
              status={trackingData?.status}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
