import React from 'react'
import { Row, Col, Card, Typography, Space } from 'antd'
import {
  CodeOutlined,
  BugOutlined,
  BookOutlined,
  ToolOutlined,
} from '@ant-design/icons'

import styles from './styles.module.css'

const { Title, Paragraph } = Typography

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: <BookOutlined style={{ fontSize: '32px', color: '#667eea' }} />,
    title: '体系化教程',
    description: '安装、配置、部署的完整流程，步骤清晰、拿来即用',
  },
  {
    icon: <BugOutlined style={{ fontSize: '32px', color: '#f093fb' }} />,
    title: '踩坑实录',
    description: '真实问题的排查过程与解决方案，帮你少走弯路',
  },
  {
    icon: <CodeOutlined style={{ fontSize: '32px', color: '#4facfe' }} />,
    title: '开源项目',
    description: '自研小工具与项目开发规范，在实践中持续打磨',
  },
  {
    icon: <ToolOutlined style={{ fontSize: '32px', color: '#fa709a' }} />,
    title: '工具推荐',
    description: '亲测好用的开发工具与效率插件推荐',
  },
]

export default function FeaturesSection() {
  return (
    <div className={styles.featuresSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Title level={2} className={styles.title}>
            探索更多内容
          </Title>
          <Paragraph className={styles.subtitle}>
            从教程到踩坑，从项目到工具，都是日常实践的沉淀
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card
                className={styles.featureCard}
                hoverable
                styles={{ body: { padding: '24px' } }}
              >
                <Space style={{ width: '100%' }} direction="vertical" size="middle">
                  <div className={styles.iconWrapper}>{feature.icon}</div>
                  <div>
                    <Title level={4} className={styles.featureTitle}>
                      {feature.title}
                    </Title>
                    <Paragraph className={styles.featureDescription}>
                      {feature.description}
                    </Paragraph>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}
