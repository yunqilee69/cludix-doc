import React, { useMemo, useState } from 'react'
import { Button, Collapse, Table, Tabs, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import styles from './styles.module.css'

const { Paragraph, Text, Title } = Typography

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface HeaderParam {
  name: string
  type: string
  required: boolean
  description: string
}

export interface QueryParam {
  name: string
  type: string
  required: boolean
  description: string
}

export interface BodyField {
  name: string
  type: string
  required: boolean
  description: string
  indent?: number
}

export interface ResponseField {
  name: string
  type: string
  description: string
}

export interface ResponseBody {
  status: number
  label: string
  fields: ResponseField[]
  example: object
}

export interface ApiEndpointProps {
  name: string
  description: string
  method: HttpMethod
  path: string
  headers?: HeaderParam[]
  queryParams?: QueryParam[]
  requestBody?: {
    contentType?: string
    fields: BodyField[]
    example?: object
  }
  responses?: ResponseBody[]
}

interface ParamRow {
  key: string
  name: React.ReactNode
  type: React.ReactNode
  description: React.ReactNode
}

const paramColumns: ColumnsType<ParamRow> = [
  { title: '名称', dataIndex: 'name', key: 'name', width: '42%' },
  { title: '类型', dataIndex: 'type', key: 'type', width: '14%' },
  { title: '说明', dataIndex: 'description', key: 'description' },
]

function getMethodColor(method: HttpMethod) {
  const methodColorMap: Record<HttpMethod, string> = {
    GET: 'green',
    POST: 'blue',
    PUT: 'orange',
    DELETE: 'red',
    PATCH: 'purple',
  }

  return methodColorMap[method]
}

function formatJson(value: object | string) {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }

  return JSON.stringify(value, null, 2)
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!navigator.clipboard?.writeText) {
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button size="small" onClick={handleCopy}>
      {copied ? '已复制' : '复制'}
    </Button>
  )
}

function RequiredTag({ required }: { required: boolean }) {
  return (
    <Tag className={required ? styles.requiredTag : styles.optionalTag}>
      {required ? '必填' : '可选'}
    </Tag>
  )
}

function TypeTag({ type }: { type: string }) {
  return <Tag className={styles.typeTag}>{type}</Tag>
}

