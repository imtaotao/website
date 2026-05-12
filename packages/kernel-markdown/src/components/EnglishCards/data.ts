import type {
  EnglishCardItem,
  EnglishCardsOpenApiConfig,
} from '#markdown/components/Types';

export type NormalizedOpenApiConfig = Required<
  Pick<EnglishCardsOpenApiConfig, 'enabled' | 'endpoint' | 'language'>
>;

const REMOTE_DICTIONARY_ENDPOINT = 'https://dict.youdao.com/jsonapi';
const LOCAL_DICTIONARY_ENDPOINT = '/api/dictionary/youdao/jsonapi';
const DICTIONARY_CACHE_PREFIX = 'markdown:english-card:dictionary:v1';
const DICTIONARY_CACHE_TTL = 1000 * 60 * 60 * 24 * 30;

type DictionaryCacheEntry = {
  cachedAt: number;
  item: Partial<EnglishCardItem>;
};

export function normalizeWordKey(word: string) {
  return word.trim().toLowerCase();
}

export function normalizeOpenApiConfig(
  openApi: boolean | EnglishCardsOpenApiConfig | undefined,
): NormalizedOpenApiConfig {
  if (typeof openApi !== 'object' || openApi === null) {
    return {
      enabled: openApi !== false,
      language: 'en',
      endpoint: getDefaultDictionaryEndpoint(),
    };
  }

  return {
    enabled: openApi.enabled ?? true,
    language: openApi.language ?? 'en',
    endpoint: trimTrailingSlash(
      openApi.endpoint ?? getDefaultDictionaryEndpoint(),
    ),
  };
}

export async function fetchDictionaryWord(
  word: string,
  config: NormalizedOpenApiConfig,
  requestInit: Pick<RequestInit, 'signal'>,
): Promise<Partial<EnglishCardItem>> {
  const cachedItem = readCache(word, config);
  if (cachedItem) return cachedItem;

  const value = await fetchDictionaryJson(word, config, requestInit);
  const item = parseDictionaryResponse(value, word);

  if (!item.translation && !item.explanation && !item.example) {
    throw new Error('词典接口未返回可展示数据');
  }

  writeCache(word, config, item);
  return item;
}

const fetchDictionaryJson = async (
  word: string,
  config: NormalizedOpenApiConfig,
  requestInit: Pick<RequestInit, 'signal'>,
) => {
  const response = await fetch(createDictionaryUrl(word, config), requestInit);
  if (!response.ok) throw new Error(await readDictionaryError(response));

  return response.json() as Promise<unknown>;
};

const createDictionaryUrl = (word: string, config: NormalizedOpenApiConfig) => {
  const url = new URL(
    config.endpoint,
    typeof window === 'undefined' ? undefined : window.location.origin,
  );
  url.searchParams.set('jsonversion', '2');
  url.searchParams.set('client', 'mobile');
  url.searchParams.set('q', word);
  url.searchParams.set(
    'dicts',
    JSON.stringify({
      count: 8,
      dicts: [
        [
          'ec',
          'ee',
          'auth_sents_part',
          'blng_sents_part',
          'media_sents_part',
          'simple',
          'wordform',
          'syno',
          'rel_word',
          'web_trans',
        ],
      ],
    }),
  );
  url.searchParams.set('keyfrom', 'mdict.9.0.android');
  url.searchParams.set('network', 'wifi');
  url.searchParams.set('xmlVersion', '5.1');

  return url;
};

const parseDictionaryResponse = (
  value: unknown,
  fallbackWord: string,
): Partial<EnglishCardItem> => {
  if (!isRecord(value)) return { word: fallbackWord };

  const ecWord = firstRecord(record(value.ec)?.word);
  const simpleWord = firstRecord(record(value.simple)?.word);
  const translation = readTranslations(ecWord);
  const explanation = readEnglishDefinitions(value.ee);
  const example = readExamples(value);
  const details = readDetails(value, ecWord);

  return {
    word: readWord(ecWord, simpleWord) ?? fallbackWord,
    partOfSpeech: readPartOfSpeech(ecWord),
    phonetic: normalizePhonetic(
      readString(ecWord ?? {}, ['usphone', 'ukphone']) ??
        readString(simpleWord ?? {}, ['usphone', 'ukphone']),
    ),
    audioUrl: createAudioUrl(fallbackWord),
    translation: translation.length ? translation.slice(0, 4) : undefined,
    explanation: explanation.length ? explanation.slice(0, 3) : undefined,
    example: example.length ? example.slice(0, 2) : undefined,
    details: details.length ? details : undefined,
  };
};

