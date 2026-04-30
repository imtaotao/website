import type { BlogTagMap } from '#blog/articleTypes';

export const blogTagMap: BlogTagMap = {
  frontend: {
    label: '前端',
    description: '和前端实现、界面细节、交互体验相关的内容。',
    order: 10,
  },
  ai: {
    label: 'AI',
    description: '和 AI 工具、模型使用、工作流实践相关的内容。',
    order: 20,
  },
  nodejs: {
    label: 'Node.js',
    description: '和 Node.js 生态、服务端脚本、工程工具链相关的内容。',
    order: 30,
  },
  life: {
    label: '生活日常',
    description: '偏生活化的记录、经历和日常观察。',
    order: 40,
  },
  thinking: {
    label: '思考',
    description: '偏抽象一些的判断、取舍、方法论和复盘。',
    order: 50,
  },
  notes: {
    label: '笔记',
    description: '更轻量的记录、摘记和阶段性整理。',
    order: 60,
  },
  other: {
    label: '其他',
    description: '暂时不适合归入其他主分类的内容。',
    order: 70,
  },
};
