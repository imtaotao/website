export type ResumeSchemaVersion = 1;

export type ResumeLink = {
  label: string;
  url: string;
};

export type ResumeBasics = {
  name: string;
  title: string;
  school?: string;
  avatar?: string;
  location?: string;
  phone?: string;
  email?: string;
  links?: Array<ResumeLink>;
};

export type ResumeSkillItem = {
  name: string;
  level: number; // 1-100
};

export type ResumeSkillGroup = {
  category: string;
  items: Array<ResumeSkillItem>;
};

export type ResumeExperience = {
  company: string;
  department?: string;
  role: string;
  startAt: string; // YYYY-MM
  endAt: string; // YYYY-MM | present
  businessHighlights?: Array<string>;
  techHighlights?: Array<string>;
  highlights: Array<string>;
};

export type ResumeOpenSourceProject = {
  name: string;
  description?: string;
  links?: Array<ResumeLink>;
  stars?: number;
};

export type ResumeModel = {
  schemaVersion: ResumeSchemaVersion;
  basics: ResumeBasics;
  summary: Array<string>;
  skills: Array<ResumeSkillGroup>;
  openSourceProjectsIntro: Array<string>;
  openSourceProjects: Array<ResumeOpenSourceProject>;
  experiences: Array<ResumeExperience>;
};

/**
 * 简历源数据（来自 YAML/JSON）的输入类型。
 *
 * 之所以 `normalizeResumeModel` 的实现仍使用 `unknown`：
 * - YAML/JSON 解析结果在运行时是不可信的（可能缺字段/类型不对）
 * - 用 `unknown` 强制走一次规范化/兜底逻辑，避免误把脏数据当作已校验的类型
 *
 * 这个类型主要用于：编辑器提示、复用字段结构、以及在 TS 场景下约束输入。
 */
export type ResumeLinkInput = ResumeLink;

export type ResumeBasicsInput = Partial<Omit<ResumeBasics, 'links'>> & {
  links?: Array<ResumeLinkInput>;
};

export type ResumeSkillItemInput = {
  name: string;
  level?: number;
};

export type ResumeSkillGroupInput = {
  category: string;
  items?: Array<ResumeSkillItemInput>;
};

export type ResumeExperienceInput = {
  company: string;
  department?: string;
  role: string;
  startAt: string;
  endAt: string;
  businessHighlights?: Array<string>;
  techHighlights?: Array<string>;
  highlights?: Array<string>;
};

export type ResumeOpenSourceProjectInput = {
  /** 新字段 */
  name?: string;
  /** 旧字段 */
  title?: string;
  description?: string;
  /** 旧字段 */
  summary?: string;
  links?: Array<ResumeLinkInput>;
  stars?: number;
};

export type ResumeModelInput = {
  schemaVersion?: ResumeSchemaVersion;
  basics?: ResumeBasicsInput;
  summary?: Array<string>;
  skills?: Array<ResumeSkillGroupInput>;
  openSourceProjectsIntro?: Array<string>;
  openSourceProjects?: Array<ResumeOpenSourceProjectInput>;
  experiences?: Array<ResumeExperienceInput>;
  /** legacy */
  projectsIntro?: Array<string>;
  /** legacy */
  projects?: Array<ResumeOpenSourceProjectInput>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown) => {
  return typeof value === 'string' ? value : undefined;
};

const asText = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
};

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
};

const clampInt = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const n = Math.round(value);
  return Math.min(max, Math.max(min, n));
};

const compareResumeDateDesc = (a: string, b: string) => {
  // present 排在最前
  if (a === 'present' && b !== 'present') return -1;
  if (b === 'present' && a !== 'present') return 1;

  // 期望 YYYY-MM，无法解析则保持原顺序
  const ax = /^\d{4}-\d{2}$/.test(a) ? a : '';
  const bx = /^\d{4}-\d{2}$/.test(b) ? b : '';
  if (!ax || !bx) return 0;
  return bx.localeCompare(ax);
};

const splitLegacyHighlights = (items: Array<string>) => {
  const business: Array<string> = [];
  const tech: Array<string> = [];
  const other: Array<string> = [];

  for (const raw of items) {
    const text = raw.trim();
    if (!text) continue;

    const normalize = (s: string) => s.replace(/^[\s\-•]+/, '').trim();

    if (/^(业务侧|业务)[:：]/.test(text)) {
      // 保留前缀文本，只用于分组/渲染差异
      business.push(normalize(text));
      continue;
    }
    if (/^(技术侧|技术)[:：]/.test(text)) {
      // 保留前缀文本，只用于分组/渲染差异
      tech.push(normalize(text));
      continue;
    }

    other.push(normalize(text));
  }

  return { business, tech, other };
};

