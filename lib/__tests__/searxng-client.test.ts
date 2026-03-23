import { describe, expect, it, jest, beforeEach } from '@jest/globals';

import { fetch as expoFetch } from 'expo/fetch';

import {
  mapSearxngErrorToMessage,
  normalizeSearxngUrl,
  searchSearxng,
  SearxngClientError,
} from '../searxng-client';

jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

describe('searxng-client', () => {
  const mockExpoFetch = expoFetch as unknown as jest.MockedFunction<typeof expoFetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes instance URLs to the search endpoint', () => {
    expect(normalizeSearxngUrl('https://search.example.com/')).toBe('https://search.example.com/search');
    expect(normalizeSearxngUrl('https://search.example.com/search')).toBe('https://search.example.com/search');
  });

  it('searches and normalizes SearXNG results', async () => {
    mockExpoFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: 'Expo News',
            url: 'https://expo.dev/blog',
            content: 'Fresh Expo updates',
            engine: 'duckduckgo',
          },
          {
            title: 'Expo News Duplicate',
            url: 'https://expo.dev/blog',
            content: 'Duplicate URL should be removed',
          },
        ],
      }),
    } as any);

    const result = await searchSearxng('expo sdk updates', {
      url: 'https://search.example.com',
    });

    expect(result.query).toBe('expo sdk updates');
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toEqual({
      title: 'Expo News',
      url: 'https://expo.dev/blog',
      snippet: 'Fresh Expo updates',
      engine: 'duckduckgo',
      publishedDate: undefined,
    });

    expect(mockExpoFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://search.example.com/search?q=expo+sdk+updates'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('maps invalid JSON responses to a helpful message', async () => {
    mockExpoFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('invalid json');
      },
    } as any);

    await expect(searchSearxng('expo', { url: 'https://search.example.com' })).rejects.toMatchObject({
      code: 'json_disabled',
    });
  });

  it('returns helpful messages for configuration errors', () => {
    const message = mapSearxngErrorToMessage(
      new SearxngClientError('Enter your SearXNG instance URL first.', 'not_configured'),
    );

    expect(message).toContain('Configure your SearXNG instance');
  });
});
