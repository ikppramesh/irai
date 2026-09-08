import RNFS from 'react-native-fs';

// Retrieval, not retraining: the model's weights never change with the news
// cycle. This module fetches a static JSON snapshot published by IRx-1's
// GitHub Actions pipeline (mirrors scripts/fetch_news.py + news_context.py
// in the IRx-1 repo) and searches it locally, the same way src/utils/memory.ts
// does for personal facts. "Refreshing" here means re-fetching this small
// file, never re-downloading the model.

const NEWS_URL = 'https://ikppramesh.github.io/irx-1/news.json';
const NEWS_CACHE_FILE = `${RNFS.DocumentDirectoryPath}/irai_news_cache.json`;
const FETCH_TIMEOUT_MS = 10000;

export interface NewsArticle {
  source: string;
  title: string;
  summary: string;
  link: string;
  fetched_at: number;
}

interface NewsCache {
  articles: NewsArticle[];
  generatedAt: number; // when the remote snapshot was generated
  cachedAt: number;    // when this device last fetched it
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'who', 'when',
  'where', 'why', 'how', 'did', 'does', 'do', 'in', 'on', 'at', 'to',
  'of', 'for', 'and', 'or', 'with', 'about', 'tell', 'me', 'please',
]);

// ── Persistence ──────────────────────────────────────────────────────────

export const loadNewsCache = async (): Promise<NewsCache | null> => {
  try {
    const exists = await RNFS.exists(NEWS_CACHE_FILE);
    if (!exists) return null;
    const raw = await RNFS.readFile(NEWS_CACHE_FILE, 'utf8');
    return JSON.parse(raw) as NewsCache;
  } catch {
    return null;
  }
};

const saveNewsCache = async (cache: NewsCache): Promise<void> => {
  await RNFS.writeFile(NEWS_CACHE_FILE, JSON.stringify(cache), 'utf8');
};

/**
 * Fetch the latest snapshot from GitHub Pages and cache it locally.
 * Fails quiet (returns the existing cache) on any network error so a
 * flaky connection never blocks chat — same fail-open design as
 * scripts/news_context.py returning "" when its index is missing.
 */
export const refreshNews = async (): Promise<{ cache: NewsCache | null; error: string | null }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(NEWS_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const cache: NewsCache = {
      articles: Array.isArray(json.articles) ? json.articles : [],
      generatedAt: json.generated_at ?? Date.now() / 1000,
      cachedAt: Date.now(),
    };
    await saveNewsCache(cache);
    return { cache, error: null };
  } catch (e: any) {
    const existing = await loadNewsCache();
    return { cache: existing, error: e?.message || 'Failed to fetch news' };
  } finally {
    clearTimeout(timeout);
  }
};

// ── Retrieval ────────────────────────────────────────────────────────────

const queryTerms = (text: string): string[] =>
  (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((w) => !STOPWORDS.has(w) && w.length > 2);

export const getRelevantArticles = (
  articles: NewsArticle[],
  query: string,
  limit = 3,
): NewsArticle[] => {
  if (articles.length === 0) return [];

  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  return articles
    .map((a) => {
      const text = `${a.title} ${a.summary}`.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.a);
};

export const buildNewsContext = (articles: NewsArticle[]): string => {
  if (articles.length === 0) return '';
  const lines = articles.map(
    (a) => `- [${a.source}] ${a.title}: ${(a.summary || '').slice(0, 280)}`,
  );
  return (
    '\n\n[Your training data is outdated for recent events, and you have no ' +
    'reliable internal knowledge of them. Answer using ONLY the articles ' +
    "below. If they don't contain enough to answer, say so directly instead " +
    'of guessing from memory. Recent articles:\n' +
    lines.join('\n') +
    '\n]'
  );
};
