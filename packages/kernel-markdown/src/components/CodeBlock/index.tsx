import { useEffect, useState, type ComponentProps } from 'react';
import hljs from 'highlight.js';

import { copyToClipboard } from '#markdown/components/Clipboard';
import '#markdown/components/CodeBlock/index.css';

const parseCodeMeta = (className?: string) => {
  const languageMatch = /language-([^\s]+)/.exec(className ?? '');
  const languageValue = languageMatch?.[1] ?? 'text';
  const [rawLanguage = 'text', rawMeta = ''] = languageValue.split('--meta-');
  const highlightLines = new Set<number>();
  const normalizedMeta = rawMeta.replace(/_/g, ' ');
  const showLineNumbers = /(?:^|[^A-Za-z0-9-])ln(?:$|[^A-Za-z0-9-])/.test(
    normalizedMeta,
  );

  for (const match of rawMeta.matchAll(/\{([^}]+)\}/g)) {
    for (const part of match[1].split(',')) {
      const rangeMatch = /^\s*(\d+)(?:-(\d+))?\s*$/.exec(part);
      if (!rangeMatch) continue;

      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2] ?? rangeMatch[1]);
      if (!Number.isInteger(start) || !Number.isInteger(end)) continue;

      for (let line = start; line <= end; line += 1) {
        if (line > 0) highlightLines.add(line);
      }
    }
  }

  return { rawLanguage, highlightLines, showLineNumbers };
};

const normalizeHljsLanguage = (language: string) => {
  const key = language.toLowerCase();
  const aliasMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml',
    md: 'markdown',
  };
  return aliasMap[key] ?? key;
};

const highlightCodeToHtml = (code: string, rawLanguage: string) => {
  const language = normalizeHljsLanguage(rawLanguage);

  if (hljs.getLanguage(language)) {
    return {
      html: hljs.highlight(code, { language }).value,
      display: rawLanguage,
    };
  }

  const result = hljs.highlightAuto(code);
  return {
    html: result.value,
    display: result.language ?? rawLanguage,
  };
};

export const MdxPre = (
  props: ComponentProps<'pre'> & { children?: unknown },
) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );

  useEffect(() => {
    if (copyStatus === 'idle') return;
    const timer = window.setTimeout(() => setCopyStatus('idle'), 900);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const child = Array.isArray(props.children)
    ? props.children[0]
    : props.children;

  if (child && typeof child === 'object' && 'props' in (child as any)) {
    const codeProps = (child as any).props as {
      className?: string;
      children?: unknown;
    };
    const { rawLanguage, highlightLines, showLineNumbers } = parseCodeMeta(
      codeProps.className,
    );
    const code = String(codeProps.children ?? '').replace(/\n$/, '');
    const { html, display } = highlightCodeToHtml(code, rawLanguage);
    const label = (display || rawLanguage || 'txt').toLowerCase();
    const copyText = copyStatus === 'copied' ? '已复制' : '复制';
    const lines = html.split('\n');
    const lineNumbers = Array.from({ length: lines.length }, (_, index) =>
      String(index + 1),
    );

    return (
      <div
        className={
          copyStatus === 'copied'
            ? 'markdown-prose-pre markdown-prose-pre--copied'
            : 'markdown-prose-pre'
        }
      >
        <div className="markdown-prose-code-block">
          <div className="markdown-prose-code-meta">
            <button
              type="button"
              className={
                copyStatus === 'copied'
                  ? 'markdown-prose-code-copy markdown-prose-code-copy--copied'
                  : 'markdown-prose-code-copy'
              }
              aria-label={`复制 ${label} 代码`}
              onClick={(event) => {
                if (event.detail > 0) {
                  event.currentTarget.blur();
                }
                void (async () => {
                  setCopyStatus('idle');
                  const ok = await copyToClipboard(code);
                  setCopyStatus(ok ? 'copied' : 'failed');
                })();
              }}
            >
              <span className="markdown-prose-code-copy-label">{copyText}</span>
            </button>
            <span className="markdown-prose-code-lang" aria-hidden="true">
              {label}
            </span>
          </div>
          <code className={`markdown-prose-code hljs language-${rawLanguage}`}>
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              return (
                <span
                  key={lineNumber}
                  className={[
                    'markdown-prose-code-line',
                    showLineNumbers ? '' : 'markdown-prose-code-line--single',
                    highlightLines.has(lineNumber)
                      ? 'markdown-prose-code-line--highlight'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {showLineNumbers ? (
                    <span className="markdown-prose-code-line-number">
                      {lineNumbers[index]}
                    </span>
                  ) : null}
                  <span
                    className="markdown-prose-code-line-content"
                    dangerouslySetInnerHTML={{ __html: line || ' ' }}
                  />
                </span>
              );
            })}
          </code>
        </div>
      </div>
    );
  }

  return <div className="markdown-prose-pre">{props.children}</div>;
};
