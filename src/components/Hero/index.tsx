import React from 'react'
import { Typography, Space, Card } from 'antd'
import { GithubOutlined, MailOutlined } from '@ant-design/icons'

import Translate from '@docusaurus/Translate'

import styles from './styles.module.css'

const { Paragraph } = Typography

function Circle() {
  return <div className={styles.circle} />
}

function Name() {
  return (
    <div className={styles.hero_text}>
      <Translate id="homepage.hero.greet">你好! 我是</Translate>
      <span className={styles.name}>
        <Translate id="homepage.hero.name">云星</Translate>
      </span>
      <span className="ml-1">👋</span>
    </div>
  )
}

function SocialLinks() {
  return (
    <Space size="middle" className={styles.socialLinks}>
      <a href="https://github.com" target="_blank" rel="noopener noreferrer">
        <GithubOutlined style={{ fontSize: '24px' }} />
      </a>
      <a href="mailto:contact@example.com">
        <MailOutlined style={{ fontSize: '24px' }} />
      </a>
    </Space>
  )
}

export default function Hero() {
  return (
    <div className={styles.hero}>
      <div className={styles.intro}>
        <Name />
        <div className={styles.descriptionWrapper}>
          <Card className={styles.descriptionCard}>
            <Paragraph className={styles.description}>
              <Translate id="homepage.hero.text">
                在这里我会分享各类技术栈所遇到问题与解决方案，带你了解最新的技术栈以及实际开发中如何应用，并希望我的开发经历对你有所启发。
              </Translate>
            </Paragraph>
            <SocialLinks />
          </Card>
        </div>
      </div>
      <div className={styles.background}>
        <Circle />
      </div>
    </div>
  )
}