export function normalizeResumeModel(input: ResumeModelInput) {
  const root = isRecord(input) ? input : {};

  const basicsRaw = isRecord(root.basics) ? root.basics : {};
  const linksRaw = Array.isArray(basicsRaw.links) ? basicsRaw.links : [];
  const links: Array<ResumeLink> = linksRaw
    .map((v) => {
      if (!isRecord(v)) return undefined;
      const label = asString(v.label);
      const url = asString(v.url);
      if (!label || !url) return undefined;
      return { label, url };
    })
    .filter((v): v is ResumeLink => Boolean(v));

  const basics: ResumeBasics = {
    name: asString(basicsRaw.name) ?? '',
    title: asString(basicsRaw.title) ?? '',
    school: asString(basicsRaw.school),
    avatar: asString(basicsRaw.avatar),
    location: asString(basicsRaw.location),
    phone: asText(basicsRaw.phone),
    email: asString(basicsRaw.email),
    links: links.length ? links : undefined,
  };

  const summary = asStringArray(root.summary);

  const skillsRaw = Array.isArray(root.skills) ? root.skills : [];
  const skills: Array<ResumeSkillGroup> = skillsRaw
    .map((group) => {
      if (!isRecord(group)) return undefined;
      const category = asString(group.category) ?? '';
      const itemsRaw = Array.isArray(group.items) ? group.items : [];
      const items: Array<ResumeSkillItem> = itemsRaw
        .map((item) => {
          if (!isRecord(item)) return undefined;
          const name = asString(item.name);
          if (!name) return undefined;
          const level = clampInt(item.level, 1, 100, 50);
          return { name, level };
        })
        .filter((v): v is ResumeSkillItem => Boolean(v));
      return { category, items };
    })
    .filter((v): v is ResumeSkillGroup => Boolean(v));

  const openSourceProjectsIntro = Array.isArray(root.openSourceProjectsIntro)
    ? asStringArray(root.openSourceProjectsIntro)
    : asStringArray(root.projectsIntro);

  const projectsRaw = Array.isArray(root.openSourceProjects)
    ? root.openSourceProjects
    : Array.isArray(root.projects)
    ? root.projects
    : [];

  const openSourceProjects: Array<ResumeOpenSourceProject> = projectsRaw
    .map((p) => {
      if (!isRecord(p)) return undefined;
      const name = asString(p.name) ?? asString(p.title) ?? '';
      if (!name) return undefined;

      const description = asString(p.description) ?? asString(p.summary);

      const stars =
        typeof p.stars === 'number' && Number.isFinite(p.stars)
          ? Math.max(0, Math.round(p.stars))
          : undefined;

      const rawLinks = Array.isArray(p.links) ? p.links : [];
      const links: Array<ResumeLink> = rawLinks
        .map((v) => {
          if (!isRecord(v)) return undefined;
          const label = asString(v.label);
          const url = asString(v.url);
          if (!label || !url) return undefined;
          return { label, url };
        })
        .filter((v): v is ResumeLink => Boolean(v));

      return {
        name,
        ...(description ? { description } : {}),
        ...(links.length ? { links } : {}),
        ...(typeof stars === 'number' ? { stars } : {}),
      };
    })
    .filter((v): v is ResumeOpenSourceProject => Boolean(v));

  const experiencesRaw = Array.isArray(root.experiences)
    ? root.experiences
    : [];
  const experiences: Array<ResumeExperience> = experiencesRaw
    .map((exp): ResumeExperience | undefined => {
      if (!isRecord(exp)) return undefined;
      const company = asString(exp.company) ?? '';
      const department = asString(exp.department);
      const role = asString(exp.role) ?? '';
      const startAt = asString(exp.startAt) ?? '';
      const endAt = asString(exp.endAt) ?? '';

      const businessHighlights = asStringArray(exp.businessHighlights);
      const techHighlights = asStringArray(exp.techHighlights);
      const highlightsRaw = asStringArray(exp.highlights);

      const legacySplit =
        businessHighlights.length || techHighlights.length
          ? {
              business: businessHighlights,
              tech: techHighlights,
              other: highlightsRaw,
            }
          : splitLegacyHighlights(highlightsRaw);

      return {
        company,
        ...(department ? { department } : {}),
        role,
        startAt,
        endAt,
        ...(legacySplit.business.length
          ? { businessHighlights: legacySplit.business }
          : {}),
        ...(legacySplit.tech.length
          ? { techHighlights: legacySplit.tech }
          : {}),
        highlights: legacySplit.other,
      };
    })
    .filter((v): v is ResumeExperience => Boolean(v))
    .sort((a, b) => {
      // 先按 endAt，再按 startAt
      const byEnd = compareResumeDateDesc(a.endAt, b.endAt);
      if (byEnd !== 0) return byEnd;
      return compareResumeDateDesc(a.startAt, b.startAt);
    });

  return {
    schemaVersion: 1 as const,
    basics,
    summary,
    skills,
    openSourceProjectsIntro,
    openSourceProjects,
    experiences,
  };
}
