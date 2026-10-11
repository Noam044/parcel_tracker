"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/locale";
import {
  CARRIER_IDS,
  CARRIER_NAMES,
  isCarrierId,
  isValidPostalCode,
  normalizePostalCode,
  parseTrackingInput,
  queryProblem,
  type CarrierId,
  type ParcelQuery,
} from "@/lib/tracking-number";

/** Saisie du formulaire, gardée par la page pour suivre le colis affiché (URL, historique). */
export interface TrackingFormValue {
  /** Numéro, ou lien de suivi d'un transporteur */
  text: string;
  /** Vide : détection automatique par 17TRACK */
  carrier: CarrierId | "";
  postalCode: string;
}

export const EMPTY_FORM: TrackingFormValue = { text: "", carrier: "", postalCode: "" };

type Problem = "missing" | "invalid" | "unknownLink" | "missingPostalCode" | "invalidPostalCode";

interface TrackingFormProps {
  value: TrackingFormValue;
  onChange: (value: TrackingFormValue) => void;
  onSubmit: (query: ParcelQuery) => void;
  isLoading: boolean;
  /** Le serveur réclame le code postal du destinataire (voir lib/use-parcel-search.ts) */
  asksPostalCode?: boolean;
  /** Version condensée une fois qu'un colis est affiché */
  compact?: boolean;
}

export default function TrackingForm({
  value,
  onChange,
  onSubmit,
  isLoading,
  asksPostalCode = false,
  compact = false,
}: TrackingFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const postalRef = useRef<HTMLInputElement | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const { t } = useT();

  // Mondial Relay ne donne le suivi qu'avec le code postal du destinataire : le champ apparaît dès que ce
  // transporteur est choisi, ou quand le serveur le réclame pour un numéro cherché en détection automatique
  const showPostalCode = value.carrier === "mondial-relay" || asksPostalCode;

  // Réclamé par le serveur : le visiteur vient de chercher, il peut taper le code postal sans chercher le champ
  useEffect(() => {
    if (asksPostalCode) postalRef.current?.focus();
  }, [asksPostalCode]);

  const update = (change: Partial<TrackingFormValue>) => {
    onChange({ ...value, ...change });
    setProblem(null);
  };

  /** La recherche décrite par le formulaire, ou ce qui l'empêche (sans aller-retour avec le serveur). */
  const readForm = (): ParcelQuery | Problem => {
    // La saisie peut aussi être le lien de suivi d'un transporteur : il prime alors sur le menu
    const parsed = parseTrackingInput(value.text);
    if (!parsed) return "unknownLink";
    if (parsed.number === "") return "missing";
    if (queryProblem(parsed)) return "invalid";
    if (parsed.carrier) return parsed;

    const postalCode = showPostalCode ? normalizePostalCode(value.postalCode) : "";
    if (showPostalCode && !postalCode) return "missingPostalCode";
    if (postalCode && !isValidPostalCode(postalCode)) return "invalidPostalCode";
    return {
      number: parsed.number,
      ...(value.carrier && { carrier: value.carrier }),
      ...(postalCode && { postalCode }),
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Le bouton reste toujours actif : un bouton grisé passe pour cassé. Une saisie vide ou impossible
    // reçoit une explication sur place.
    const result = readForm();
    if (typeof result === "string") {
      setProblem(result);
      (result === "missingPostalCode" || result === "invalidPostalCode" ? postalRef : inputRef).current?.focus();
      return;
    }
    // Relancer une recherche pendant qu'une autre est en cours remplace simplement la précédente
    onSubmit(result);
  };

  const problemText: Record<Problem, string> = {
    missing: t.form.missingNumber,
    invalid: t.errors.invalidNumber,
    unknownLink: t.form.unknownLink,
    missingPostalCode: t.postalCode.missing,
    invalidPostalCode: t.postalCode.invalid,
  };
  const postalProblem = problem === "missingPostalCode" || problem === "invalidPostalCode";
  const fieldClass =
    "rounded border-2 border-ink bg-sheet px-3 py-2.5 text-[15px] text-ink outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-customs";

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
          value={value.text}
          onChange={(e) => update({ text: e.target.value })}
          placeholder={t.form.placeholder}
          spellCheck={false}
          autoCapitalize="characters"
          autoCorrect="off"
          enterKeyHint="search"
          aria-invalid={!!problem && !postalProblem}
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

      {/* Facultatif : la détection automatique suffit pour presque tous les colis */}
      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-3">
        <div>
          <label htmlFor="carrier" className="label mb-1.5 block text-ink-soft">
            {t.form.carrierLabel}
          </label>
          <select
            id="carrier"
            value={value.carrier}
            onChange={(e) => update({ carrier: isCarrierId(e.target.value) ? e.target.value : "" })}
            className={`${fieldClass} pr-8`}
          >
            <option value="">{t.form.carrierAuto}</option>
            {CARRIER_IDS.map((id) => (
              <option key={id} value={id}>
                {CARRIER_NAMES[id]}
              </option>
            ))}
          </select>
        </div>

        {showPostalCode && (
          <div>
            <label htmlFor="postal-code" className="label mb-1.5 block text-ink-soft">
              {t.postalCode.label}
            </label>
            <input
              ref={postalRef}
              id="postal-code"
              type="text"
              value={value.postalCode}
              onChange={(e) => update({ postalCode: e.target.value })}
              placeholder={t.postalCode.placeholder}
              spellCheck={false}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="postal-code"
              enterKeyHint="search"
              aria-invalid={postalProblem}
              aria-describedby={postalProblem ? "tracking-number-hint" : undefined}
              className={`${fieldClass} w-[11rem] font-mono tracking-wide placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-soft/70`}
            />
          </div>
        )}
      </div>

      {problem ? (
        <p id="tracking-number-hint" role="alert" className="mt-3 text-[15px] font-semibold text-alert">
          {problemText[problem]}
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
