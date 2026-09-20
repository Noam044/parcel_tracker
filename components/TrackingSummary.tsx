import { AlertCircle, CalendarClock, CheckCircle2, Package, Truck, Undo2, type LucideIcon } from "lucide-react";
import { formatLongDate } from "@/lib/format";
import type { TrackingData, TrackingStatus } from "@/lib/types";

const STATUS_META: Record<TrackingStatus, { label: string; Icon: LucideIcon; iconClassName: string }> = {
  "In Transit": { label: "En transit", Icon: Truck, iconClassName: "text-blue-500" },
  Delivered: { label: "Livré", Icon: CheckCircle2, iconClassName: "text-green-500" },
  Returned: { label: "Retourné à l'expéditeur", Icon: Undo2, iconClassName: "text-amber-500" },
  Exception: { label: "Incident de livraison", Icon: AlertCircle, iconClassName: "text-red-500" },
  Pending: { label: "En attente", Icon: Package, iconClassName: "text-slate-500" },
};

export default function TrackingSummary({ data }: { data: TrackingData }) {
  const { label, Icon, iconClassName } = STATUS_META[data.status];
  const estimatedDate = data.estimatedDelivery ? formatLongDate(data.estimatedDelivery) : "";

  return (
    <>
      <div className="flex items-center space-x-4 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <Icon className={`h-6 w-6 ${iconClassName}`} />
        <div>
          <p className="text-sm font-semibold text-slate-900">{data.trackingNumber}</p>
          <p className="text-xs text-slate-500">
            {data.carrier} • {label}
          </p>
        </div>
      </div>

      {estimatedDate && (
        <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarClock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">
                Arrivée estimée{data.estimatedDeliveryApproximate && " (indicative)"}
              </p>
              <p className="text-sm font-bold text-slate-900">{estimatedDate}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
