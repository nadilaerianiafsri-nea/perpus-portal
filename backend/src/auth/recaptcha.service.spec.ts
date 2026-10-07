import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { RecaptchaService } from './recaptcha.service';

describe('Login reCAPTCHA verification', () => {
  const settings: Record<string, string> = {};
  const config = {
    get: (key: string) => settings[key],
  } as ConfigService;
  const service = new RecaptchaService(config);
  const google = jest.spyOn(globalThis, 'fetch');

  const accepted = () =>
    new Response(
      JSON.stringify({
        success: true,
        hostname: 'perpus.example.com',
      }),
    );

  beforeEach(() => {
    for (const key of Object.keys(settings)) {
      delete settings[key];
    }

    settings.NODE_ENV = 'production';
    settings.RECAPTCHA_SECRET_KEY = 'test-private-key';
    settings.FRONTEND_URL = 'https://perpus.example.com';

    google.mockReset();
    google.mockResolvedValue(accepted());
  });

  afterAll(() => google.mockRestore());

  it('allows an explicit non-production setup without a key, without contacting Google', async () => {
    settings.NODE_ENV = 'development';
    delete settings.RECAPTCHA_SECRET_KEY;

    await expect(service.verify(undefined)).resolves.toBeUndefined();
    expect(google).not.toHaveBeenCalled();
  });

  it('allows a localhost-only frontend without a key even if NODE_ENV is inherited as production', async () => {
    settings.NODE_ENV = 'production';
    settings.FRONTEND_URL = 'http://localhost:3000';
    delete settings.RECAPTCHA_SECRET_KEY;

    await expect(service.verify(undefined)).resolves.toBeUndefined();
    expect(google).not.toHaveBeenCalled();
  });

  it.each([
    'http://127.0.0.1:3000',
    'http://localhost:3000,http://127.0.0.1:3000',
  ])(
    'allows local frontend origin(s) without a key: %s',
    async (origin) => {
      settings.NODE_ENV = '';
      settings.FRONTEND_URL = origin;
      delete settings.RECAPTCHA_SECRET_KEY;

      await expect(service.verify(undefined)).resolves.toBeUndefined();
      expect(google).not.toHaveBeenCalled();
    },
  );

  it.each([
    'https://perpus.example.com',
    'http://localhost:3000,https://perpus.example.com',
    '',
    'invalid-url',
  ])(
    'fails closed without a secret when frontend is not local-only: %s',
    async (origin) => {
      settings.NODE_ENV = 'production';
      settings.FRONTEND_URL = origin;
      delete settings.RECAPTCHA_SECRET_KEY;

      await expect(service.verify('token')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(google).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    null,
    '',
    '   ',
    true,
    {},
    'x'.repeat(8193),
  ])(
    'rejects missing or malformed tokens before authentication: %j',
    async (token) => {
      await expect(service.verify(token)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(google).not.toHaveBeenCalled();
    },
  );

  it('posts the token to Google and accepts only a successful response from the configured hostname', async () => {
    await expect(service.verify('valid-token')).resolves.toBeUndefined();

    const [url, options] = google.mock.calls[0];

    expect(url).toBe(
      'https://www.google.com/recaptcha/api/siteverify',
    );
    expect(options?.method).toBe('POST');

    const payload = options?.body as URLSearchParams;

    expect(payload.get('secret')).toBe(
      settings.RECAPTCHA_SECRET_KEY,
    );
    expect(payload.get('response')).toBe('valid-token');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('supports multiple explicitly configured frontend origins', async () => {
    settings.FRONTEND_URL =
      'https://other.example.com, https://perpus.example.com';

    await expect(
      service.verify('valid-token'),
    ).resolves.toBeUndefined();
  });

  it.each([
    {
      success: false,
      'error-codes': ['invalid-input-response'],
    },
    {
      success: false,
      'error-codes': ['timeout-or-duplicate'],
    },
    {
      success: 'true',
      hostname: 'perpus.example.com',
    },
    {
      success: true,
      hostname: 'attacker.example.com',
    },
    {
      success: true,
    },
    null,
  ])(
    'rejects invalid, replayed or wrong-hostname responses: %j',
    async (body) => {
      google.mockResolvedValueOnce(
        new Response(JSON.stringify(body)),
      );

      await expect(
        service.verify('token'),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each(['', 'invalid-url'])(
    'requires valid FRONTEND_URL configuration when enabled',
    async (origin) => {
      settings.FRONTEND_URL = origin;

      await expect(
        service.verify('token'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(google).not.toHaveBeenCalled();
    },
  );

  it('fails closed when Google is unavailable, without leaking provider details', async () => {
    google.mockRejectedValueOnce(
      new Error('private-provider-error'),
    );

    await expect(service.verify('token')).rejects.toThrow(
      'Verifikasi keamanan tidak dapat dihubungi. Silakan coba lagi.',
    );

    google.mockResolvedValueOnce(
      new Response('', {
        status: 503,
      }),
    );

    await expect(
      service.verify('token'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    google.mockResolvedValueOnce(new Response('not-json'));

    await expect(
      service.verify('token'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
