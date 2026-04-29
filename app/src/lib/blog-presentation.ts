export const formatBlogDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
};

export const formatBlogMeta = (tags: Array<string>) => {
  if (tags.length === 0) {
    return '未分类';
  }

  return tags.join(' / ');
};
