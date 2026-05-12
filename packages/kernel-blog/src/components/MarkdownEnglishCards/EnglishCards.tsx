import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeOpenIcon,
  ExternalLinkIcon,
  InfoCircledIcon,
  Pencil2Icon,
  ReaderIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import '#blog/components/MarkdownEnglishCards/EnglishCards.css';
import {
  fetchDictionaryWord,
  normalizeOpenApiConfig,
  normalizeWordKey,
} from '#blog/components/MarkdownEnglishCards/EnglishCardsData';
import type {
  BlogEnglishCardExample,
  BlogEnglishCardDetail,
  BlogEnglishCardItem,
  BlogEnglishCardResource,
  BlogEnglishCardsProps,
} from '#blog/components/MarkdownTypes';

type OpenApiWordState = {
  status: 'loading' | 'success' | 'error';
  item?: Partial<BlogEnglishCardItem>;
  message?: string;
};

type PracticeAnswerState = 'idle' | 'correct' | 'incorrect';

const EnglishCardContent = (props: {
  item: BlogEnglishCardItem;
  apiState?: OpenApiWordState;
}) => {
  const { item, apiState } = props;
  const resources = createEnglishCardResources(item);

  return (
    <div className="blog-english-card-content">
      {apiState ? <EnglishCardOpenApiStatus state={apiState} /> : null}

      <section className="blog-english-card-section blog-english-card-section--translation">
        <div className="blog-english-card-label">中文翻译</div>
        {item.translation ? (
          renderLines(item.translation, 'translation')
        ) : (
          <p className="blog-english-card-line blog-english-card-line--empty">
            正在尝试从有道词典获取中文释义；需要固定展示时，可以在 items
            里手动补充。
          </p>
        )}
      </section>

      {item.explanation ? (
        <section className="blog-english-card-section blog-english-card-section--definition">
          <div className="blog-english-card-label">英文释义</div>
          {renderLines(item.explanation, 'explanation')}
        </section>
      ) : null}

      {item.example ? (
        <section className="blog-english-card-section blog-english-card-section--examples">
          <div className="blog-english-card-label">例句</div>
          {renderExamples(item.example, item.word)}
        </section>
      ) : null}

      {item.details?.length ? (
        <section className="blog-english-card-section blog-english-card-section--details">
          <div className="blog-english-card-label">拓展</div>
          {renderDetails(item.details)}
        </section>
      ) : null}

      {item.note || item.tags?.length ? (
        <div className="blog-english-card-meta">
          {item.note ? <span>{item.note}</span> : null}
          {item.tags?.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
      <div className="blog-english-card-actions">
        {resources.map((resource) => (
          <EnglishCardResourceLink
            key={`${item.word}-${resource.href}`}
            resource={resource}
          />
        ))}
      </div>
    </div>
  );
};

const EnglishCardResourceLink = (props: {
  resource: BlogEnglishCardResource;
}) => {
  const { resource } = props;

  return (
    <span className="blog-english-card-resource">
      <a
        href={resource.href}
        className="blog-english-card-link"
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLinkIcon />
        {resource.label}
      </a>
      <span className="blog-english-card-resource-card" role="tooltip">
        <span className="blog-english-card-resource-title">
          {resource.title ?? resource.label}
        </span>
        {resource.description ? (
          <span className="blog-english-card-resource-description">
            {resource.description}
          </span>
        ) : null}
        <span className="blog-english-card-resource-url">
          {formatResourceUrl(resource.href)}
        </span>
      </span>
    </span>
  );
};

const EnglishCardPractice = (props: {
  answer: string;
  item: BlogEnglishCardItem;
  result: PracticeAnswerState;
  onAnswerChange: (value: string) => void;
  onCheck: () => void;
}) => {
  const { answer, item, result, onAnswerChange, onCheck } = props;

  return (
    <div className="blog-english-card-practice">
      <label className="blog-english-card-practice-label" htmlFor={item.word}>
        默写中文翻译
      </label>
      <div className="blog-english-card-practice-row">
        <input
          id={item.word}
          className="blog-english-card-practice-input"
          type="text"
          value={answer}
          placeholder="输入一个或多个中文释义"
          onChange={(event) => onAnswerChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onCheck();
            }
          }}
        />
        <button
          type="button"
          className="blog-english-card-practice-check"
          onClick={onCheck}
        >
          校验
        </button>
      </div>
      <div
        className={[
          'blog-english-card-practice-result',
          `blog-english-card-practice-result--${result}`,
        ].join(' ')}
      >
        {result === 'correct'
          ? '正确'
          : result === 'incorrect'
          ? '不完全匹配，可以显示答案对照。'
          : '先输入中文翻译，再校验。'}
      </div>
    </div>
  );
};

const EnglishCardOpenApiStatus = (props: { state: OpenApiWordState }) => {
  const { state } = props;

  if (state.status === 'success') return null;

  const copy =
    state.status === 'loading'
      ? '正在从有道词典获取'
      : state.message ?? '词典 API 暂未配置';

  return (
    <div
      className={[
        'blog-english-card-openapi',
        `blog-english-card-openapi--${state.status}`,
      ].join(' ')}
    >
      <InfoCircledIcon />
      <span>{copy}</span>
    </div>
  );
};

const renderLines = (
  value: ReactNode | Array<ReactNode>,
  keyPrefix: string,
) => {
  const lines = Array.isArray(value) ? value : [value];

  return lines.map((line, index) => (
    <p key={`${keyPrefix}-${index}`} className="blog-english-card-line">
      {line}
    </p>
  ));
};

const renderExamples = (
  value: BlogEnglishCardExample | Array<BlogEnglishCardExample>,
  word: string,
) => {
  const examples = Array.isArray(value) ? value : [value];

  return examples.map((example, index) => {
    if (!isExampleObject(example)) {
      return (
        <div key={`example-${index}`} className="blog-english-card-example">
          <p className="blog-english-card-line">
            {renderExampleText(example, word)}
          </p>
        </div>
      );
    }

    return (
      <div key={`example-${index}`} className="blog-english-card-example">
        <p className="blog-english-card-line">
          {renderExampleText(example.text, word)}
        </p>
        {example.translation ? (
          <p className="blog-english-card-example-translation">
            {example.translation}
          </p>
        ) : null}
      </div>
    );
  });
};

const renderDetails = (details: Array<BlogEnglishCardDetail>) => {
  return (
    <div className="blog-english-card-details">
      {details.map((detail, index) => (
        <div key={`detail-${index}`} className="blog-english-card-detail">
          <div className="blog-english-card-detail-label">{detail.label}</div>
          <div className="blog-english-card-detail-items">
            {detail.items.map((item, itemIndex) => {
              const speakTextValue = getDetailSpeakText(detail, item);

              return (
                <span key={`detail-item-${itemIndex}`}>
                  {item}
                  {speakTextValue ? (
                    <button
                      type="button"
                      className="blog-english-card-detail-speak"
                      aria-label={`朗读 ${speakTextValue}`}
                      onClick={() => speakText(speakTextValue)}
                    >
                      <SpeakerLoudIcon />
                    </button>
                  ) : null}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const getDetailSpeakText = (detail: BlogEnglishCardDetail, item: ReactNode) => {
  if (typeof detail.label !== 'string' || typeof item !== 'string') {
    return undefined;
  }

  const separator = item.includes('：') ? '：' : ':';
  const [beforeSeparator, afterSeparator] = item.split(separator);
  const text = detail.label === '词形' ? afterSeparator : beforeSeparator;

  return normalizeSpeakText(text);
};

const isExampleObject = (
  value: BlogEnglishCardExample,
): value is { text: ReactNode; translation?: ReactNode } => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'text' in value,
  );
};

const renderExampleText = (value: ReactNode, word: string) => {
  if (typeof value !== 'string') return value;

  const normalizedWord = word.trim();
  if (!normalizedWord) return value;

  const escapedWord = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b(${escapedWord})\\b`, 'gi');
  const parts = value.split(pattern);

  if (parts.length === 1) return value;

  return parts.map((part, index) => {
    if (part.toLowerCase() !== normalizedWord.toLowerCase()) return part;

    return (
      <mark key={`${part}-${index}`} className="blog-english-card-example-word">
        {part}
      </mark>
    );
  });
};

const isPracticeAnswerCorrect = (answer: string, item: BlogEnglishCardItem) => {
  const answerText = normalizePracticeText(answer);
  if (!answerText) return false;

  return getPracticeTranslationTexts(item).some((translation) => {
    const translationText = normalizePracticeText(translation);

    return (
      Boolean(translationText) &&
      (answerText.includes(translationText) ||
        translationText.includes(answerText))
    );
  });
};

const getPracticeTranslationTexts = (item: BlogEnglishCardItem) => {
  const translations = Array.isArray(item.translation)
    ? item.translation
    : [item.translation];

  return translations.filter(
    (translation): translation is string => typeof translation === 'string',
  );
};

const normalizePracticeText = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[，,、；;。.\s]/g, '')
    .trim();
};

const speakEnglishCardWord = (item: BlogEnglishCardItem) => {
  if (item.audioUrl) {
    void new Audio(item.audioUrl).play();
    return;
  }

  speakText(item.word);
};

const speakText = (text: string | undefined) => {
  const speakableText = normalizeSpeakText(text);
  if (!speakableText) return;

  const audio = new Audio(createGoogleTtsUrl(speakableText));
  audio.addEventListener('error', () => speakWithBrowser(speakableText), {
    once: true,
  });
  void audio.play().catch(() => speakWithBrowser(speakableText));
};

const speakWithBrowser = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

const createGoogleTtsUrl = (text: string) => {
  const url = new URL('https://translate.google.com/translate_tts');
  url.searchParams.set('ie', 'UTF-8');
  url.searchParams.set('client', 'tw-ob');
  url.searchParams.set('tl', 'en');
  url.searchParams.set('q', text);

  return url.toString();
};

const normalizeSpeakText = (text: string | undefined) => {
  const value = text?.replace(/\s+/g, ' ').trim();
  if (!value || !/[a-z]/i.test(value)) return undefined;

  return value;
};

const createEnglishCardItems = (
  props: BlogEnglishCardsProps,
): Array<BlogEnglishCardItem> => {
  const itemMap = new Map(
    props.items?.map((item) => [normalizeWordKey(item.word), item]) ?? [],
  );

  if (!props.words?.length) return props.items ?? [];

  return props.words.map((word) => {
    const normalizedWord = normalizeWordKey(word);
    return itemMap.get(normalizedWord) ?? { word };
  });
};

const mergeEnglishCardItem = (
  apiItem: Partial<BlogEnglishCardItem> | undefined,
  item: BlogEnglishCardItem,
): BlogEnglishCardItem => {
  return {
    ...apiItem,
    ...item,
    word: item.word || apiItem?.word || '',
    phonetic: item.phonetic ?? apiItem?.phonetic,
    audioUrl: item.audioUrl ?? apiItem?.audioUrl,
    partOfSpeech: item.partOfSpeech ?? apiItem?.partOfSpeech,
    translation: item.translation ?? apiItem?.translation,
    explanation: item.explanation ?? apiItem?.explanation,
    example: item.example ?? apiItem?.example,
    details: item.details ?? apiItem?.details,
    resources: item.resources ?? apiItem?.resources,
    note: item.note ?? apiItem?.note,
    tags: item.tags ?? apiItem?.tags,
  };
};

const createEnglishCardResources = (
  item: BlogEnglishCardItem,
): Array<BlogEnglishCardResource> => {
  const word = item.word.trim();
  const encodedWord = encodeURIComponent(word);
  const defaultResources: Array<BlogEnglishCardResource> = [
    {
      label: "Oxford Learner's",
      href: createOxfordWebUrl(word),
      title: 'Oxford Learner’s Dictionaries',
      description: '查看更完整的英文释义、发音、搭配和例句。',
    },
    {
      label: '词源故事',
      href: `https://www.etymonline.com/word/${encodedWord}`,
      title: 'Online Etymology Dictionary',
      description: '查看这个词的来源、历史演变和早期用法。',
    },
    {
      label: '相关文章',
      href: `https://www.google.com/search?q=${encodedWord}+meaning+example+article`,
      title: '搜索相关文章',
      description: '搜索包含这个词的解释、用法文章和学习材料。',
    },
    {
      label: '帖子讨论',
      href: `https://www.google.com/search?q=site%3Areddit.com+${encodedWord}+meaning+usage`,
      title: '搜索社区帖子',
      description: '搜索 Reddit 等社区里关于这个词的真实讨论和使用场景。',
    },
  ];

  return item.resources?.length ? item.resources : defaultResources;
};

const getErrorMessage = (error: unknown) => {
  if (isAbortError(error)) return '词典请求已取消';

  return error instanceof Error ? error.message : '词典请求失败';
};

const isAbortError = (error: unknown) => {
  return error instanceof DOMException && error.name === 'AbortError';
};

const createOxfordWebUrl = (word: string) => {
  return `https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(
    word,
  )}`;
};

const formatResourceUrl = (href: string) => {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
};

export function BlogMdxEnglishCards(props: BlogEnglishCardsProps) {
  const { title, defaultMode = 'study', className } = props;
  const items = useMemo(
    () => createEnglishCardItems(props),
    [props.items, props.words],
  );
  const openApiConfig = useMemo(
    () => normalizeOpenApiConfig(props.openApi),
    [props.openApi],
  );
  const [openApiWords, setOpenApiWords] = useState<
    Record<string, OpenApiWordState>
  >({});
  const [mode, setMode] = useState(defaultMode);
  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set());
  const [practiceAnswers, setPracticeAnswers] = useState<
    Record<string, string>
  >({});
  const [practiceResults, setPracticeResults] = useState<
    Record<string, PracticeAnswerState>
  >({});
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set());
  const isPracticeMode = mode === 'practice';

  useEffect(() => {
    if (!openApiConfig.enabled) {
      setOpenApiWords({});
      return;
    }

    const uniqueWords = Array.from(
      new Set(items.map((item) => normalizeWordKey(item.word)).filter(Boolean)),
    );

    if (!uniqueWords.length) {
      setOpenApiWords({});
      return;
    }

    const abortController = new AbortController();

    setOpenApiWords(
      Object.fromEntries(
        uniqueWords.map((word) => [
          word,
          { status: 'loading' } satisfies OpenApiWordState,
        ]),
      ),
    );

    void Promise.all(
      uniqueWords.map(async (word) => {
        try {
          const apiItem = await fetchDictionaryWord(word, openApiConfig, {
            signal: abortController.signal,
          });

          return [
            word,
            { status: 'success', item: apiItem } satisfies OpenApiWordState,
          ] as const;
        } catch (error) {
          if (abortController.signal.aborted) {
            return [
              word,
              { status: 'loading' } satisfies OpenApiWordState,
            ] as const;
          }

          return [
            word,
            {
              status: 'error',
              message: getErrorMessage(error),
            } satisfies OpenApiWordState,
          ] as const;
        }
      }),
    ).then((entries) => {
      if (abortController.signal.aborted) return;
      setOpenApiWords(Object.fromEntries(entries));
    });

    return () => abortController.abort();
  }, [items, openApiConfig]);

  const toggleMode = () => {
    setMode((currentMode) => (currentMode === 'study' ? 'practice' : 'study'));
    setRevealedWords(new Set());
    setPracticeResults({});
  };

  const toggleReveal = (wordKey: string) => {
    setRevealedWords((currentWords) => {
      const nextWords = new Set(currentWords);

      if (nextWords.has(wordKey)) {
        nextWords.delete(wordKey);
      } else {
        nextWords.add(wordKey);
      }

      return nextWords;
    });
  };

  const toggleExpanded = (wordKey: string) => {
    setExpandedWords((currentWords) => {
      const nextWords = new Set(currentWords);

      if (nextWords.has(wordKey)) {
        nextWords.delete(wordKey);
      } else {
        nextWords.add(wordKey);
      }

      return nextWords;
    });
  };

  const updatePracticeAnswer = (wordKey: string, value: string) => {
    setPracticeAnswers((currentAnswers) => ({
      ...currentAnswers,
      [wordKey]: value,
    }));
    setPracticeResults((currentResults) => ({
      ...currentResults,
      [wordKey]: 'idle',
    }));
  };

  const checkPracticeAnswer = (wordKey: string, item: BlogEnglishCardItem) => {
    const result = isPracticeAnswerCorrect(practiceAnswers[wordKey] ?? '', item)
      ? 'correct'
      : 'incorrect';

    setPracticeResults((currentResults) => ({
      ...currentResults,
      [wordKey]: result,
    }));
  };

  return (
    <section
      className={[
        'blog-english-cards',
        `blog-english-cards--${mode}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="blog-english-cards-header">
        <div>
          {title ? <h3 className="blog-english-cards-title">{title}</h3> : null}
          <p className="blog-english-cards-summary">{items.length} 个词条</p>
        </div>
        <button
          type="button"
          className="blog-english-cards-mode"
          onClick={toggleMode}
        >
          {isPracticeMode ? <ReaderIcon /> : <Pencil2Icon />}
          {isPracticeMode ? '学习模式' : '练习模式'}
        </button>
      </div>

      <div className="blog-english-cards-list">
        {items.map((item, index) => {
          const wordKey = `${item.word}-${index}`;
          const isRevealed = !isPracticeMode || revealedWords.has(wordKey);
          const apiState = openApiWords[normalizeWordKey(item.word)];
          const cardItem = mergeEnglishCardItem(apiState?.item, item);
          const practiceAnswer = practiceAnswers[wordKey] ?? '';
          const practiceResult = practiceResults[wordKey] ?? 'idle';
          const isExpanded = expandedWords.has(wordKey);

          return (
            <article
              key={wordKey}
              className={[
                'blog-english-card',
                isExpanded ? 'blog-english-card--expanded' : undefined,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="blog-english-card-head">
                <div>
                  <div className="blog-english-card-word-row">
                    <h4 className="blog-english-card-word">{cardItem.word}</h4>
                    {cardItem.partOfSpeech ? (
                      <span className="blog-english-card-part">
                        {cardItem.partOfSpeech}
                      </span>
                    ) : null}
                    {cardItem.phonetic ? (
                      <span className="blog-english-card-phonetic">
                        {cardItem.phonetic}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="blog-english-card-speak"
                      onClick={() => speakEnglishCardWord(cardItem)}
                    >
                      <SpeakerLoudIcon />
                      发音
                    </button>
                  </div>
                </div>
                <div className="blog-english-card-head-actions">
                  {isPracticeMode ? (
                    <button
                      type="button"
                      className="blog-english-card-reveal"
                      onClick={() => toggleReveal(wordKey)}
                    >
                      {isRevealed ? <CheckIcon /> : <EyeOpenIcon />}
                      {isRevealed ? '已显示' : '显示答案'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="blog-english-card-collapse"
                    aria-label={isExpanded ? '收起词卡' : '展开词卡'}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(wordKey)}
                  >
                    {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  </button>
                </div>
              </div>

              {isExpanded ? (
                isPracticeMode && !isRevealed ? (
                  <EnglishCardPractice
                    answer={practiceAnswer}
                    item={cardItem}
                    result={practiceResult}
                    onAnswerChange={(value) =>
                      updatePracticeAnswer(wordKey, value)
                    }
                    onCheck={() => checkPracticeAnswer(wordKey, cardItem)}
                  />
                ) : (
                  <EnglishCardContent item={cardItem} apiState={apiState} />
                )
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
