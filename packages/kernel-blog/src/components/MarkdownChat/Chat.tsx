import { BlogMdxDetailsBlock } from '#blog/components/MarkdownDetailsBlock/DetailsBlock';
import '#blog/components/MarkdownChat/Chat.css';

type ChatMessage = {
  align?: 'left' | 'right';
  avatar?: string;
  name?: string;
  content: string | Array<string>;
};

export type BlogMdxChatThreadProps = {
  title?: string;
  messages: Array<ChatMessage>;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export function BlogMdxChatThread(props: BlogMdxChatThreadProps) {
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
    <section className={['blog-chat', className].filter(Boolean).join(' ')}>
      {collapsible ? (
        <BlogMdxDetailsBlock
          title={title ?? '对话记录'}
          defaultOpen={defaultOpen}
          className="blog-chat-details"
        >
          <ChatMessages messages={messages} getAvatar={getAvatar} />
        </BlogMdxDetailsBlock>
      ) : (
        <>
          {title ? (
            <header className="blog-chat-header">
              <h3 className="blog-chat-title">{title}</h3>
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
    <div className="blog-chat-list">
      {messages.map((message, index) => {
        const lines = Array.isArray(message.content)
          ? message.content
          : [message.content];
        const align = message.align ?? 'left';
        const avatar =
          message.avatar ?? (align === 'right' ? 'user' : 'assistant');
        const avatarClass = /^[a-z0-9-]+$/i.test(avatar)
          ? `blog-chat-item--avatar-${avatar}`
          : '';

        return (
          <article
            key={`${align}-${avatar}-${index}`}
            className={[
              'blog-chat-item',
              `blog-chat-item--${align}`,
              avatarClass,
            ].join(' ')}
          >
            <div className="blog-chat-meta">
              <span className="blog-chat-avatar" aria-hidden="true">
                {getAvatar(avatar)}
              </span>
              {message.name ? (
                <p className="blog-chat-name">{message.name}</p>
              ) : null}
            </div>
            <div className="blog-chat-bubble-wrap">
              <div className="blog-chat-bubble">
                {lines.map((line, lineIndex) => (
                  <p
                    key={`${align}-${avatar}-${index}-${lineIndex}`}
                    className="blog-chat-line"
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
