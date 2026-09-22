import React, { type ReactNode } from 'react'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'

import Hero from '@site/src/components/Hero'
import DocsSection from '@site/src/components/DocsSection'

import styles from './index.module.css'

export default function Home(): ReactNode {
  const {
    siteConfig: { customFields, tagline },
  } = useDocusaurusContext()
  const { description } = customFields as { description: string }

  return (
    <Layout title={tagline} description={description}>
      <main className={styles.main}>
        <Hero />
        <DocsSection />
      </main>
    </Layout>
  )
}
