import type { ReactNode } from 'react';
import '#markdown/components/Poem/index.css';

type PoemStanza = string | Array<string>;

export type MdxPoemProps = {
  title: string;
  author: string;
  dynasty?: string;
  preface?: string | Array<string>;
  lines: Array<PoemStanza>;
  className?: string;
  children?: ReactNode;
};

export function MdxPoem(props: MdxPoemProps) {
  const { title, author, dynasty, preface, lines, className } = props;
  const byline = dynasty ? `${dynasty} · ${author}` : author;
  const prefaceLines = Array.isArray(preface)
    ? preface
    : preface
    ? [preface]
    : [];

  return (
    <section className={['markdown-poem', className].filter(Boolean).join(' ')}>
      <header className="markdown-poem-header">
        <h3 className="markdown-poem-title">{title}</h3>
        <p className="markdown-poem-byline">{byline}</p>
      </header>

      {prefaceLines.length ? (
        <div className="markdown-poem-preface">
          {prefaceLines.map((line, lineIndex) => (
            <p
              key={`${title}-preface-${lineIndex}`}
              className="markdown-poem-preface-line"
            >
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="markdown-poem-body">
        {lines.map((stanza, stanzaIndex) => {
          const stanzaLines = Array.isArray(stanza) ? stanza : [stanza];

          return (
            <div
              key={`${title}-${stanzaIndex}`}
              className="markdown-poem-stanza"
            >
              {stanzaLines.map((line, lineIndex) => (
                <p
                  key={`${title}-${stanzaIndex}-${lineIndex}`}
                  className="markdown-poem-line"
                >
                  {line}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
