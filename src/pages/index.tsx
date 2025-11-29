import { React, type ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import { Button, Col, Row, Space } from 'antd';
import 'antd/dist/reset.css';
import { DownOutlined } from '@ant-design/icons';

import cls from './index.module.css';

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  // 平滑滚动到博客列表
  const scrollToBlog = () =>
    document.getElementById('blog-section').scrollIntoView({ behavior: 'smooth' });


  return (
    <Layout
      title={`${siteConfig.title}的小站`}
      description="Description will go into a meta tag in <head />"
    >
      {/* ① 全屏大屏 */}
      <section className={cls.hero}>
        <Row justify="center" align="middle" style={{ height: '100vh' }}>
          <Col span={20} lg={12} style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ color: '#fff', marginBottom: 24 }}>
              欢迎来到 My Blog
            </div>
            <div style={{ fontSize: 20 }}>
              记录代码与生活 · 向下探索更多
            </div>
            <Button
              type="primary"
              size="large"
              shape="round"
              onClick={scrollToBlog}
              icon={<DownOutlined spin />}
            >
              向下滚动
            </Button>
          </Col>
        </Row>

        {/* 浮动指示箭头 */}
        <div className={cls.bounce}>
          <DownOutlined style={{ fontSize: 32, color: '#fff' }} />
        </div>
      </section>

      {/* ② 博客正文占位区 */}
      <section id="blog-section" style={{ padding: '80px 0', background: '#f5f5f5' }}>
        <Row justify="center">
          <Col span={22} lg={16}>
            <div>最新文章</div>
            {/* 这里以后接 Docusaurus BlogPostItems 或自定义列表 */}
            <div style={{ height: 1200, border: '1px dashed #ccc' }}>
              文章列表占位
            </div>
          </Col>
        </Row>
      </section>
    </Layout>
  );
}
