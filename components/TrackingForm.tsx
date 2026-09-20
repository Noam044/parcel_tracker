"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface TrackingFormProps {
  onSearch: (trackingNumber: string) => void;
  isLoading: boolean;
}

export default function TrackingForm({ onSearch, isLoading }: TrackingFormProps) {
  const [trackingNumber, setTrackingNumber] = useState("");

  const isEmpty = trackingNumber.trim() === "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmpty && !isLoading) {
      onSearch(trackingNumber.trim());
    }
  };

  return (
    // autoComplete="off" empêche Firefox de restaurer l'état (disabled) des champs avant l'hydratation
    <form onSubmit={handleSubmit} autoComplete="off" className="relative w-full max-w-xl">
      <div className="relative flex items-center shadow-sm rounded-xl bg-white border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-300">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          aria-label="Numéro de suivi"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Numéro de suivi (ex: AS123456789CN)..."
          spellCheck={false}
          className="block w-full pl-12 pr-32 py-4 bg-transparent border-none text-slate-900 placeholder-slate-400 focus:outline-none sm:text-base font-medium"
          disabled={isLoading}
        />
        <div className="absolute inset-y-1.5 right-1.5 flex items-center">
          <button
            type="submit"
            disabled={isLoading || isEmpty}
            className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" aria-label="Recherche en cours" />
            ) : (
              "Suivre"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
