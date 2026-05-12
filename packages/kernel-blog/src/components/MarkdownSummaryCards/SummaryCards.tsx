import '#blog/components/MarkdownSummaryCards/SummaryCards.css';

type SummaryCardItem = {
  title: string;
  content: string | Array<string>;
};

export type BlogMdxSummaryCardsProps = {
  items: Array<SummaryCardItem>;
  className?: string;
};

export function BlogMdxSummaryCards(props: BlogMdxSummaryCardsProps) {
  const { items, className } = props;

  return (
    <section
      className={['blog-summary-cards', className].filter(Boolean).join(' ')}
    >
      {items.map((item, index) => {
        const lines = Array.isArray(item.content)
          ? item.content
          : [item.content];

        return (
          <article key={`${item.title}-${index}`} className="blog-summary-card">
            <h3 className="blog-summary-card-title">{item.title}</h3>
            <div className="blog-summary-card-body">
              {lines.map((line, lineIndex) => (
                <p
                  key={`${item.title}-${index}-${lineIndex}`}
                  className="blog-summary-card-line"
                >
                  {line}
                </p>
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
