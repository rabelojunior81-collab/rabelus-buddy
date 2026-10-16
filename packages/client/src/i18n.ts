// Catálogo de tradução compartilhado (ADR 0002; SPEC 0001, escopo 15).
// Os catálogos moram em locales/<idioma>/<domínio>.json, na raiz do repositório,
// e servem à CLI agora e à Web e ao app depois (ADR 0013).

import i18next from 'i18next';
import type { Resource, ResourceLanguage, TOptions } from 'i18next';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SUPPORTED_LANGS = ['pt-BR', 'en'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: Lang = 'pt-BR';
export const LOCALES_DIR = join(import.meta.dirname, '..', '..', '..', 'locales');

const isLang = (v: unknown): v is Lang => typeof v === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(v);

// Opção da linha de comando vence a variável de ambiente, que vence o padrão.
export function resolveLang({ flag, env }: { flag?: string | undefined; env?: string | undefined }): Lang {
  if (isLang(flag)) return flag;
  if (isLang(env)) return env;
  return DEFAULT_LANG;
}

function loadResources(): Resource {
  const resources: Resource = {};
  for (const lang of SUPPORTED_LANGS) {
    const translation: ResourceLanguage = {};
    for (const file of readdirSync(join(LOCALES_DIR, lang)).filter((f) => f.endsWith('.json'))) {
      Object.assign(translation, JSON.parse(readFileSync(join(LOCALES_DIR, lang, file), 'utf8')));
    }
    resources[lang] = { translation };
  }
  return resources;
}

export interface I18n {
  lang: Lang;
  t: (key: string, options?: TOptions) => string;
}

export function createI18n(lang: Lang): I18n {
  const instance = i18next.createInstance();
  void instance.init({
    lng: lang,
    fallbackLng: false,
    resources: loadResources(),
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return { lang, t: (key, options) => String(instance.t(key, options)) };
}
