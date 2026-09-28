"use client";

import { useId } from "react";
import { useT } from "@/lib/locale";
import ParcelNumber from "./ParcelNumber";

/** L'anatomie d'un numéro de suivi sur un exemple : le héros de la page au repos. */
export default function Specimen({ className = "" }: { className?: string }) {
  const { t } = useT();
  const titleId = useId();

  return (
    <aside aria-labelledby={titleId} className={`label-card p-6 md:p-8 ${className}`}>
      <p id={titleId} className="label text-ink-soft">
        {t.specimen.title}
      </p>
      <div className="mt-5">
        <ParcelNumber number="LP123456785CN" />
      </div>

      <div className="perforation -mx-6 my-7 md:-mx-8" />

      <p className="max-w-[46ch] text-[15px] leading-relaxed">{t.specimen.explanation}</p>
    </aside>
  );
}
