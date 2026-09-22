import React from 'react'
import Link from '@docusaurus/Link'

import styles from './styles.module.css'

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.79 8.21 11.37.6.11.82-.26.82-.58 0-.28-.01-1.02-.02-2-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.91-.01 3.31 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z"
      />
    </svg>
  )
}

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.inner}>
        <p className={styles.badge}>个人技术知识库</p>
        <h1 className={styles.title}>少踩坑的安装、部署与排障笔记</h1>
        <p className={styles.lead}>
          Linux、Docker、K8s、Java 的可复用步骤，加上真实排障记录。需要时打开就能照着做。
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} to="/docs/tutorials/">
            从教程开始
          </Link>
          <Link className={styles.secondary} to="/docs/troubleshooting/">
            最近踩坑
          </Link>
          <a
            className={styles.ghost}
            href="https://github.com/yunqilee69"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon />
            GitHub
          </a>
        </div>
        <p className={styles.searchHint}>
          顶部搜索，或按 <kbd>Ctrl</kbd>
          <kbd>K</kbd> 直接找文档
        </p>
      </div>
    </section>
  )
}
