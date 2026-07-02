import { Card, Grid } from 'willa';

export type SummaryCardItem = {
  title: string;
  content: string | Array<string>;
};

export type SummaryCardsProps = {
  items: Array<SummaryCardItem>;
  className?: string;
};

const normalizeSummaryLines = (content: SummaryCardItem['content']) => {
  return Array.isArray(content) ? content : [content];
};

export function SummaryCards(props: SummaryCardsProps) {
  const { items, className } = props;

  return (
    <Grid
      as="section"
      columns={2}
      gap="lg"
      className={['blog-summary-cards', className].filter(Boolean).join(' ')}
    >
      {items.map((item, index) => (
        <Card
          key={`${item.title}-${index}`}
          variant="soft"
          padding="md"
          title={item.title}
          className="blog-summary-card"
        >
          {normalizeSummaryLines(item.content).map((line, lineIndex) => (
            <p
              key={`${item.title}-${index}-${lineIndex}`}
              className="blog-summary-card-line"
            >
              {line}
            </p>
          ))}
        </Card>
      ))}
    </Grid>
  );
}
