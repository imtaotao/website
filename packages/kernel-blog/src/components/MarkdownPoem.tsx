import type { ReactNode } from 'react';
import '#blog/components/MarkdownPoem.css';

type PoemStanza = string | Array<string>;

export type BlogMdxPoemProps = {
  title: string;
  author: string;
  dynasty?: string;
  preface?: string | Array<string>;
  lines: Array<PoemStanza>;
  className?: string;
  children?: ReactNode;
};

export function BlogMdxPoem(props: BlogMdxPoemProps) {
  const { title, author, dynasty, preface, lines, className } = props;
  const byline = dynasty ? `${dynasty} · ${author}` : author;
  const prefaceLines = Array.isArray(preface)
    ? preface
    : preface
    ? [preface]
    : [];

  return (
    <section className={['blog-poem', className].filter(Boolean).join(' ')}>
      <header className="blog-poem-header">
        <h3 className="blog-poem-title">{title}</h3>
        <p className="blog-poem-byline">{byline}</p>
      </header>

      {prefaceLines.length ? (
        <div className="blog-poem-preface">
          {prefaceLines.map((line, lineIndex) => (
            <p
              key={`${title}-preface-${lineIndex}`}
              className="blog-poem-preface-line"
            >
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="blog-poem-body">
        {lines.map((stanza, stanzaIndex) => {
          const stanzaLines = Array.isArray(stanza) ? stanza : [stanza];

          return (
            <div key={`${title}-${stanzaIndex}`} className="blog-poem-stanza">
              {stanzaLines.map((line, lineIndex) => (
                <p
                  key={`${title}-${stanzaIndex}-${lineIndex}`}
                  className="blog-poem-line"
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
