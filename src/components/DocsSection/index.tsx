import React from 'react'
import Link from '@docusaurus/Link'
import {usePluginData} from '@docusaurus/useGlobalData'

import type {RecentUpdate} from '@site/plugins/recent-updates'

import styles from './styles.module.css'

type Chip = { label: string; to: string }

type SectionCard = {
  title: string
  description: string
  to: string
  chips: Chip[]
}

const sections: SectionCard[] = [
  {
    title: '教程',
    description: '安装、配置、部署，步骤可复用。',
    to: '/docs/tutorials/',
    chips: [
      { label: 'Linux', to: '/docs/tutorials/linux/' },
      { label: 'Docker', to: '/docs/tutorials/docker/' },
      { label: 'K8s', to: '/docs/tutorials/k8s/' },
      { label: 'Java', to: '/docs/tutorials/java/' },
      { label: 'AI', to: '/docs/tutorials/ai/' },
    ],
  },
  {
    title: '踩坑',
    description: '报错、排查、复盘，按场景归档。',
    to: '/docs/troubleshooting/',
    chips: [
      { label: 'Docker', to: '/docs/troubleshooting/docker/' },
      { label: 'Java', to: '/docs/troubleshooting/java/' },
      { label: '其他', to: '/docs/troubleshooting/other/' },
    ],
  },
  {
    title: '项目',
    description: '自研工具与中台规范。',
    to: '/docs/nebula/',
    chips: [
      { label: 'Nebula', to: '/docs/nebula/' },
      { label: 'OmniGate', to: '/docs/projects/omnigate/' },
      { label: 'OmniTOTP', to: '/docs/projects/omnitotp/' },
      { label: 'Port Cleaner', to: '/docs/projects/port-cleaner' },
    ],
  },
  {
    title: '专题',
    description: '跨工具的完整链路，一次讲清楚。',
    to: '/blog',
    chips: [
      { label: 'Agent 从 0 到 1', to: '/blog/ai-agent-from-zero-to-one' },
      { label: 'Jenkins 全链路', to: '/blog/jenkins-fullstack-deploy-guide' },
    ],
  },
]

const projects = [
  {
    title: 'Nebula',
    description: 'Java 模块化中台，单体接入或独立部署。',
    to: '/docs/nebula/',
  },
  {
    title: 'OmniGate',
    description: 'OpenAI 兼容的本地 AI 网关，单二进制。',
    to: '/docs/projects/omnigate/',
  },
  {
    title: 'OmniTOTP',
    description: '本地 TOTP 桌面工具，无网络请求。',
    to: '/docs/projects/omnitotp/',
  },
  {
    title: 'Port Cleaner',
    description: '查占用端口，确认后再结束进程。',
    to: '/docs/projects/port-cleaner',
  },
]

export default function DocsSection() {
  const {updates = []} = usePluginData('recent-updates') as {
    updates?: RecentUpdate[]
  }

  return (
    <>
      <section className={styles.block}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h2 className={styles.title}>从这里进</h2>
            <p className={styles.subtitle}>按用途分流，卡片上是真实目录，不是分类口号。</p>
          </header>
          <div className={styles.grid}>
            {sections.map(section => (
              <article key={section.title} className={styles.card}>
                <Link className={styles.cardMain} to={section.to}>
                  <h3 className={styles.cardTitle}>{section.title}</h3>
                  <p className={styles.cardDesc}>{section.description}</p>
                </Link>
                <div className={styles.chips}>
                  {section.chips.map(chip => (
                    <Link key={chip.to} className={styles.chip} to={chip.to}>
                      {chip.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {updates.length > 0 && (
        <section className={`${styles.block} ${styles.muted}`}>
          <div className={styles.container}>
            <header className={styles.header}>
              <h2 className={styles.title}>最近更新</h2>
              <p className={styles.subtitle}>站点里正在写的东西，按时间排。</p>
            </header>
            <ul className={styles.updateList}>
              {updates.map(item => (
                <li key={item.to}>
                  <Link className={styles.updateItem} to={item.to}>
                    <time className={styles.updateDate} dateTime={item.date}>
                      {item.date}
                    </time>
                    <span className={styles.updateKind}>{item.kind}</span>
                    <span className={styles.updateTitle}>{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className={styles.block}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h2 className={styles.title}>开源项目</h2>
            <p className={styles.subtitle}>文档和仓库都在这里，按需打开。</p>
          </header>
          <div className={styles.projectGrid}>
            {projects.map(project => (
              <Link key={project.to} className={styles.projectCard} to={project.to}>
                <h3 className={styles.projectTitle}>{project.title}</h3>
                <p className={styles.projectDesc}>{project.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
