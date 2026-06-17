import React from 'react'
import { Row, Col, Card, Typography, Tag } from 'antd'
import { FileTextOutlined, ReadOutlined, RightOutlined } from '@ant-design/icons'
import Link from '@docusaurus/Link'

import styles from './styles.module.css'

const { Title, Paragraph } = Typography

interface DocItem {
  id: string
  title: string
  description: string
  tags: string[]
  permalink: string
  icon: React.ReactNode
}

// 文档导航数据
const docsItems: DocItem[] = [
  {
    id: '1',
    title: '教程',
    description: '安装、配置、部署和使用流程相关文档。',
    tags: ['教程', '实践'],
    permalink: '/docs/tutorials/',
    icon: <FileTextOutlined style={{ fontSize: '32px', color: '#667eea' }} />,
  },
  {
    id: '2',
    title: '踩坑',
    description: 'Bug 解决、异常排查和问题复盘相关文档。',
    tags: ['排障', '问题解决'],
    permalink: '/docs/troubleshooting/',
    icon: <FileTextOutlined style={{ fontSize: '32px', color: '#f093fb' }} />,
  },
  {
    id: '3',
    title: 'Nebula',
    description: '项目开发规范和最佳实践文档。',
    tags: ['规范', '最佳实践'],
    permalink: '/docs/nebula/',
    icon: <FileTextOutlined style={{ fontSize: '32px', color: '#4facfe' }} />,
  },
]

export default function DocsSection() {
  return (
    <div className={styles.docsSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Title level={2} className={styles.title}>
            文档导航
          </Title>
          <Paragraph className={styles.subtitle}>
            探索完整的技术文档和最佳实践
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {docsItems.map(doc => (
            <Col xs={24} sm={12} lg={8} key={doc.id}>
              <Link to={doc.permalink} className={styles.docLink}>
                <Card
                  className={styles.docCard}
                  hoverable
                >
                  <div className={styles.docContent}>
                    <div className={styles.iconWrapper}>{doc.icon}</div>
                    <div className={styles.docInfo}>
                      <div className={styles.docHeader}>
                        <Title level={4} className={styles.docTitle}>
                          {doc.title}
                          <RightOutlined className={styles.arrowIcon} />
                        </Title>
                      </div>
                      <Paragraph className={styles.docDescription}>
                        {doc.description}
                      </Paragraph>
                      <div className={styles.tags}>
                        {doc.tags.map(tag => (
                          <Tag key={tag} className={styles.tag}>
                            {tag}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}
