import { type ReactNode, useCallback, useRef, useState } from 'react';
import {
  EnvelopeClosedIcon,
  GitHubLogoIcon,
  GlobeIcon,
  Link2Icon,
  MobileIcon,
  ReaderIcon,
} from '@radix-ui/react-icons';
import { Avatar, Badge, Button, Group, Stack } from 'willa';
import { type ResumeBasics } from '#resume/parser';
import type { ResumeImageAssets } from '#resume/assets';

const iconClassName = 'h-3.5 w-3.5 text-zinc-500';
const socialIconClassName = 'h-4 w-4 text-zinc-500';

const ContactItem = (props: {
  icon: ReactNode;
  text: string;
  copied: boolean;
  onCopied: (text: string) => void;
}) => {
  return (
    <Button
      type="button"
      variant="soft"
      size="sm"
      title="点击复制"
      icon={props.icon}
      pressed={props.copied}
      copyText={props.text}
      copiedDuration={1200}
      onCopyText={props.onCopied}
      backgroundColor="rgb(250 250 250)"
      hoverBackgroundColor="rgb(244 244 245)"
      textColor="rgb(82 82 91)"
      hoverTextColor="rgb(82 82 91)"
      className="resume-contact-button"
    >
      <span className="leading-none">{props.text}</span>
      {props.copied ? (
        <span className="resume-contact-copied">已复制</span>
      ) : null}
    </Button>
  );
};

const labelIcon = (label: string, assets?: ResumeImageAssets) => {
  const key = label.toLowerCase();

  if (key.includes('github')) {
    return <GitHubLogoIcon className={socialIconClassName} />;
  }
  if ((key.includes('知乎') || key.includes('zhihu')) && assets?.zhihuIconUrl) {
    return (
      <img
        alt=""
        aria-hidden
        src={assets.zhihuIconUrl}
        className={socialIconClassName}
      />
    );
  }
  return <Link2Icon className={iconClassName} />;
};

const formatSchoolText = (basics: ResumeBasics) => {
  if (!basics.school) return '';
  if (!basics.schoolPeriod) return basics.school;
  return `${basics.school} · ${basics.schoolPeriod}`;
};

const formatLinkUrl = (url: string) => {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

export function ResumeHeader(props: {
  basics: ResumeBasics;
  assets?: ResumeImageAssets;
}) {
  const { basics } = props;
  const schoolText = formatSchoolText(basics);
  const hasContacts = Boolean(
    basics.phone || basics.email || basics.location || schoolText,
  );
  const hasLinks = Boolean(basics.links?.length);
  const links = basics.links ?? [];

  const [copiedText, setCopiedText] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const handleCopied = useCallback((text: string) => {
    setCopiedText(text);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopiedText(''), 1200);
  }, []);

  return (
    <header className="relative mb-6">
      <div className="absolute right-0 top-10 z-0 md:top-0">
        <Avatar
          alt={basics.name}
          name={(basics.name || '?').trim().slice(-1)}
          src={basics.avatar ?? props.assets?.defaultAvatarUrl}
          size="xl"
          shape="circle"
          className="resume-avatar"
        />
      </div>

      <div className="pr-28 md:pr-32">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1 className="relative z-10 py-0.5 text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
            <span
              data-export-resume-name="true"
              className="inline-block select-text"
            >
              {basics.name}
            </span>
          </h1>
          {basics.title ? (
            <Badge
              variant="soft"
              tone="neutral"
              size="sm"
              className="resume-title-badge"
            >
              {basics.title}
            </Badge>
          ) : null}
        </div>

        {hasLinks || hasContacts ? (
          <Stack gap="0.5rem" className="mt-5">
            {hasLinks ? (
              <Group
                as="nav"
                wrap
                gap="0.5rem 1.25rem"
                className="text-xs font-medium"
              >
                {links.map((l) => (
                  <Button
                    key={`${l.label}:${l.url}`}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    variant="link"
                    size="sm"
                    icon={labelIcon(l.label, props.assets)}
                    className="resume-social-link"
                  >
                    <span className="resume-social-label">{l.label}</span>
                    <span className="resume-social-separator">·</span>
                    <span className="resume-social-url">
                      {formatLinkUrl(l.url)}
                    </span>
                  </Button>
                ))}
              </Group>
            ) : null}

            {hasContacts ? (
              <Group wrap gap="0.5rem" align="center">
                {schoolText ? (
                  <ContactItem
                    icon={<ReaderIcon className={iconClassName} />}
                    text={schoolText}
                    copied={copiedText === schoolText}
                    onCopied={handleCopied}
                  />
                ) : null}
                {basics.phone ? (
                  <ContactItem
                    icon={<MobileIcon className={iconClassName} />}
                    text={basics.phone}
                    copied={copiedText === basics.phone}
                    onCopied={handleCopied}
                  />
                ) : null}
                {basics.email ? (
                  <ContactItem
                    icon={<EnvelopeClosedIcon className={iconClassName} />}
                    text={basics.email}
                    copied={copiedText === basics.email}
                    onCopied={handleCopied}
                  />
                ) : null}
                {basics.location ? (
                  <ContactItem
                    icon={<GlobeIcon className={iconClassName} />}
                    text={basics.location}
                    copied={copiedText === basics.location}
                    onCopied={handleCopied}
                  />
                ) : null}
              </Group>
            ) : null}
          </Stack>
        ) : null}
      </div>
    </header>
  );
}
