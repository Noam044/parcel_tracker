import type { Locale } from './locale-script';
import { post, RegistrationsPausedError } from './track17';

/**
 * Garde-fou du quota 17TRACK : chaque numéro enregistré (endpoint register) coûte une unité de quota,
 * et le plan gratuit n'en contient que quelques centaines. N'importe quel visiteur pouvant déclencher un
 * enregistrement, on vérifie auprès de 17TRACK — seule source partagée entre toutes les instances
 * serveur — qu'il reste de la marge avant chaque nouvel enregistrement.
 *
 * getquota ne consomme pas de quota. Si la vérification échoue, l'enregistrement est refusé (fail closed).
 */

interface QuotaResponse {
  data?: {
    quota_remain?: number;
    today_used?: number;
    /** Limite quotidienne réglée dans le tableau de bord 17TRACK (0 = aucune) */
    max_track_daily?: number;
  };
}

function readLimit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

/** Nombre maximum de nouveaux numéros enregistrés par jour (fuseau de 17TRACK), tous visiteurs confondus. */
const dailyLimit = () => readLimit('TRACK17_DAILY_REGISTER_LIMIT', 5);
/** Unités de quota gardées en réserve : en dessous, le site n'enregistre plus aucun numéro. */
const reserve = () => readLimit('TRACK17_QUOTA_RESERVE', 20);

export async function assertRegistrationBudget(apiKey: string, locale: Locale): Promise<void> {
  const paused = new RegistrationsPausedError(locale);
  const siteLimit = dailyLimit();
  if (siteLimit === 0) throw paused;

  const json = await post<QuotaResponse>('getquota', apiKey, [], locale);
  const remain = json.data?.quota_remain;
  const todayUsed = json.data?.today_used;
  // La plus stricte des deux limites : inutile de tenter un enregistrement que 17TRACK refuserait
  const accountLimit = json.data?.max_track_daily;
  const limit = accountLimit ? Math.min(siteLimit, accountLimit) : siteLimit;

  if (typeof remain !== 'number' || typeof todayUsed !== 'number') {
    console.error('Réponse getquota inattendue :', json.data);
    throw paused;
  }
  if (todayUsed >= limit || remain <= reserve()) {
    console.warn(`Enregistrement refusé : ${todayUsed}/${limit} aujourd'hui, ${remain} restants (réserve ${reserve()})`);
    throw paused;
  }
}
