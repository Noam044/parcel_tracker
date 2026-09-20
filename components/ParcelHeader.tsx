import { formatDistance, formatDuration, formatEventDate, formatLongDate } from "@/lib/format";
import type { JourneyStats } from "@/lib/journey";
import { progressSteps, STATUS_META } from "@/lib/status";
import type { TrackingData } from "@/lib/types";
import ParcelNumber from "./ParcelNumber";

/** Trois étapes : la barre indique où en est le colis, et dévie de couleur en cas de retour ou d'incident. */
function Progress({ status }: { status: TrackingData["status"] }) {
  const { labels, active } = progressSteps(status);

  return (
    <ol aria-label="Progression du colis" className="mt-8 grid grid-cols-3 gap-2">
      {labels.map((label, index) => (
        <li key={label} aria-current={index === active ? "step" : undefined}>
          <div
            className={`h-[6px] ${index < active ? "bg-ink" : index === active ? STATUS_META[status].segment : "bg-rule"}`}
          />
          <p className={`label mt-2 ${index === active ? "font-bold text-ink" : "text-ink-soft"}`}>{label}</p>
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
  const meta = STATUS_META[data.status];
  const estimate = data.estimatedDelivery ? formatLongDate(data.estimatedDelivery) : "";

  return (
    <section aria-label="Résumé du colis" className="label-card animate-fade-up p-6 md:p-8">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="label mb-4 text-ink-soft">Numéro de suivi</p>
          <ParcelNumber number={data.trackingNumber} />
        </div>

        <div className="md:text-right">
          <p className="label mb-3 text-ink-soft">Statut</p>
          <p
            className={`font-wide inline-block border-[3px] px-4 py-2 text-[clamp(1.125rem,2.2vw,1.5rem)] font-extrabold uppercase leading-none ${meta.stamp}`}
          >
            {meta.label}
          </p>
          <p className="mt-3 max-w-[28ch] text-sm text-ink-soft md:ml-auto">{data.carrier}</p>
        </div>
      </div>

      <Progress status={data.status} />

      <div className="perforation -mx-6 mb-7 mt-8 md:-mx-8" />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
        <Stat label="Étapes" value={String(stats.steps)} detail="événements enregistrés" />
        {stats.days !== null && (
          <Stat
            label="Durée du trajet"
            value={formatDuration(stats.days)}
            detail={data.status === "Delivered" || data.status === "Returned" ? "du premier au dernier scan" : "depuis le premier scan"}
          />
        )}
        {stats.distanceKm !== null && (
          <Stat label="Distance" value={`≈ ${formatDistance(stats.distanceKm)}`} detail="à vol d'oiseau" />
        )}
        {stats.lastScan && (
          <Stat label="Dernier scan" value={formatEventDate(stats.lastScan)} detail={stats.lastScanRelative} />
        )}
        {estimate && (
          <Stat
            label="Arrivée estimée"
            value={estimate}
            detail={data.estimatedDeliveryApproximate ? "estimation indicative" : "selon le transporteur"}
          />
        )}
      </dl>
    </section>
  );
}
