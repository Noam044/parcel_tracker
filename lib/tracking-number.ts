// Partagé par le formulaire (validation immédiate, sans requête) et la route API (validation de confiance).

// 17TRACK accepte des numéros de 5 à 50 caractères. Un numéro de suivi contient toujours au moins un
// chiffre : exiger un chiffre écarte d'emblée les saisies absurdes, qui pourraient coûter un enregistrement.
const TRACKING_NUMBER_PATTERN = /^(?=.*\d)[A-Z0-9_-]{5,50}$/;

/**
 * Les espaces sont souvent copiés avec le numéro (ex: "1Z 999 AA1 ..."). La casse est normalisée pour
 * qu'un même colis saisi en minuscules partage le cache et ne soit jamais enregistré deux fois.
 */
export function normalizeTrackingNumber(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/** À appeler sur un numéro déjà normalisé. */
export function isValidTrackingNumber(number: string): boolean {
  return TRACKING_NUMBER_PATTERN.test(number);
}