const readWord = (
  ecWord: Record<string, unknown> | undefined,
  simpleWord: Record<string, unknown> | undefined,
) => {
  return (
    readString(record(record(ecWord?.['return-phrase'])?.l) ?? {}, ['i']) ??
    readString(simpleWord ?? {}, ['return-phrase'])
  );
};

const readTranslations = (ecWord: Record<string, unknown> | undefined) => {
  return records(ecWord?.trs)
    .map((translation) => {
      const partOfSpeech = readString(translation, ['pos']);
      const meanings = records(translation.tr).flatMap((tr) =>
        strings(record(tr.l)?.i),
      );
      if (!meanings.length) return undefined;

      return partOfSpeech
        ? `${partOfSpeech} ${meanings.join('，')}`
        : meanings.join('，');
    })
    .filter(isPresent);
};

const readPartOfSpeech = (ecWord: Record<string, unknown> | undefined) => {
  const parts = unique(
    records(ecWord?.trs)
      .map((translation) => readString(translation, ['pos']))
      .filter(isPresent),
  );

  return parts.length ? parts.join(' / ') : undefined;
};

const readEnglishDefinitions = (value: unknown) => {
  return records(record(value)?.word).flatMap((word) =>
    records(word.trs).flatMap((translation) =>
      records(translation.tr)
        .map((tr) => readString(record(tr.l) ?? {}, ['i']))
        .filter(isPresent),
    ),
  );
};

const readExamples = (value: Record<string, unknown>) => {
  const sentences = [
    ...records(record(value.blng_sents_part)?.['sentence-pair']),
    ...records(record(value.blng_sents_part)?.sent),
    ...records(record(value.media_sents_part)?.sent),
    ...records(record(value.auth_sents_part)?.sent),
  ];

  return uniqueExamples(
    sentences
      .map((sentence) => {
        const text = stripHtml(
          readString(sentence, [
            'sentence',
            'sentence-eng',
            'eng',
            'eng_sent',
            'foreign',
            'text',
          ]),
        );
        if (!text) return undefined;

        return {
          text,
          translation: stripHtml(
            readString(sentence, [
              'sentence-translation',
              'sentence-translation-eng',
              'sentenceTranslation',
              'sentenceTrans',
              'sentence-translation-zh',
              'translation',
              'translate',
              'chn',
              'chn_sent',
              'chnSent',
              'chn_sentence',
              'chinese',
              'cn',
              'trans',
              'native',
              'source',
            ]),
          ),
        };
      })
      .filter(isPresent),
  );
};

const readDetails = (
  value: Record<string, unknown>,
  ecWord: Record<string, unknown> | undefined,
) => {
  return [
    createDetail('词形', readWordForms(value.wordform, ecWord)),
    createDetail('同近义词', readSynonyms(value.syno)),
    createDetail('相关词', readRelatedWords(value.rel_word)),
    createDetail('网络释义', readWebTranslations(value.web_trans)),
  ].filter(isPresent);
};

const createDetail = (label: string, items: Array<string>) => {
  const detailItems = unique(items).slice(0, 6);
  if (!detailItems.length) return undefined;

  return {
    label,
    items: detailItems,
  };
};

const readWordForms = (
  value: unknown,
  ecWord: Record<string, unknown> | undefined,
) => {
  const formSource = firstRecord(record(value)?.word) ?? ecWord;

  return records(formSource?.wfs)
    .map((form) => {
      const field = record(form.wf);
      const name = readString(field ?? {}, ['name']);
      const text = readString(field ?? {}, ['value']);
      if (!name || !text) return undefined;

      return `${name}：${text}`;
    })
    .filter(isPresent);
};

const readSynonyms = (value: unknown) => {
  return records(record(value)?.synos)
    .flatMap((group) =>
      records(group.ws).map((item) => {
        const word = readString(item, ['w']);
        const translation = readString(group, ['tran']);
        if (!word) return undefined;

        return translation ? `${word}：${translation}` : word;
      }),
    )
    .filter(isPresent);
};

const readRelatedWords = (value: unknown) => {
  return records(record(value)?.rels)
    .flatMap((group) =>
      records(group.words).map((item) => {
        const word = readString(item, ['word']);
        const translation = readString(item, ['tran']);
        if (!word) return undefined;

        return translation ? `${word}：${translation}` : word;
      }),
    )
    .filter(isPresent);
};

