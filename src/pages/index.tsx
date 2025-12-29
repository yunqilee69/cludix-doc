import React, { type ReactNode } from 'react'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'

import Hero from '@site/src/components/Hero'
import Particles from '@site/src/components/Particles'
import DocsSection from '@site/src/components/DocsSection'
import FeaturesSection from '@site/src/components/FeaturesSection'

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
        <Particles className={styles.particles} quantity={100} ease={80} color="#667eea" refresh />

        <div className={styles.content}>
          <DocsSection />
          <FeaturesSection />
        </div>
      </main>
    </Layout>
  )
}
