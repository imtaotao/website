import { useEffect, useMemo, useState } from 'react';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { type ResumeOpenSourceProject } from '@website-kernel/shared';

const pickPrimaryLink = (p: ResumeOpenSourceProject) => {
  const links = p.links ?? [];
  if (!links.length) return undefined;

  const byLabel = links.find((l) => l.label.toLowerCase().includes('github'));
  if (byLabel) return byLabel;

  const byHost = links.find((l) => {
    try {
      return new URL(l.url).host.includes('github.com');
    } catch {
      return false;
    }
  });
  return byHost ?? links[0];
};

const parseGitHubRepoFullName = (url: string) => {
  try {
    const u = new URL(url);
    if (u.host !== 'github.com') return undefined;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return undefined;
    const owner = parts[0] ?? '';
    const repo = parts[1] ?? '';
    if (!owner || !repo) return undefined;
    return `${owner}/${repo}`;
  } catch {
    return undefined;
  }
};

const formatStars = (n: number) => {
  if (!Number.isFinite(n)) return '';
  if (n >= 1000) {
    const x = (n / 1000).toFixed(1).replace(/\.0$/, '');
    return `${x}k`;
  }
  return String(n);
};

const loadStarCache = () => {
  try {
    const raw = window.localStorage.getItem('resume:github-stars:v1');
    if (!raw) return { ts: 0, map: {} as Record<string, number> };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { ts: 0, map: {} };
    const anyParsed = parsed as { ts?: unknown; map?: unknown };
    const ts = typeof anyParsed.ts === 'number' ? anyParsed.ts : 0;
    const map =
      anyParsed.map && typeof anyParsed.map === 'object'
        ? (anyParsed.map as Record<string, number>)
        : {};
    return { ts, map };
  } catch {
    return { ts: 0, map: {} as Record<string, number> };
  }
};

const saveStarCache = (map: Record<string, number>) => {
  try {
    window.localStorage.setItem(
      'resume:github-stars:v1',
      JSON.stringify({ ts: Date.now(), map }),
    );
  } catch {
    // ignore
  }
};

export function ResumeOpenSourceProjects(props: {
  intro?: Array<string>;
  items: Array<ResumeOpenSourceProject>;
  onRemoteDataLoadingChange?: (loading: boolean) => void;
}) {
  const intro = props.intro ?? [];
  if (!props.items.length && !intro.length) return null;

  const fullNames = useMemo(() => {
    return props.items
      .map((p) => {
        const href = pickPrimaryLink(p)?.url;
        if (!href) return undefined;
        return parseGitHubRepoFullName(href);
      })
      .filter((x): x is string => Boolean(x));
  }, [props.items]);

  const [starsMap, setStarsMap] = useState<Record<string, number>>({});

  const sortedItems = useMemo(() => {
    const getStars = (p: ResumeOpenSourceProject) => {
      const href = pickPrimaryLink(p)?.url;
      const full = href ? parseGitHubRepoFullName(href) : undefined;
      const v = full ? starsMap[full] : undefined;
      if (typeof v === 'number') return v;
      if (typeof p.stars === 'number') return p.stars;
      return 0;
    };

    return [...props.items].sort((a, b) => {
      const sa = getStars(a);
      const sb = getStars(b);
      if (sb !== sa) return sb - sa;
      return a.name.localeCompare(b.name);
    });
  }, [props.items, starsMap]);

  useEffect(() => {
    if (!fullNames.length) {
      props.onRemoteDataLoadingChange?.(false);
      return;
    }

    const TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const cached = loadStarCache();
    const base = Date.now() - cached.ts < TTL_MS ? cached.map : {};

    const fromYaml: Record<string, number> = {};
    for (const p of props.items) {
      if (typeof p.stars !== 'number') continue;
      const href = pickPrimaryLink(p)?.url;
      if (!href) continue;
      const full = parseGitHubRepoFullName(href);
      if (!full) continue;
      fromYaml[full] = p.stars;
    }

    const merged = { ...base, ...fromYaml };
    setStarsMap(merged);

    const missing = fullNames.filter(
      (full) => typeof merged[full] !== 'number',
    );
    if (!missing.length) {
      props.onRemoteDataLoadingChange?.(false);
      return;
    }

    let canceled = false;
    props.onRemoteDataLoadingChange?.(true);

    const run = async () => {
      const nextMap: Record<string, number> = { ...merged };
      const queue = [...missing];
      const workers = Array.from({ length: 4 }).map(async () => {
        while (queue.length) {
          const full = queue.shift();
          if (!full) break;
          if (canceled) return;

          try {
            const resp = await fetch(`https://api.github.com/repos/${full}`, {
              headers: {
                Accept: 'application/vnd.github+json',
              },
            });
            if (!resp.ok) continue;
            const json = (await resp.json()) as unknown;
            const stars =
              json &&
              typeof json === 'object' &&
              typeof (json as { stargazers_count?: unknown })
                .stargazers_count === 'number'
                ? Math.max(
                    0,
                    Math.round(
                      (json as { stargazers_count: number }).stargazers_count,
                    ),
                  )
                : undefined;
            if (typeof stars === 'number') nextMap[full] = stars;
          } catch {
            // ignore
          }
        }
      });

      await Promise.all(workers);
      if (canceled) return;
      setStarsMap(nextMap);
      saveStarCache(nextMap);
      props.onRemoteDataLoadingChange?.(false);
    };

    void run();
    return () => {
      canceled = true;
      props.onRemoteDataLoadingChange?.(false);
    };
  }, [fullNames, props.items, props.onRemoteDataLoadingChange]);

  return (
    <div>
      {intro.length ? (
        <div className="mb-3 px-0 py-0">
          {intro.map((t, idx) => (
            <p
              key={idx}
              className={
                'text-[13px] font-medium leading-6 text-zinc-700' +
                (idx === 0 ? '' : ' mt-2')
              }
            >
              {t}
            </p>
          ))}
        </div>
      ) : null}

      <div
        data-export-keep-together="strict"
        className="overflow-hidden rounded-[3px] border border-zinc-200/70 bg-zinc-50/60"
      >
        <ul className="divide-y divide-zinc-200/70 px-4 py-3">
          {sortedItems.map((p) => {
            const primary = pickPrimaryLink(p);
            const href = primary?.url;
            const full = href ? parseGitHubRepoFullName(href) : undefined;
            const stars = full ? starsMap[full] : undefined;

            return (
              <li
                key={p.name}
                data-export-keep-together="true"
                className="py-3"
              >
                <div className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-2">
                  <GitHubLogoIcon className="mt-0.5 h-3.5 w-3.5 text-zinc-500" />

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <div className="min-w-0 flex-1">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden whitespace-nowrap text-sm font-medium text-zinc-900 hover:underline"
                            title={href}
                          >
                            {p.name}
                          </a>
                        ) : (
                          <span className="block overflow-hidden whitespace-nowrap text-sm font-medium text-zinc-900">
                            {p.name}
                          </span>
                        )}
                      </div>

                      <span className="ml-auto flex shrink-0 items-baseline gap-2">
                        {p.description ? (
                          <span className="hidden max-w-55 truncate font-mono text-[10px] font-medium tracking-[0.04em] text-zinc-400 sm:inline">
                            {p.description}
                          </span>
                        ) : null}

                        <span className="text-xs font-semibold text-zinc-600">
                          <span className="inline-flex w-16 items-baseline justify-end gap-1 tabular-nums">
                            <span className="text-zinc-600">★</span>
                            <span className="text-right">
                              {typeof stars === 'number'
                                ? formatStars(stars)
                                : '—'}
                            </span>
                          </span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
