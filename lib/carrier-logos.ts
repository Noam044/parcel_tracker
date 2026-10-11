/**
 * Logos du bandeau « Transporteurs pris en charge » (components/CarrierMarquee.tsx), dans l'ordre d'affichage.
 * Tous sont reconnus par 17TRACK ; ce ne sont que des exemples parmi plus de 3 500 transporteurs.
 *
 * Fichiers dans public/carriers/, optimisés avec SVGO. Sources : Wikimedia Commons (domaine public, sauf
 * Mondial Relay en CC BY 4.0 et Colis Privé en CC BY-SA 4.0, déposés par les transporteurs eux-mêmes ; voir
 * README), sites officiels pour Colissimo et Vinted Go (ce dernier recoloré de blanc en #004654, sa
 * couleur de marque, pour rester lisible sur fond clair).
 *
 * Tailles : chaque logo reçoit la même surface apparente (environ 3 000 px²), pour qu'un logo carré
 * (UPS) ne paraisse pas minuscule à côté d'un logo très allongé (La Poste).
 */
export interface CarrierLogo {
  name: string;
  src: string;
  width: number;
  height: number;
}

export const CARRIER_LOGOS: CarrierLogo[] = [
  { name: 'La Poste', src: '/carriers/la-poste.svg', width: 148, height: 22 },
  { name: 'Colissimo', src: '/carriers/colissimo.svg', width: 109, height: 28 },
  { name: 'Chronopost', src: '/carriers/chronopost.svg', width: 118, height: 25 },
  { name: 'Mondial Relay', src: '/carriers/mondial-relay.svg', width: 82, height: 37 },
  { name: 'Vinted Go', src: '/carriers/vinted-go.svg', width: 117, height: 26 },
  { name: 'DPD', src: '/carriers/dpd.svg', width: 85, height: 35 },
  { name: 'GLS', src: '/carriers/gls.svg', width: 92, height: 32 },
  { name: 'Colis Privé', src: '/carriers/colis-prive.svg', width: 34, height: 44 },
  { name: 'UPS', src: '/carriers/ups.svg', width: 37, height: 44 },
  { name: 'DHL', src: '/carriers/dhl.svg', width: 117, height: 26 },
  { name: 'FedEx', src: '/carriers/fedex.svg', width: 114, height: 26 },
  { name: 'Amazon', src: '/carriers/amazon.svg', width: 100, height: 30 },
  { name: 'Cainiao', src: '/carriers/cainiao.svg', width: 73, height: 41 },
  { name: 'PostNL', src: '/carriers/postnl.svg', width: 44, height: 44 },
  { name: 'bpost', src: '/carriers/bpost.svg', width: 72, height: 42 },
  { name: 'Royal Mail', src: '/carriers/royal-mail.svg', width: 108, height: 28 },
  { name: 'USPS', src: '/carriers/usps.svg', width: 143, height: 22 },
];
