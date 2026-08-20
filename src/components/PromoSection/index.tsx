import React from 'react'
import { Card, Typography } from 'antd'
import { ShoppingOutlined, RightOutlined } from '@ant-design/icons'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'

import styles from './styles.module.css'

const { Title, Paragraph } = Typography

export default function PromoSection() {
  const {
    siteConfig: { customFields },
  } = useDocusaurusContext()
  const { xianyuUrl } = customFields as { xianyuUrl: string }

  return (
    <div className={styles.promoSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Title level={2} className={styles.title}>
            推荐
          </Title>
        </div>
        <a
          href={xianyuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.promoLink}
        >
          <Card className={styles.promoCard} hoverable>
            <div className={styles.promoContent}>
              <div className={styles.iconWrapper}>
                <ShoppingOutlined style={{ fontSize: '32px', color: '#ffffff' }} />
              </div>
              <div className={styles.promoInfo}>
                <Title level={4} className={styles.promoTitle}>
                  闲鱼小店
                  <span className={styles.promoBadge}>好物推荐</span>
                </Title>
                <Paragraph className={styles.promoDescription}>
                  精选好物持续上架中，感兴趣的话欢迎进店逛逛～
                </Paragraph>
              </div>
              <div className={styles.promoAction}>
                进店逛逛
                <RightOutlined className={styles.arrowIcon} />
              </div>
            </div>
          </Card>
        </a>
      </div>
    </div>
  )
}
