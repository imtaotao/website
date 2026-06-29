import { Card, Grid } from 'willa';

export type BlogSummaryCardItem = {
  title: string;
  content: string | Array<string>;
};

export type BlogSummaryCardsProps = {
  items: Array<BlogSummaryCardItem>;
  className?: string;
};

const normalizeSummaryLines = (content: BlogSummaryCardItem['content']) => {
  return Array.isArray(content) ? content : [content];
};

export function BlogSummaryCards(props: BlogSummaryCardsProps) {
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
