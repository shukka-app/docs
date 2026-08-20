import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { zhCN } from '@fumadocs/language/zh-cn';
import { i18n } from './i18n';
import { appName, gitConfig } from './shared';

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .preset('zh-CN', zhCN())
  .add({
    'zh-CN': {
      displayName: '简体中文',
    },
    'en-US': {
      displayName: 'English',
    },
  });

export function baseOptions(locale: string): BaseLayoutProps {
  const isZh = locale === 'zh-CN';

  return {
    nav: {
<<<<<<< HEAD
      title: appName,
    },
    links: [
      {
        text: '文档',
        url: '/docs',
        active: 'nested-url',
      },
      {
        text: 'API 参考',
        url: '/api',
=======
      title: isZh ? `${appName} 文档` : `${appName} Docs`,
      url: `/${locale}`,
    },
    links: [
      {
        text: isZh ? 'API 参考' : 'API Reference',
        url: `/${locale}/api`,
>>>>>>> 0c83146 (Add Fumadocs i18n for zh-CN and en-US)
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
