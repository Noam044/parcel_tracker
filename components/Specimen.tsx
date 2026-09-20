import ParcelNumber from "./ParcelNumber";

/** L'anatomie d'un numéro de suivi sur un exemple : le héros de la page au repos. */
export default function Specimen() {
  return (
    <aside aria-labelledby="specimen-title" className="label-card p-6 md:p-8">
      <p id="specimen-title" className="label text-ink-soft">
        Exemple de numéro
      </p>
      <div className="mt-5">
        <ParcelNumber number="LP123456785CN" />
      </div>

      <div className="perforation -mx-6 my-7 md:-mx-8" />

      <p className="max-w-[46ch] text-[15px] leading-relaxed">
        Les colis postaux internationaux suivent la norme S10 : deux lettres pour le service, neuf chiffres, puis le
        code du pays d&apos;origine. Les numéros de DHL, UPS ou Colissimo ont d&apos;autres formats et fonctionnent aussi.
      </p>
    </aside>
  );
}
