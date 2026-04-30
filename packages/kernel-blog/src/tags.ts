import type { BlogTagMap } from '#blog/articleTypes';

export const blogTagMap: BlogTagMap = {
  architecture: {
    label: '架构',
    description: '关于内容结构、模块边界和工程建模的文章。',
    order: 10,
  },
  frontend: {
    label: '前端',
    description: '和前端实现、界面细节、交互体验相关的记录。',
    order: 20,
  },
  notes: {
    label: '笔记',
    description: '更轻量的观察、想法和阶段性记录。',
    order: 30,
  },
  writing: {
    label: '写作',
    description: '关于表达方式、文章组织和技术写作节奏的内容。',
    order: 40,
  },
};