const readWebTranslations = (value: unknown) => {
  return records(record(value)?.['web-translation'])
    .flatMap((translation) => {
      const key = readString(translation, ['key']);

      return records(translation.trans).map((item) => {
        const text = readString(item, ['value']);
        if (!text) return undefined;

        return key ? `${key}：${text}` : text;
      });
    })
    .filter(isPresent);
};

const readCache = (
  word: string,
  config: NormalizedOpenApiConfig,
): Partial<EnglishCardItem> | undefined => {
  if (!canUseLocalStorage()) return undefined;

  try {
    const cacheKey = createCacheKey(word, config);
    const cacheText = window.localStorage.getItem(cacheKey);
    if (!cacheText) return undefined;

    const cacheValue = JSON.parse(cacheText) as unknown;
    if (!isCacheEntry(cacheValue)) return undefined;

    if (Date.now() - cacheValue.cachedAt > DICTIONARY_CACHE_TTL) {
      window.localStorage.removeItem(cacheKey);
      return undefined;
    }

    return cacheValue.item;
  } catch {
    return undefined;
  }
};

const writeCache = (
  word: string,
  config: NormalizedOpenApiConfig,
  item: Partial<EnglishCardItem>,
) => {
  if (!canUseLocalStorage()) return;

  try {
    const cacheEntry: DictionaryCacheEntry = {
      cachedAt: Date.now(),
      item,
    };

    window.localStorage.setItem(
      createCacheKey(word, config),
      JSON.stringify(cacheEntry),
    );
  } catch {
    // Ignore storage quota and private browsing errors.
  }
};

const createCacheKey = (word: string, config: NormalizedOpenApiConfig) => {
  return [
    DICTIONARY_CACHE_PREFIX,
    config.language,
    normalizeWordKey(word),
  ].join(':');
};

const readDictionaryError = async (response: Response) => {
  const fallbackMessage = `词典接口返回 ${response.status}`;

  try {
    const value = await response.clone().json();
    const message = readString(record(value) ?? {}, [
      'message',
      'title',
      'resolution',
    ]);

    return message ? `词典接口：${message}` : fallbackMessage;
  } catch {
    const message = (await response.text()).trim();

    return message || fallbackMessage;
  }
};

const normalizePhonetic = (value: string | undefined) => {
  const text = value?.trim();
  if (!text) return undefined;
  if (text.startsWith('/') && text.endsWith('/')) return text;

  return `/${text}/`;
};

const createAudioUrl = (word: string) => {
  const url = new URL(
    isLocalBrowser()
      ? '/api/dictionary/youdao/dictvoice'
      : 'https://dict.youdao.com/dictvoice',
    typeof window === 'undefined' ? undefined : window.location.origin,
  );
  url.searchParams.set('type', '2');
  url.searchParams.set('audio', word);

  return url.toString();
};

const getDefaultDictionaryEndpoint = () => {
  return isLocalBrowser()
    ? LOCAL_DICTIONARY_ENDPOINT
    : REMOTE_DICTIONARY_ENDPOINT;
};

const isLocalBrowser = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const isCacheEntry = (value: unknown): value is DictionaryCacheEntry => {
  return (
    isRecord(value) &&
    typeof value.cachedAt === 'number' &&
    isRecord(value.item)
  );
};

const canUseLocalStorage = () => {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
};

const firstRecord = (value: unknown) => {
  return records(value)[0];
};

const records = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
};

const strings = (value: unknown): Array<string> => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === 'string' && Boolean(item.trim()),
  );
};

const readString = (
  value: Record<string, unknown>,
  keys: Array<string>,
): string | undefined => {
  for (const key of keys) {
    const fieldValue = value[key];
    if (typeof fieldValue === 'string' && fieldValue.trim()) {
      return fieldValue.trim();
    }
  }
  return undefined;
};

const trimTrailingSlash = (value: string) => {
  return value.replace(/\/+$/, '');
};

const record = (value: unknown): Record<string, unknown> | undefined => {
  return isRecord(value) ? value : undefined;
};

const stripHtml = (value: string | undefined) => {
  return value
    ?.replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const unique = (values: Array<string>) => {
  return Array.from(new Set(values));
};

const uniqueExamples = (
  values: Array<{ text: string; translation: string | undefined }>,
) => {
  const seenTexts = new Set<string>();

  return values.filter((value) => {
    const key = value.text.toLowerCase();
    if (seenTexts.has(key)) return false;

    seenTexts.add(key);
    return true;
  });
};

const isPresent = <T>(value: T | undefined): value is T => {
  return Boolean(value);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};
