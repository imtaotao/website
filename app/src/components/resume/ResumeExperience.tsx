import { useCallback, useRef, useState } from 'react';
import { type ResumeExperience } from '@website-kernel/shared';
import { CodeIcon, HomeIcon, RocketIcon } from '@radix-ui/react-icons';

import zhenaiIconUrl from '#app/assets/image/zhenai.svg';
import codemonIconUrl from '#app/assets/image/codemon.svg';
import tencentIconUrl from '#app/assets/image/tencent.svg';
import bytedanceIconUrl from '#app/assets/image/bytedance.svg';
import { copyToClipboard } from '#app/lib/browser';

const formatRange = (startAt: string, endAt: string): string => {
  const end = endAt === 'present' ? '至今' : endAt;
  return `${startAt} — ${end}`;
};

const isYearMonth = (s: string) => /^\d{4}-\d{2}$/.test(s);

const minYearMonth = (a: string, b: string) => {
  if (!isYearMonth(a)) return b;
  if (!isYearMonth(b)) return a;
  return a.localeCompare(b) <= 0 ? a : b;
};

const maxEndDate = (a: string, b: string) => {
  // present 最大
  if (a === 'present' || b === 'present') return 'present';
  if (!isYearMonth(a)) return b;
  if (!isYearMonth(b)) return a;
  return a.localeCompare(b) >= 0 ? a : b;
};

type HighlightKind = 'business' | 'tech' | 'other';

type CompanyLogoSpec = {
  match: (company: string) => boolean;
  className: string;
  render?: (company: string) => React.ReactNode;
  label?: string;
  iconSrc?: string;
};

const COMPANY_LOGO_SPEC: Array<CompanyLogoSpec> = [
  {
    match: (c) => c.includes('字节'),
    iconSrc: bytedanceIconUrl,
    className: 'bg-white',
  },
  {
    match: (c) => c.includes('腾讯'),
    iconSrc: tencentIconUrl,
    className: 'bg-white',
  },
  {
    match: (c) => c.includes('珍爱'),
    iconSrc: zhenaiIconUrl,
    className: 'bg-white',
  },
  {
    match: (c) => c.includes('编程猫'),
    iconSrc: codemonIconUrl,
    className: 'bg-white',
  },
  {
    match: (c) => c.includes('湖南'),
    label: 'H',
    className: 'bg-[#0b6f60] text-white',
  },
];

const companyInitial = (company: string) => {
  const s = company.trim();
  if (!s) return '?';
  const first = s[0] ?? '?';
  // 英文公司用首字母大写；中文/其它字符直接用首字符
  if (/[a-zA-Z]/.test(first)) return first.toUpperCase();
  return first;
};

const CompanyLogo = (props: { company: string }) => {
  const name = props.company;
  const base =
    'inline-flex h-4 w-4 items-center justify-center overflow-hidden rounded-[4px] text-[10px] font-bold leading-none';

  const spec = COMPANY_LOGO_SPEC.find((s) => s.match(name));
  if (spec) {
    return (
      <span aria-hidden className={base + ' ' + spec.className} title={name}>
        {spec.iconSrc ? (
          <img alt="" aria-hidden src={spec.iconSrc} className="h-4 w-4" />
        ) : spec.render ? (
          spec.render(name)
        ) : (
          spec.label ?? companyInitial(name)
        )}
      </span>
    );
  }

  return <HomeIcon className="h-4 w-4 text-zinc-400" />;
};

const HighlightKindIcon = (props: { kind: HighlightKind }) => {
  if (props.kind === 'business') {
    return (
      <RocketIcon className="mt-1.25 h-3.5 w-3.5 shrink-0 text-zinc-500" />
    );
  }
  if (props.kind === 'tech') {
    return <CodeIcon className="mt-1.25 h-3.5 w-3.5 shrink-0 text-zinc-500" />;
  }
  return (
    <span className="mt-2.5 h-0.75 w-0.75 shrink-0 rounded-full bg-zinc-300" />
  );
};

