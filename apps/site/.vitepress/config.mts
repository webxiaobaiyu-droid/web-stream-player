import { defineConfig } from 'vitepress'

const origin = 'https://webxiaobaiyu-droid.github.io'
const repository = 'https://github.com/webxiaobaiyu-droid/web-stream-player'
const socialImage = 'https://raw.githubusercontent.com/webxiaobaiyu-droid/web-stream-player/main/docs/workbench-desktop.jpg'
const base = normalizeBase(process.env.VITE_BASE_PATH ?? '/')
const playground = `${origin}${base}playground/`

function normalizeBase(value: string): string {
  const leading = value.startsWith('/') ? value : `/${value}`
  return leading.endsWith('/') ? leading : `${leading}/`
}

function pagePath(relativePath: string): string {
  if (relativePath === 'index.md') return ''
  return relativePath
    .replace(/index\.md$/, '')
    .replace(/\.md$/, '')
}

export default defineConfig({
  lang: 'zh-CN',
  title: 'Web Stream Player',
  titleTemplate: ':title | Web Stream Player',
  description: '统一接入 HLS、FLV、MPEG-TS、裸 H.264/H.265 与经 Relay 转发的 RTSP。',
  base,
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: `${origin}${base}`
  },
  head: [
    ['meta', { name: 'theme-color', content: '#101311' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Web Stream Player' }],
    ['meta', { property: 'og:image', content: socialImage }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: socialImage }],
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      name: 'Web Stream Player',
      description: 'Adapter-first TypeScript browser player for multiple streaming protocols and relayed RTSP.',
      codeRepository: repository,
      license: `${repository}/blob/main/LICENSE`,
      programmingLanguage: ['TypeScript', 'Vue'],
      runtimePlatform: 'Web Browser'
    })]
  ],
  transformHead({ pageData }) {
    const canonical = `${origin}${base}${pagePath(pageData.relativePath)}`
    return [
      ['link', { rel: 'canonical', href: canonical }],
      ['meta', { property: 'og:url', content: canonical }],
      ['meta', { property: 'og:title', content: pageData.frontmatter.title ?? 'Web Stream Player' }],
      ['meta', { property: 'og:description', content: pageData.frontmatter.description ?? '统一接入浏览器视频流。' }]
    ]
  },
  themeConfig: {
    siteTitle: 'Web Stream Player',
    nav: [
      { text: '文档', link: '/guide/' },
      { text: '协议', link: '/protocols/hls' },
      { text: '部署', link: '/deployment/relay' },
      { text: 'API', link: '/reference/player' },
      { text: '性能', link: '/benchmarks' },
      { text: 'Playground', link: playground, target: '_blank', rel: 'noreferrer' }
    ],
    sidebar: {
      '/guide/': guideSidebar(),
      '/protocols/': guideSidebar(),
      '/frameworks/': guideSidebar(),
      '/deployment/': guideSidebar(),
      '/reference/': guideSidebar(),
      '/troubleshooting': guideSidebar(),
      '/benchmarks': guideSidebar()
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            noResultsText: '没有找到相关内容',
            resetButtonTitle: '清除查询',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
          }
        }
      }
    },
    socialLinks: [
      { icon: 'github', link: repository }
    ],
    editLink: {
      pattern: `${repository}/edit/main/apps/site/:path`,
      text: '在 GitHub 上编辑此页'
    },
    lastUpdated: {
      text: '最后更新'
    },
    outline: {
      level: [2, 3],
      label: '本页目录'
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '文档导航',
    darkModeSwitchLabel: '切换主题',
    lightModeSwitchTitle: '切换为浅色主题',
    darkModeSwitchTitle: '切换为深色主题',
    footer: {
      message: '基于 MIT License 开源。浏览器不能直接连接标准 RTSP。',
      copyright: 'Web Stream Player'
    }
  }
})

function guideSidebar() {
  return [
    {
      text: '开始使用',
      collapsed: false,
      items: [
        { text: '项目概览', link: '/guide/' },
        { text: '安装与发布状态', link: '/guide/installation' },
        { text: '五分钟接入', link: '/guide/quick-start' },
        { text: '浏览器能力边界', link: '/guide/browser-boundaries' },
        { text: '如何选择播放器', link: '/guide/choosing' }
      ]
    },
    {
      text: '协议接入',
      collapsed: false,
      items: [
        { text: 'HLS', link: '/protocols/hls' },
        { text: 'HTTP / WS-FLV', link: '/protocols/flv' },
        { text: 'HTTP / WS MPEG-TS', link: '/protocols/mpegts' },
        { text: 'RTSP', link: '/protocols/rtsp' },
        { text: '裸 H.264 / H.265', link: '/protocols/annexb' },
        { text: 'MP4 / WebM', link: '/protocols/native' }
      ]
    },
    {
      text: '框架组件',
      collapsed: false,
      items: [
        { text: 'Vue 3', link: '/frameworks/vue' },
        { text: 'React', link: '/frameworks/react' },
        { text: 'Web Component', link: '/frameworks/web-component' },
        { text: '按需组合 Adapter', link: '/frameworks/core' }
      ]
    },
    {
      text: 'Relay 与上线',
      collapsed: false,
      items: [
        { text: 'RTSP Relay', link: '/deployment/relay' },
        { text: 'Nginx 与 WSS', link: '/deployment/nginx' },
        { text: '鉴权与安全边界', link: '/deployment/security' },
        { text: '容量与多观看端', link: '/deployment/capacity' }
      ]
    },
    {
      text: 'API 参考',
      collapsed: true,
      items: [
        { text: 'Player', link: '/reference/player' },
        { text: 'StreamSource', link: '/reference/source' },
        { text: '事件与统计', link: '/reference/events' },
        { text: '能力检测', link: '/reference/capabilities' },
        { text: '自定义 Adapter', link: '/reference/adapter' }
      ]
    },
    {
      text: '验证与支持',
      collapsed: false,
      items: [
        { text: '性能实测', link: '/benchmarks' },
        { text: '常见问题', link: '/troubleshooting' }
      ]
    }
  ]
}
