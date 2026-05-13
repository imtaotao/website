import '#markdown/components/SummaryCards/index.css';
type SummaryCardItem = {
  title: string;
  content: string | Array<string>;
};

export type MdxSummaryCardsProps = {
  items: Array<SummaryCardItem>;
  className?: string;
};

export function MdxSummaryCards(props: MdxSummaryCardsProps) {
  const { items, className } = props;

  return (
    <section
      className={['markdown-summary-cards', className]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item, index) => {
        const lines = Array.isArray(item.content)
          ? item.content
          : [item.content];

        return (
          <article
            key={`${item.title}-${index}`}
            className="markdown-summary-card"
          >
            <h3 className="markdown-summary-card-title">{item.title}</h3>
            <div className="markdown-summary-card-body">
              {lines.map((line, lineIndex) => (
                <p
                  key={`${item.title}-${index}-${lineIndex}`}
                  className="markdown-summary-card-line"
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
