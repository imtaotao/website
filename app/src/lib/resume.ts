import { normalizeResumeModel, type ResumeModel } from '@website-kernel/shared';

declare const __RESUME_JSON__: string;

const RESUME_MODEL: ResumeModel = normalizeResumeModel(
  JSON.parse(__RESUME_JSON__),
);

export function loadResumeModel(): ResumeModel {
  return RESUME_MODEL;
}
