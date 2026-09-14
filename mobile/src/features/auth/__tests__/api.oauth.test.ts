/// <reference types="jest" />

import { createOAuthSignInUrl } from '../api';

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
    },
  },
}));

const { supabase } = jest.requireMock('@/src/lib/supabase') as {
  supabase: { auth: { signInWithOAuth: jest.Mock } };
};

describe('social authentication API', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['apple', 'google', 'discord'] as const)('creates a PKCE-ready %s redirect', async (provider) => {
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: `https://auth.example/${provider}` },
      error: null,
    });

    await expect(createOAuthSignInUrl(provider, 'griff://auth/callback')).resolves.toBe(`https://auth.example/${provider}`);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider,
      options: {
        redirectTo: 'griff://auth/callback',
        skipBrowserRedirect: true,
      },
    });
  });
});
