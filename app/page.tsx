"use client";

import Map from "@/components/Map";
import TrackingForm from "@/components/TrackingForm";
import { fetchTrackingData, TrackingData } from "@/lib/api";
import { useState } from "react";
import { Package, Truck, CheckCircle2, AlertCircle, CalendarClock } from "lucide-react";

export default function Home() {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (trackingNumber: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTrackingData(trackingNumber);
      setTrackingData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setTrackingData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Transit': return <Truck className="h-6 w-6 text-blue-500" />;
      case 'Delivered': return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'Exception': return <AlertCircle className="h-6 w-6 text-red-500" />;
      default: return <Package className="h-6 w-6 text-slate-500" />;
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
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Parcel Tracker
            </h1>
          </div>
          <p className="text-lg text-slate-600 max-w-xl">
            Suivez vos colis en temps réel. Entrez votre numéro de suivi ci-dessous pour voir l'itinéraire de votre livraison.
          </p>
          
          <TrackingForm onSearch={handleSearch} isLoading={isLoading} />
          
          {error && (
            <div className="w-full max-w-xl p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-start space-x-3 text-left animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline Panel */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px] overflow-hidden">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              Détails du suivi
            </h2>
            
            {trackingData ? (
              <div className="flex-1 overflow-y-auto pr-2 animate-in fade-in duration-500">
                <div className="flex items-center space-x-4 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  {getStatusIcon(trackingData.status)}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{trackingData.trackingNumber}</p>
                    <p className="text-xs text-slate-500">{trackingData.carrier} • {trackingData.status}</p>
                  </div>
                </div>

                {/* Arrivée estimée */}
                {trackingData.estimatedDelivery && (
                  <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CalendarClock className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Arrivée estimée</p>
                        <p className="text-sm font-bold text-slate-900">
                          {new Date(trackingData.estimatedDelivery).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative pl-8 border-l-2 border-slate-200 space-y-6">
                  {trackingData.events.map((event, index) => (
                    <div key={index} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[calc(2rem+5px)] flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow z-10">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-slate-300'}`} />
                      </div>
                      
                      {/* Event card */}
                      <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                        <h3 className="font-bold text-slate-900 text-sm mb-1">{event.location}</h3>
                        <p className="text-slate-600 text-sm mb-2 break-words">{event.description}</p>
                        <time className="text-xs font-medium text-slate-400">
                          {new Date(event.date).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-4">
                <Package className="h-16 w-16 text-slate-200" />
                <p className="text-sm">
                  Entrez un numéro de suivi pour voir les étapes de livraison.
                </p>
              </div>
            )}
          </div>

          {/* Map Panel */}
          <div className="lg:col-span-2 h-[600px] bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
            <Map 
              events={trackingData?.events} 
              currentLocation={trackingData?.events[0]?.coordinates}
              destination={trackingData?.destination}
              origin={trackingData?.origin}
              status={trackingData?.status}
            />
          </div>
        </div>
      </div>
    </main>
  );
}