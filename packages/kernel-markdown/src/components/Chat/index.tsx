import { MdxDetailsBlock } from '#markdown/components/DetailsBlock';
import '#markdown/components/Chat/index.css';

type ChatMessage = {
  align?: 'left' | 'right';
  avatar?: string;
  name?: string;
  content: string | Array<string>;
};

export type MdxChatThreadProps = {
  title?: string;
  messages: Array<ChatMessage>;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export function MdxChatThread(props: MdxChatThreadProps) {
  const {
    title,
    messages,
    className,
    collapsible,
    defaultOpen = false,
  } = props;
  const getAvatar = (avatar: string) => {
    switch (avatar) {
      case 'user':
        return '🙂';
      case 'assistant':
        return '🤖';
      case 'sparkles':
        return '✨';
      case 'cat':
        return '🐱';
      case 'idea':
        return '🧑‍💻';
      case 'book':
        return '📘';
      case 'moon':
        return '🧑';
      default:
        return avatar;
    }
  };

  return (
    <section className={['markdown-chat', className].filter(Boolean).join(' ')}>
      {collapsible ? (
        <MdxDetailsBlock
          title={title ?? '对话记录'}
          defaultOpen={defaultOpen}
          className="markdown-chat-details"
        >
          <ChatMessages messages={messages} getAvatar={getAvatar} />
        </MdxDetailsBlock>
      ) : (
        <>
          {title ? (
            <header className="markdown-chat-header">
              <h3 className="markdown-chat-title">{title}</h3>
            </header>
          ) : null}
          <ChatMessages messages={messages} getAvatar={getAvatar} />
        </>
      )}
    </section>
  );
}

type ChatMessagesProps = {
  messages: Array<ChatMessage>;
  getAvatar: (avatar: string) => string;
};

function ChatMessages(props: ChatMessagesProps) {
  const { messages, getAvatar } = props;

  return (
    <div className="markdown-chat-list">
      {messages.map((message, index) => {
        const lines = Array.isArray(message.content)
          ? message.content
          : [message.content];
        const align = message.align ?? 'left';
        const avatar =
          message.avatar ?? (align === 'right' ? 'user' : 'assistant');
        const avatarClass = /^[a-z0-9-]+$/i.test(avatar)
          ? `markdown-chat-item--avatar-${avatar}`
          : '';

        return (
          <article
            key={`${align}-${avatar}-${index}`}
            className={[
              'markdown-chat-item',
              `markdown-chat-item--${align}`,
              avatarClass,
            ].join(' ')}
          >
            <div className="markdown-chat-meta">
              <span className="markdown-chat-avatar" aria-hidden="true">
                {getAvatar(avatar)}
              </span>
              {message.name ? (
                <p className="markdown-chat-name">{message.name}</p>
              ) : null}
            </div>
            <div className="markdown-chat-bubble-wrap">
              <div className="markdown-chat-bubble">
                {lines.map((line, lineIndex) => (
                  <p
                    key={`${align}-${avatar}-${index}-${lineIndex}`}
                    className="markdown-chat-line"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