function CodeBlock({ code, label = '示例 JSON' }: { code: string; label?: string }) {
  return (
    <div className={styles.codeBlockWrapper}>
      <div className={styles.codeBlockBar}>
        <span className={styles.codeBlockLabel}>{label}</span>
        <CopyButton text={code} />
      </div>
      <pre className={styles.codeBlockPre}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function FieldNameCell({
  name,
  required,
  indent = 0,
}: {
  name: string
  required: boolean
  indent?: number
}) {
  return (
    <span className={styles.fieldNameCell}>
      <span className={styles.fieldIndent} style={{ paddingLeft: indent * 20 }}>
        {indent > 0 ? <span className={styles.fieldIndentGuide}>└</span> : null}
        <Text code className={styles.fieldNameCode}>
          {name}
        </Text>
      </span>
      <RequiredTag required={required} />
    </span>
  )
}

function ParamTable({ rows }: { rows: ParamRow[] }) {
  return (
    <Table<ParamRow>
      className={styles.paramTable}
      columns={paramColumns}
      dataSource={rows}
      pagination={false}
      size="small"
      bordered={false}
      scroll={{ x: 'max-content' }}
    />
  )
}

function SectionLabel({ title, badge }: { title: string; badge?: string }) {
  return (
    <span className={styles.sectionHeaderInner}>
      <span className={styles.sectionHeaderTitle}>{title}</span>
      {badge ? <span className={styles.sectionHeaderBadge}>{badge}</span> : null}
    </span>
  )
}

function statusTabClass(status: number) {
  if (status >= 200 && status < 300) {
    return styles.respTab2xx
  }

  if (status >= 400 && status < 500) {
    return styles.respTab4xx
  }

  return styles.respTab5xx
}

export default function ApiEndpoint({
  name,
  description,
  method,
  path,
  headers = [],
  queryParams = [],
  requestBody,
  responses = [],
}: ApiEndpointProps) {
  const collapseItems: Array<{ key: string; label: React.ReactNode; children: React.ReactNode }> = []

  if (headers.length > 0) {
    collapseItems.push({
      key: 'headers',
      label: <SectionLabel title="请求头" badge={`${headers.length} 个字段`} />,
      children: (
        <ParamTable
          rows={headers.map((header, index) => ({
            key: String(index),
            name: <FieldNameCell name={header.name} required={header.required} />,
            type: <TypeTag type={header.type} />,
            description: <span className={styles.fieldDesc}>{header.description}</span>,
          }))}
        />
      ),
    })
  }

  if (queryParams.length > 0) {
    collapseItems.push({
      key: 'query',
      label: <SectionLabel title="Query 参数" badge={`${queryParams.length} 个字段`} />,
      children: (
        <ParamTable
          rows={queryParams.map((param, index) => ({
            key: String(index),
            name: <FieldNameCell name={param.name} required={param.required} />,
            type: <TypeTag type={param.type} />,
            description: <span className={styles.fieldDesc}>{param.description}</span>,
          }))}
        />
      ),
    })
  }

  if (requestBody) {
    collapseItems.push({
      key: 'body',
      label: (
        <SectionLabel
          title="请求体"
          badge={requestBody.contentType ?? 'application/json'}
        />
      ),
      children: (
        <div className={styles.sectionStack}>
          <ParamTable
            rows={requestBody.fields.map((field, index) => ({
              key: String(index),
              name: (
                <FieldNameCell
                  name={field.name}
                  required={field.required}
                  indent={field.indent ?? 0}
                />
              ),
              type: <TypeTag type={field.type} />,
              description: <span className={styles.fieldDesc}>{field.description}</span>,
            }))}
          />
          {requestBody.example ? (
            <CodeBlock code={formatJson(requestBody.example)} label="请求体示例" />
          ) : null}
        </div>
      ),
    })
  }

  if (responses.length > 0) {
    const responseTabItems = responses.map((response, index) => ({
      key: String(index),
      label: (
        <span className={statusTabClass(response.status)}>
          {response.status} {response.label}
        </span>
      ),
      children: (
        <div className={styles.sectionStack}>
          {response.fields.length > 0 ? (
            <ParamTable
              rows={response.fields.map((field, fieldIndex) => ({
                key: String(fieldIndex),
                name: (
                  <Text code className={styles.fieldNameCode}>
                    {field.name}
                  </Text>
                ),
                type: <TypeTag type={field.type} />,
                description: <span className={styles.fieldDesc}>{field.description}</span>,
              }))}
            />
          ) : null}
          <CodeBlock code={formatJson(response.example)} label="响应示例" />
        </div>
      ),
    }))

    collapseItems.push({
      key: 'responses',
      label: <SectionLabel title="响应体" />,
      children: (
        <div className={styles.sectionStack}>
          <Tabs size="small" items={responseTabItems} />
        </div>
      ),
    })
  }

  return (
    <div className={styles.apiDoc}>
      <Title level={4} className={styles.apiTitle}>
        {name}
      </Title>
      <Paragraph className={styles.apiDescription}>{description}</Paragraph>

      <div className={styles.apiEndpointRow}>
        <Tag color={getMethodColor(method)} className={styles.methodBadge}>
          {method}
        </Tag>
        <code className={styles.apiPath}>{path}</code>
      </div>

      <div className={styles.apiSections}>
        <Collapse
          className={styles.apiCollapse}
          items={collapseItems}
          defaultActiveKey={[]}
          expandIconPosition="end"
          bordered={false}
        />
      </div>
    </div>
  )
}
