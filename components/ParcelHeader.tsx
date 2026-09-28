"use client";

import { useEffect, useRef } from "react";
import { carrierText } from "@/lib/display";
import { formatDistance, formatDuration, formatEventDate, formatLongDate } from "@/lib/format";
import type { JourneyStats } from "@/lib/journey";
import { useT } from "@/lib/locale";
import { progressStepIndex, STATUS_CLASSES } from "@/lib/status";
import type { Dictionary } from "@/lib/dictionary";
import type { TrackingData } from "@/lib/types";
import ParcelNumber from "./ParcelNumber";

/** Trois étapes : la barre indique où en est le colis, et dévie de couleur en cas de retour ou d'incident. */
function Progress({ status, t }: { status: TrackingData["status"]; t: Dictionary }) {
  const active = progressStepIndex(status);
  const labels: [string, string, string] = [
    t.progressSteps.registered,
    status === "Exception" ? t.progressSteps.exception : t.progressSteps.inTransit,
    status === "Returned" ? t.progressSteps.returned : t.progressSteps.delivered,
  ];

  return (
    <ol aria-label={t.parcelHeader.progressAria} className="mt-8 grid grid-cols-3 gap-2">
      {labels.map((label, index) => (
        <li key={label} aria-current={index === active ? "step" : undefined}>
          <div
            className={`h-[6px] ${index < active ? "bg-ink" : index === active ? STATUS_CLASSES[status].segment : "bg-rule"}`}
          />
          {/*
            Trois colonnes d'à peine 90 px sur téléphone : sans espacement de lettres, « Enregistré » y tient.
            Sous 360 px elles n'en font plus que 70 : seule l'étape en cours reste écrite (les autres restent
            lues par les lecteurs d'écran), les barres montrant toujours les trois étapes.
          */}
          <p
            className={`label mt-2 max-sm:tracking-normal ${index === active ? "whitespace-nowrap font-bold text-ink" : "text-ink-soft max-[359px]:sr-only"}`}
          >
            {label}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <dt className="label text-ink-soft">{label}</dt>
      <dd className="font-wide mt-1.5 text-[clamp(1.25rem,2.4vw,1.625rem)] font-extrabold leading-tight">{value}</dd>
      {detail && <dd className="mt-0.5 text-sm text-ink-soft">{detail}</dd>}
    </div>
  );
}

/** L'étiquette du colis : numéro, statut et progression, puis les chiffres clés du trajet. */
export default function ParcelHeader({ data, stats }: { data: TrackingData; stats: JourneyStats }) {
  const { locale, t } = useT();
  const meta = t.status[data.status];
  const estimate = data.estimatedDelivery ? formatLongDate(data.estimatedDelivery, locale) : "";
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // Le résultat remplace l'écran d'attente : le focus y est placé pour qu'un lecteur d'écran l'annonce et
  // que la navigation au clavier reparte d'ici (le bouton cliqué dans l'historique a disparu entre-temps)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section aria-label={t.parcelHeader.summaryAria} className="label-card animate-fade-up p-6 md:p-8">
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {t.parcelHeader.resultHeading(data.trackingNumber, meta.label)}
      </h2>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="label mb-4 text-ink-soft">{t.form.numberLabel}</p>
          <ParcelNumber number={data.trackingNumber} />
        </div>

        <div className="md:text-right">
          <p className="label mb-3 text-ink-soft">{t.parcelHeader.statusLabel}</p>
          <p
            className={`font-wide inline-block border-[3px] px-4 py-2 text-[clamp(1.125rem,2.2vw,1.5rem)] font-extrabold uppercase leading-none ${STATUS_CLASSES[data.status].stamp}`}
          >
            {meta.label}
          </p>
          <p className="mt-3 max-w-[28ch] text-sm text-ink-soft md:ml-auto">{carrierText(data.carrier, t)}</p>
        </div>
      </div>

      <Progress status={data.status} t={t} />

      <div className="perforation -mx-6 mb-7 mt-8 md:-mx-8" />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
        <Stat label={t.parcelHeader.steps} value={String(stats.steps)} detail={t.parcelHeader.stepsDetail} />
        {stats.days !== null && (
          <Stat
            label={t.parcelHeader.duration}
            value={formatDuration(stats.days, locale)}
            detail={
              data.status === "Delivered" || data.status === "Returned"
                ? t.parcelHeader.durationDetailFinished
                : t.parcelHeader.durationDetailOngoing
            }
          />
        )}
        {stats.distanceKm !== null && (
          <Stat
            label={t.parcelHeader.distance}
            value={`≈ ${formatDistance(stats.distanceKm, locale)}`}
            detail={t.parcelHeader.distanceDetail}
          />
        )}
        {stats.lastScan && (
          <Stat
            label={t.parcelHeader.lastScan}
            value={formatEventDate(stats.lastScan, locale)}
            detail={stats.lastScanRelative}
          />
        )}
        {estimate && (
          <Stat
            label={t.parcelHeader.eta}
            value={estimate}
            detail={data.estimatedDeliveryApproximate ? t.parcelHeader.etaDetailApprox : t.parcelHeader.etaDetailCarrier}
          />
        )}
      </dl>
    </section>
  );
}
