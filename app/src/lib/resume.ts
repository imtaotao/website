import { normalizeResumeModel, type ResumeModel } from '@website-kernel/resume';
import resumeJson from 'virtual:resume-json';

const RESUME_MODEL: ResumeModel = normalizeResumeModel(JSON.parse(resumeJson));

export function loadResumeModel() {
  return RESUME_MODEL;
}
