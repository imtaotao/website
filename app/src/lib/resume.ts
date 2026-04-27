import { parse } from 'yaml';
import { normalizeResumeModel, type ResumeModel } from '@website-kernel/shared';
import resumeYamlText from '#app/content/resume.yaml?raw';

const RESUME_MODEL: ResumeModel = normalizeResumeModel(parse(resumeYamlText));

export function loadResumeModel(): ResumeModel {
  return RESUME_MODEL;
}
