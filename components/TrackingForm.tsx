"use client";

import { useRef, useState } from "react";
import { useT } from "@/lib/locale";
import { isValidTrackingNumber, normalizeTrackingNumber } from "@/lib/tracking-number";

interface TrackingFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (trackingNumber: string) => void;
  isLoading: boolean;
  /** Version condensée une fois qu'un colis est affiché */
  compact?: boolean;
}

export default function TrackingForm({ value, onChange, onSubmit, isLoading, compact = false }: TrackingFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [problem, setProblem] = useState<"missing" | "invalid" | null>(null);
  const { t } = useT();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Le bouton reste toujours actif : un bouton grisé passe pour cassé. Une saisie vide ou impossible
    // reçoit une explication sur place, sans aller-retour avec le serveur.
    const number = normalizeTrackingNumber(value);
    const found = number === "" ? "missing" : isValidTrackingNumber(number) ? null : "invalid";
    if (found) {
      setProblem(found);
      inputRef.current?.focus();
      return;
    }
    // Relancer une recherche pendant qu'une autre est en cours remplace simplement la précédente
    onSubmit(number);
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off" noValidate className="w-full max-w-[680px]">
      <label htmlFor="tracking-number" className="label mb-2 block text-ink-soft">
        {t.form.numberLabel}
      </label>

      <div className="flex flex-col rounded border-2 border-ink bg-sheet focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-customs sm:flex-row">
        <input
          ref={inputRef}
          id="tracking-number"
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setProblem(null);
          }}
          placeholder={t.form.placeholder}
          spellCheck={false}
          autoCapitalize="characters"
          autoCorrect="off"
          enterKeyHint="search"
          aria-invalid={!!problem}
          aria-describedby={problem || !compact ? "tracking-number-hint" : undefined}
          className="min-w-0 flex-1 bg-transparent px-4 py-4 font-mono text-lg tracking-wide text-ink outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-soft/70 sm:text-xl"
        />
        <button
          type="submit"
          aria-busy={isLoading}
          className="border-t-2 border-ink bg-customs px-7 py-4 font-wide text-base font-extrabold text-on-customs transition-colors hover:bg-customs-hover focus-visible:outline-offset-[-6px] sm:min-w-[11.5rem] sm:border-l-2 sm:border-t-0"
        >
          {isLoading ? t.form.submitLoading : t.form.submitIdle}
        </button>
      </div>

      {problem ? (
        <p id="tracking-number-hint" role="alert" className="mt-3 text-[15px] font-semibold text-alert">
          {problem === "missing" ? t.form.missingNumber : t.errors.invalidNumber}
        </p>
      ) : (
        !compact && (
          <p id="tracking-number-hint" className="mt-3 text-[15px] text-ink-soft">
            {t.form.hint}
          </p>
        )
      )}
    </form>
  );
}
