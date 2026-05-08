import { normalizeResumeModel, type ResumeModel } from '@website-kernel/resume';

declare const __RESUME_JSON__: string;

const RESUME_MODEL: ResumeModel = normalizeResumeModel(
  JSON.parse(__RESUME_JSON__),
);

export function loadResumeModel() {
  return RESUME_MODEL;
}
