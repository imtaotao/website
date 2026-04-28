import { type ReactNode, useCallback, useRef, useState } from 'react';
import { type ResumeBasics } from '@website-kernel/shared';
import {
  EnvelopeClosedIcon,
  GitHubLogoIcon,
  GlobeIcon,
  Link2Icon,
  MobileIcon,
  ReaderIcon,
} from '@radix-ui/react-icons';
import zhihuIconUrl from '#app/assets/image/zhihu.svg';
import defaultAvatarUrl from '#app/assets/image/avatar.jpg';
import { copyToClipboard } from '#app/lib/clipboard';

const iconClassName = 'h-3.5 w-3.5 text-zinc-500';
const socialIconClassName = 'h-4 w-4 text-zinc-500';

const ContactItem = (props: {
  icon: ReactNode;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      title="点击复制"
      onClick={props.onCopy}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') props.onCopy();
      }}
      className={
        'inline-flex select-text items-center gap-2 rounded-md border border-transparent px-3.5 py-2 text-xs font-medium ' +
        'cursor-copy transition-colors ' +
        (props.copied
          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
          : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100')
      }
    >
      {props.icon}
      <span className="leading-none">{props.text}</span>
      {props.copied ? (
        <span className="ml-1 whitespace-nowrap text-[10px] font-semibold tracking-wide">
          已复制
        </span>
      ) : null}
    </div>
  );
};

const Avatar = (props: { name: string; src?: string }) => {
  const initial = (props.name || '?').trim().slice(-1);
  return (
    <div className="h-24 w-24 overflow-hidden rounded-full md:h-28 md:w-28">
      {props.src ? (
        <img
          alt={props.name}
          src={props.src}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-500 md:text-3xl">
          {initial}
        </div>
      )}
    </div>
  );
};

const labelIcon = (label: string) => {
  const key = label.toLowerCase();

  if (key.includes('github')) {
    return <GitHubLogoIcon className={socialIconClassName} />;
  }
  if (key.includes('知乎') || key.includes('zhihu')) {
    return (
      <img
        alt=""
        aria-hidden
        src={zhihuIconUrl}
        className={socialIconClassName}
      />
    );
  }
  return <Link2Icon className={iconClassName} />;
};

export function ResumeHeader(props: { basics: ResumeBasics }) {
  const { basics } = props;
  const hasContacts = Boolean(
    basics.phone || basics.email || basics.location || basics.school,
  );
  const hasLinks = Boolean(basics.links?.length);
  const links = basics.links ?? [];

  const [copiedText, setCopiedText] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const onCopy = useCallback(async (text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopiedText(text);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopiedText(''), 1200);
  }, []);

  return (
    <header className="relative mb-6">
      <div className="absolute right-0 top-10 z-0 md:top-0">
        <Avatar name={basics.name} src={basics.avatar ?? defaultAvatarUrl} />
      </div>

      <div className="pr-28 md:pr-32">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            <a href="/">{basics.name}</a>
          </h1>
          {basics.title ? (
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
              {basics.title}
            </span>
          ) : null}
        </div>

        {hasLinks || hasContacts ? (
          <div className="mt-5 space-y-2">
            {hasLinks ? (
              <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">
                {links.map((l) => (
                  <a
                    key={`${l.label}:${l.url}`}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-950"
                  >
                    {labelIcon(l.label)}
                    <span>{l.label}</span>
                  </a>
                ))}
              </nav>
            ) : null}

            {hasContacts ? (
              <div className="flex flex-wrap items-center gap-2">
                {basics.school ? (
                  <ContactItem
                    icon={<ReaderIcon className={iconClassName} />}
                    text={basics.school}
                    copied={copiedText === basics.school}
                    onCopy={() => onCopy(basics.school!)}
                  />
                ) : null}
                {basics.phone ? (
                  <ContactItem
                    icon={<MobileIcon className={iconClassName} />}
                    text={basics.phone}
                    copied={copiedText === basics.phone}
                    onCopy={() => onCopy(basics.phone!)}
                  />
                ) : null}
                {basics.email ? (
                  <ContactItem
                    icon={<EnvelopeClosedIcon className={iconClassName} />}
                    text={basics.email}
                    copied={copiedText === basics.email}
                    onCopy={() => onCopy(basics.email!)}
                  />
                ) : null}
                {basics.location ? (
                  <ContactItem
                    icon={<GlobeIcon className={iconClassName} />}
                    text={basics.location}
                    copied={copiedText === basics.location}
                    onCopy={() => onCopy(basics.location!)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