const renderHighlightText = (text: string) => {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  const hasUrl = parts.some((p) => /^https?:\/\//.test(p));
  if (!hasUrl) return text;

  return parts.map((p, idx) => {
    if (/^https?:\/\//.test(p)) {
      const href = p;
      return (
        <a
          key={`${idx}:${href}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-600"
        >
          {href}
        </a>
      );
    }

    return <span key={idx}>{p}</span>;
  });
};

const collectHighlights = (e: ResumeExperience) => {
  const result: Array<{ kind: HighlightKind; text: string }> = [];
  for (const h of e.businessHighlights ?? []) {
    result.push({ kind: 'business', text: h });
  }
  for (const h of e.techHighlights ?? []) {
    result.push({ kind: 'tech', text: h });
  }
  for (const h of e.highlights ?? []) {
    result.push({ kind: 'other', text: h });
  }
  return result;
};

export function ResumeExperienceList(props: {
  items: Array<ResumeExperience>;
}) {
  if (!props.items.length) return null;

  const [copiedKey, setCopiedKey] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const onCopy = useCallback(async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopiedKey(key);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopiedKey(''), 1200);
  }, []);

  const companies: Array<{
    company: string;
    departments: Array<{ department?: string; items: Array<ResumeExperience> }>;
  }> = [];

  const companyIndex = new Map<
    string,
    {
      company: string;
      departments: Array<{
        department?: string;
        items: Array<ResumeExperience>;
      }>;
      departmentIndex: Map<
        string,
        { department?: string; items: Array<ResumeExperience> }
      >;
    }
  >();

  for (const e of props.items) {
    const companyKey = e.company || '未命名公司';
    let companyGroup = companyIndex.get(companyKey);
    if (!companyGroup) {
      companyGroup = {
        company: companyKey,
        departments: [],
        departmentIndex: new Map(),
      };
      companyIndex.set(companyKey, companyGroup);
      companies.push({
        company: companyKey,
        departments: companyGroup.departments,
      });
    }

    const departmentKey = (e.department ?? '').trim();
    let depGroup = companyGroup.departmentIndex.get(departmentKey);
    if (!depGroup) {
      depGroup = {
        department: departmentKey ? departmentKey : undefined,
        items: [],
      };
      companyGroup.departmentIndex.set(departmentKey, depGroup);
      companyGroup.departments.push(depGroup);
    }

    depGroup.items.push(e);
  }

  return (
    <div className="space-y-10">
      {companies.map((c) =>
        (() => {
          const companyKey = c.company;
          const copied = copiedKey === companyKey;

          const companyBlockText = [
            c.company,
            '',
            ...c.departments.flatMap((d) => {
              const depStartAt = d.items.reduce(
                (acc, cur) => minYearMonth(acc, cur.startAt),
                d.items[0]?.startAt ?? '',
              );
              const depEndAt = d.items.reduce(
                (acc, cur) => maxEndDate(acc, cur.endAt),
                d.items[0]?.endAt ?? '',
              );
              const depRangeText =
                depStartAt && depEndAt ? formatRange(depStartAt, depEndAt) : '';

              const lines: Array<string> = [];
              const header = `${d.department ? d.department : ''}${
                depRangeText ? ` (${depRangeText})` : ''
              }`.trim();
              if (header) lines.push(header);

              for (const e of d.items) {
                if (e.role) lines.push(e.role);
                const hl = collectHighlights(e).map((x) => `- ${x.text}`);
                lines.push(...hl);
                lines.push('');
              }

              if (lines.length && lines[lines.length - 1] === '') lines.pop();
              return lines.length ? [...lines, ''] : [];
            }),
          ]
            .join('\n')
            .trim();

          return (
            <article
              key={c.company}
              data-export-keep-together="strict"
              role="button"
              tabIndex={0}
              title="点击复制"
              onClick={() => onCopy(companyKey, companyBlockText)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  onCopy(companyKey, companyBlockText);
                }
              }}
              className={
                'cursor-copy overflow-hidden rounded-[3px] border px-4 py-4 transition-colors ' +
                (copied
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-zinc-200/70 bg-zinc-50/60 hover:bg-white/60')
              }
            >
              <div className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-900">
                <CompanyLogo company={c.company} />
                <span>{c.company}</span>
                {copied ? (
                  <span className="ml-1 whitespace-nowrap font-sans text-[10px] font-semibold text-emerald-700">
                    <span className="sm:hidden">✓</span>
                    <span className="hidden sm:inline">已复制</span>
                  </span>
                ) : null}
              </div>

              <div className="mt-3 space-y-6">
                {c.departments.map((d) => {
                  const depStartAt = d.items.reduce(
                    (acc, cur) => minYearMonth(acc, cur.startAt),
                    d.items[0]?.startAt ?? '',
                  );
                  const depEndAt = d.items.reduce(
                    (acc, cur) => maxEndDate(acc, cur.endAt),
                    d.items[0]?.endAt ?? '',
                  );
                  const depRangeText =
                    depStartAt && depEndAt
                      ? formatRange(depStartAt, depEndAt)
                      : '';

                  return (
                    <section
                      key={`${c.company}:${d.department ?? '__default'}`}
                      data-export-keep-together="strict"
                      className="rounded-md px-3 py-2"
                    >
                      {d.department ? (
                        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_140px] items-baseline gap-x-3 text-sm font-semibold text-zinc-700 sm:grid-cols-[minmax(0,1fr)_156px] sm:gap-x-4">
                          <span className="min-w-0">{d.department}</span>
                          <span className="min-w-0 text-right font-mono text-[10px] font-medium tracking-[0.04em] text-zinc-400 sm:text-xs sm:tracking-[0.16em]">
                            {depRangeText}
                          </span>
                        </div>
                      ) : depRangeText ? (
                        <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_140px] items-baseline gap-x-3 sm:grid-cols-[minmax(0,1fr)_156px] sm:gap-x-4">
                          <span />
                          <span className="min-w-0 text-right font-mono text-[10px] font-medium tracking-[0.04em] text-zinc-400 sm:text-xs sm:tracking-[0.16em]">
                            {depRangeText}
                          </span>
                        </div>
                      ) : null}

                      <div
                        className={
                          d.department
                            ? 'mt-3 space-y-6 md:mt-2 md:space-y-5'
                            : 'space-y-6 md:space-y-5'
                        }
                      >
                        {d.items.map((e, idx) => {
                          const items = collectHighlights(e);

                          return (
                            <div
                              key={`${idx}:${e.company}:${e.department ?? ''}:${
                                e.role
                              }:${e.startAt}:${e.endAt}`}
                              data-export-keep-together="strict"
                            >
                              {e.role ? (
                                <div className="text-sm font-semibold text-zinc-900">
                                  {e.role}
                                </div>
                              ) : null}

                              {items.length ? (
                                <ul className="resume-work-font mt-3 space-y-2 text-[13px] font-medium leading-6 text-zinc-800 md:mt-2 md:space-y-1.5 md:text-[14px] md:leading-5">
                                  {items.map((it, i) => {
                                    const textClassName = 'text-zinc-800';

                                    return (
                                      <li
                                        key={`${idx}:${i}:${it.kind}:${it.text}`}
                                        className={
                                          'flex gap-3 md:gap-2 ' + textClassName
                                        }
                                      >
                                        <HighlightKindIcon kind={it.kind} />
                                        <span className="flex-1 select-text">
                                          {renderHighlightText(it.text)}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </article>
          );
        })(),
      )}
    </div>
  );
}
