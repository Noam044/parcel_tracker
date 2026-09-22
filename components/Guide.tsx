"use client";

import { useT } from "@/lib/locale";
import { STATUS_CLASSES, STATUS_ORDER } from "@/lib/status";

export default function Guide() {
  const { t } = useT();

  return (
    <div className="mx-auto grid max-w-[1280px] gap-14 px-5 py-16 md:px-10 lg:grid-cols-[7fr_5fr] lg:gap-20 lg:py-20">
      <section id="statuts" aria-labelledby="statuts-title">
        <h2 id="statuts-title" className="font-wide text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-tight">
          {t.guide.statusTitle}
        </h2>
        <dl className="mt-6 divide-y-2 divide-dashed divide-rule border-y-2 border-ink">
          {STATUS_ORDER.map((status) => {
            const meta = t.status[status];
            return (
              <div key={status} className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[13rem_1fr]">
                <dt className="flex items-center gap-3 font-semibold">
                  <span aria-hidden="true" className={`size-3 shrink-0 ${STATUS_CLASSES[status].marker}`} />
                  {meta.label}
                </dt>
                <dd className="text-[15px] leading-relaxed text-ink-soft">{meta.description}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section id="bon-a-savoir" aria-labelledby="savoir-title" className="label-card self-start p-6 md:p-8">
        <h2 id="savoir-title" className="font-wide text-[clamp(1.25rem,2.4vw,1.5rem)] font-extrabold">
          {t.guide.goodToKnowTitle}
        </h2>
        <dl className="mt-5">
          {t.guide.goodToKnow.map((note, index) => (
            <div key={note.label} className={index > 0 ? "mt-5 border-t-2 border-dashed border-rule pt-5" : ""}>
              <dt className="label font-bold">{note.label}</dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{note.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
