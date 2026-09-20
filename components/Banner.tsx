interface BannerProps {
  tone: "error" | "notice";
  children: React.ReactNode;
}

const TONES = {
  error: { tag: "Erreur", border: "border-l-alert", text: "text-alert", role: "alert" as const },
  notice: { tag: "Introuvable", border: "border-l-signal", text: "text-ink", role: "status" as const },
};

/** Message court sous le formulaire : une étiquette qualifie le message, la couleur de la marge le confirme. */
export default function Banner({ tone, children }: BannerProps) {
  const { tag, border, text, role } = TONES[tone];

  return (
    <div
      role={role}
      className={`mt-6 w-full max-w-[680px] animate-fade-up rounded border-2 border-l-8 border-ink bg-sheet px-4 py-3 ${border}`}
    >
      <p className={`label mb-1 font-bold ${text}`}>{tag}</p>
      <p className="text-[15px]">{children}</p>
    </div>
  );
}
