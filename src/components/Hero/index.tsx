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
        <Translate id="homepage.hero.name">云寰</Translate>
      </span>
      <span className="ml-1">👋</span>
    </div>
  )
}

function SocialLinks() {
  return (
    <Space size="middle" className={styles.socialLinks}>
      <a href="https://github.com/yunqilee69" target="_blank" rel="noopener noreferrer">
        <GithubOutlined style={{ fontSize: '24px' }} />
      </a>
      <a href="mailto:yunqilee69@gmail.com">
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
                这里是我的个人技术知识库：沉淀日常积累的教程与配置实践、真实的问题排查记录，以及一些开源小项目。希望这些内容能帮你少踩坑、更快解决问题。
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