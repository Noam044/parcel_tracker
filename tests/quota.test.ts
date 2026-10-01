import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertRegistrationBudget } from '@/lib/quota';
import { RegistrationsPausedError } from '@/lib/track17';
import { mock17track, silenceConsole } from './helpers';

const quota = (data: Record<string, unknown>) => ({ code: 0, data });

describe('assertRegistrationBudget', () => {
  beforeEach(silenceConsole);

  it('autorise un enregistrement quand il reste de la marge', async () => {
    mock17track({ getquota: [quota({ quota_remain: 100, today_used: 0, max_track_daily: 0 })] });
    await expect(assertRegistrationBudget('key', 'fr')).resolves.toBeUndefined();
  });

  it('refuse sans appeler 17TRACK quand la limite du site vaut 0', async () => {
    vi.stubEnv('TRACK17_DAILY_REGISTER_LIMIT', '0');
    const fetchMock = mock17track({});

    await expect(assertRegistrationBudget('key', 'fr')).rejects.toBeInstanceOf(RegistrationsPausedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuse une fois la limite quotidienne du site atteinte (5 par défaut)', async () => {
    mock17track({ getquota: [quota({ quota_remain: 100, today_used: 5 })] });
    await expect(assertRegistrationBudget('key', 'fr')).rejects.toBeInstanceOf(RegistrationsPausedError);
  });

  it('applique la plus stricte des limites du site et du compte 17TRACK', async () => {
    mock17track({ getquota: [quota({ quota_remain: 100, today_used: 2, max_track_daily: 2 })] });
    await expect(assertRegistrationBudget('key', 'fr')).rejects.toBeInstanceOf(RegistrationsPausedError);
  });

  it('garde une réserve de quota (20 par défaut)', async () => {
    mock17track({ getquota: [quota({ quota_remain: 20, today_used: 0 })] });
    await expect(assertRegistrationBudget('key', 'fr')).rejects.toBeInstanceOf(RegistrationsPausedError);
  });

  it('lit les limites dans l’environnement', async () => {
    vi.stubEnv('TRACK17_DAILY_REGISTER_LIMIT', '50');
    vi.stubEnv('TRACK17_QUOTA_RESERVE', '0');
    mock17track({ getquota: [quota({ quota_remain: 1, today_used: 49 })] });

    await expect(assertRegistrationBudget('key', 'fr')).resolves.toBeUndefined();
  });

  it('ignore une limite mal écrite et garde la valeur par défaut', async () => {
    vi.stubEnv('TRACK17_DAILY_REGISTER_LIMIT', 'beaucoup');
    mock17track({ getquota: [quota({ quota_remain: 100, today_used: 5 })] });

    await expect(assertRegistrationBudget('key', 'fr')).rejects.toBeInstanceOf(RegistrationsPausedError);
  });

  it('refuse par précaution quand la réponse est incomplète (fail closed)', async () => {
    mock17track({ getquota: [quota({ quota_remain: 100 })] });
    await expect(assertRegistrationBudget('key', 'fr')).rejects.toBeInstanceOf(RegistrationsPausedError);
  });

  it('refuse quand 17TRACK est injoignable', async () => {
    const fetchMock = mock17track({});
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(assertRegistrationBudget('key', 'fr')).rejects.toMatchObject({ code: 'network' });
  });
});
