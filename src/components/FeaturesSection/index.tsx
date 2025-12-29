import React from 'react'
import { Row, Col, Card, Typography, Space } from 'antd'
import {
  CodeOutlined,
  RocketOutlined,
  BugOutlined,
  BookOutlined,
  TeamOutlined,
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
    icon: <CodeOutlined style={{ fontSize: '32px', color: '#667eea' }} />,
    title: '技术分享',
    description: '分享各类技术栈的实践经验与解决方案',
  },
  {
    icon: <RocketOutlined style={{ fontSize: '32px', color: '#764ba2' }} />,
    title: '性能优化',
    description: '深入探讨性能优化策略与最佳实践',
  },
  {
    icon: <BugOutlined style={{ fontSize: '32px', color: '#f093fb' }} />,
    title: '问题排查',
    description: '总结常见的开发问题与排查思路',
  },
  {
    icon: <BookOutlined style={{ fontSize: '32px', color: '#4facfe' }} />,
    title: '学习笔记',
    description: '记录学习过程中的心得与体会',
  },
  {
    icon: <TeamOutlined style={{ fontSize: '32px', color: '#43e97b' }} />,
    title: '团队协作',
    description: '分享团队协作与项目管理经验',
  },
  {
    icon: <ToolOutlined style={{ fontSize: '32px', color: '#fa709a' }} />,
    title: '工具推荐',
    description: '推荐实用的开发工具与插件',
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
            涵盖前端开发、性能优化、工程化等多个领域
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
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
