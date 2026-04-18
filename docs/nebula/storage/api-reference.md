import ApiEndpoint from '@site/src/components/ApiEndpoint'

# Nebula Storage 接口信息

本文档说明 `nebula-storage` 当前对外暴露的核心接口。接口说明基于：

- `StorageController`
- `IStorageService`
- command / query / dto 定义

说明约定：

- 大多数管理类接口返回统一 `ApiResult`
- 分页接口统一使用 `POST`
- 文件上传接口使用 `multipart/form-data`
- 普通上传完成后仍需调用 bind 才会生成正式文件

---

## 1. 创建上传任务

<ApiEndpoint
  name="创建上传任务"
  description="仅用于分块上传场景。前端传文件名、文件大小和分块信息即可，文件扩展名由后端根据文件名推导，MIME 类型不在建任务阶段传递。"
  method="POST"
  path="/api/storage/upload-tasks"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'fileName', type: 'string', required: false, description: '文件名，后端会基于它推导文件扩展名' },
      { name: 'fileSize', type: 'number', required: false, description: '文件大小，单位字节' },
      { name: 'chunkSize', type: 'number', required: false, description: '单个分片大小' },
      { name: 'chunkCount', type: 'number', required: false, description: '分片总数' },
    ],
    example: {
      fileName: 'archive.zip',
      fileSize: 104857600,
      chunkSize: 5242880,
      chunkCount: 20,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'code', type: 'string', description: '响应码，成功通常为 0' },
        { name: 'message', type: 'string', description: '响应消息' },
        { name: 'data', type: 'string', description: '上传任务 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: '9f0b29f6c7f64f08b26d8a6720c4e301',
      },
    },
  ]}
/>

---

## 2. 直接上传单文件

<ApiEndpoint
  name="直接上传单文件"
  description="适用于普通附件场景。上传成功后返回临时上传任务详情，后续仍需要 bind 才会生成正式文件。文件扩展名和 MIME 类型都由后端根据文件名与上传内容上下文自动补齐。"
  method="POST"
  path="/api/storage/upload"
  requestBody={{
    contentType: 'multipart/form-data',
    fields: [
      { name: 'fileName', type: 'string', required: false, description: '自定义文件名，不传时使用上传文件原始文件名' },
      { name: 'file', type: 'file', required: true, description: '上传文件内容' },
    ],
    example: {
      fileName: '合同.pdf',
      file: '(binary)',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'code', type: 'string', description: '响应码' },
        { name: 'message', type: 'string', description: '响应消息' },
        { name: 'data.id', type: 'string', description: '上传任务 ID' },
        { name: 'data.taskMode', type: 'string', description: '任务类型，固定为 simple' },
        { name: 'data.fileName', type: 'string', description: '文件名' },
        { name: 'data.fileSize', type: 'number', description: '文件大小' },
        { name: 'data.fileHash', type: 'string', description: '文件 MD5' },
        { name: 'data.status', type: 'string', description: '任务状态，通常为 COMPLETED' },
        { name: 'data.resultFileId', type: 'string', description: '正式文件 ID，未 bind 前通常为空' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: 'task-001',
          taskMode: 'simple',
          fileName: '合同.pdf',
          fileExtension: 'pdf',
          fileMimeType: 'application/pdf',
          fileSize: 204800,
          fileHash: '6f5902ac237024bdd0c176cb93063dc4',
          chunkSize: null,
          chunkCount: 1,
          uploadedChunkCount: 1,
          status: 'COMPLETED',
          uploadUserId: 'user-001',
          resultFileId: null,
          lastChunkTime: '2026-04-18T15:20:31',
          createTime: '2026-04-18T15:20:31',
          updateTime: '2026-04-18T15:20:31',
        },
      },
    },
  ]}
/>

---

## 3. 上传分片

<ApiEndpoint
  name="上传分片"
  description="向指定上传任务写入一个分片，支持可选 partHash 做一致性校验。"
  method="PUT"
  path="/api/storage/upload-tasks/{taskId}/parts/{partNo}"
  queryParams={[
    { name: 'partSize', type: 'number', required: true, description: '当前分片大小' },
    { name: 'partHash', type: 'string', required: false, description: '当前分片哈希值，可选' },
  ]}
  requestBody={{
    contentType: 'multipart/form-data',
    fields: [
      { name: 'taskId', type: 'path', required: true, description: '上传任务 ID' },
      { name: 'partNo', type: 'path', required: true, description: '分片序号，从 1 开始或由前端约定' },
      { name: 'file', type: 'file', required: true, description: '当前分片内容' },
    ],
    example: {
      taskId: 'task-001',
      partNo: 1,
      partSize: 5242880,
      partHash: 'e10adc3949ba59abbe56e057f20f883e',
      file: '(binary)',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.id', type: 'string', description: '上传任务 ID' },
        { name: 'data.uploadedChunkCount', type: 'number', description: '已上传分片数' },
        { name: 'data.taskMode', type: 'string', description: '任务类型，固定为 chunk' },
        { name: 'data.status', type: 'string', description: '任务状态，通常为 UPLOADING' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: 'task-001',
          taskMode: 'chunk',
          fileName: 'archive.zip',
          fileExtension: 'zip',
          fileMimeType: 'application/zip',
          fileSize: 104857600,
          fileHash: null,
          chunkSize: 5242880,
          chunkCount: 20,
          uploadedChunkCount: 1,
          status: 'UPLOADING',
          uploadUserId: 'user-001',
          resultFileId: null,
          lastChunkTime: '2026-04-18T15:20:31',
          createTime: '2026-04-18T15:18:00',
          updateTime: '2026-04-18T15:20:31',
        },
      },
    },
  ]}
/>

---

## 5. 完成上传任务

<ApiEndpoint
  name="完成上传任务"
  description="用于 chunk 场景，触发分片完整性校验、分片合并和临时完整文件生成。"
  method="POST"
  path="/api/storage/upload-tasks/{taskId}/complete"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.id', type: 'string', description: '上传任务 ID' },
        { name: 'data.fileHash', type: 'string', description: '合并后完整文件 hash' },
        { name: 'data.status', type: 'string', description: '任务状态，通常为 COMPLETED' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: 'task-001',
          taskMode: 'chunk',
          fileName: 'archive.zip',
          fileExtension: 'zip',
          fileMimeType: 'application/zip',
          fileSize: 104857600,
          fileHash: 'b8a9f715dbb64fd5c56e7783c6820a61',
          chunkSize: 5242880,
          chunkCount: 20,
          uploadedChunkCount: 20,
          status: 'COMPLETED',
          uploadUserId: 'user-001',
          resultFileId: null,
          lastChunkTime: '2026-04-18T15:25:00',
          createTime: '2026-04-18T15:18:00',
          updateTime: '2026-04-18T15:25:10',
        },
      },
    },
  ]}
/>

---

## 6. 绑定上传任务

<ApiEndpoint
  name="绑定上传任务"
  description="把已完成的临时上传任务绑定到业务实体，生成正式文件记录并返回 fileId。"
  method="POST"
  path="/api/storage/upload-tasks/{taskId}/bind"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'sourceEntity', type: 'string', required: true, description: '来源实体，例如 contract、notice、invoice' },
      { name: 'sourceId', type: 'string', required: true, description: '来源实体 ID' },
      { name: 'sourceType', type: 'string', required: false, description: '来源类型，默认 default' },
    ],
    example: {
      sourceEntity: 'contract',
      sourceId: 'contract-001',
      sourceType: 'default',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'string', description: '正式文件 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: 'file-001',
      },
    },
  ]}
/>

---

## 7. 上传任务详情

<ApiEndpoint
  name="上传任务详情"
  description="查询上传任务当前状态、上传统计信息和是否已经生成正式文件。"
  method="GET"
  path="/api/storage/upload-tasks/{taskId}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.id', type: 'string', description: '上传任务 ID' },
        { name: 'data.status', type: 'string', description: '任务状态' },
        { name: 'data.resultFileId', type: 'string', description: '绑定后生成的正式文件 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: 'task-001',
          taskMode: 'simple',
          fileName: '合同.pdf',
          fileExtension: 'pdf',
          fileMimeType: 'application/pdf',
          fileSize: 204800,
          fileHash: '6f5902ac237024bdd0c176cb93063dc4',
          chunkSize: null,
          chunkCount: 1,
          uploadedChunkCount: 1,
          status: 'COMPLETED',
          uploadUserId: 'user-001',
          resultFileId: 'file-001',
          lastChunkTime: '2026-04-18T15:20:31',
          createTime: '2026-04-18T15:20:31',
          updateTime: '2026-04-18T15:20:40',
        },
      },
    },
  ]}
/>

---

## 8. 正式文件详情

<ApiEndpoint
  name="正式文件详情"
  description="查询正式文件元数据与业务归属信息。"
  method="GET"
  path="/api/storage/files/{fileId}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.id', type: 'string', description: '正式文件 ID' },
        { name: 'data.fileName', type: 'string', description: '文件名' },
        { name: 'data.fileSize', type: 'number', description: '文件大小' },
        { name: 'data.fileHash', type: 'string', description: '文件 hash' },
        { name: 'data.sourceEntity', type: 'string', description: '来源实体' },
        { name: 'data.sourceId', type: 'string', description: '来源实体 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: 'file-001',
          fileName: '合同.pdf',
          fileExtension: 'pdf',
          fileMimeType: 'application/pdf',
          fileSize: 204800,
          fileHash: '6f5902ac237024bdd0c176cb93063dc4',
          sourceEntity: 'contract',
          sourceId: 'contract-001',
          sourceType: 'default',
          uploadTaskId: 'task-001',
          uploadUserId: 'user-001',
          createTime: '2026-04-18T15:20:40',
          updateTime: '2026-04-18T15:20:40',
        },
      },
    },
  ]}
/>

---

## 9. 分页查询正式文件

<ApiEndpoint
  name="分页查询正式文件"
  description="按文件名、业务来源、上传人等条件分页查询正式文件。"
  method="POST"
  path="/api/storage/files/page"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '当前页码，默认 1' },
      { name: 'pageSize', type: 'number', required: false, description: '每页大小，默认 20' },
      { name: 'orderName', type: 'string', required: false, description: '排序字段' },
      { name: 'orderType', type: 'string', required: false, description: '排序方向，asc/desc' },
      { name: 'fileName', type: 'string', required: false, description: '按文件名模糊过滤' },
      { name: 'sourceEntity', type: 'string', required: false, description: '按来源实体过滤' },
      { name: 'sourceId', type: 'string', required: false, description: '按来源实体 ID 过滤' },
      { name: 'sourceType', type: 'string', required: false, description: '按来源类型过滤' },
      { name: 'uploadUserId', type: 'string', required: false, description: '按上传用户过滤' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      orderName: 'createTime',
      orderType: 'desc',
      sourceEntity: 'contract',
      sourceId: 'contract-001',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.list', type: 'array', description: '分页数据列表' },
        { name: 'data.total', type: 'number', description: '总记录数' },
        { name: 'data.pageNum', type: 'number', description: '当前页码' },
        { name: 'data.pageSize', type: 'number', description: '每页大小' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          list: [
            {
              id: 'file-001',
              fileName: '合同.pdf',
              fileExtension: 'pdf',
              fileMimeType: 'application/pdf',
              fileSize: 204800,
              fileHash: '6f5902ac237024bdd0c176cb93063dc4',
              sourceEntity: 'contract',
              sourceId: 'contract-001',
              sourceType: 'default',
              uploadTaskId: 'task-001',
              uploadUserId: 'user-001',
              createTime: '2026-04-18T15:20:40',
              updateTime: '2026-04-18T15:20:40',
            },
          ],
          total: 1,
          pageNum: 1,
          pageSize: 10,
          pages: 1,
        },
      },
    },
  ]}
/>

---

## 10. 登录态鉴权下载

<ApiEndpoint
  name="登录态鉴权下载"
  description="前端或已登录调用方通过 Authorization 下载正式文件。"
  method="GET"
  path="/api/storage/download"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: '登录令牌，需具备业务下载权限' },
  ]}
  queryParams={[
    { name: 'fileId', type: 'string', required: true, description: '正式文件 ID' },
    { name: 'filename', type: 'string', required: false, description: '自定义下载文件名，不传则使用正式文件名' },
  ]}
  responses={[
    {
      status: 200,
      label: '文件流',
      fields: [
        { name: 'Content-Type', type: 'http-header', description: '文件 MIME 类型或 application/octet-stream' },
        { name: 'Content-Disposition', type: 'http-header', description: '附件下载文件名' },
      ],
      example: {
        note: '返回的是二进制文件流，不是 JSON。',
      },
    },
  ]}
/>

---

## 11. 生成签名下载地址

<ApiEndpoint
  name="生成签名下载地址"
  description="登录态用户在通过原始下载权限校验后，生成一个可分享给第三方的短时签名下载地址。"
  method="POST"
  path="/api/storage/generate-signed-url"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: '登录令牌，生成签名前会先校验原始下载权限' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'fileId', type: 'string', required: true, description: '正式文件 ID' },
      { name: 'filename', type: 'string', required: false, description: '分享下载时使用的文件名，不传则使用正式文件名' },
      { name: 'expireSeconds', type: 'number', required: false, description: '签名有效期（秒）' },
      { name: 'maxDownloadCount', type: 'number', required: false, description: '最大下载次数，不传则使用默认值或不限制' },
    ],
    example: {
      fileId: 'file-001',
      filename: '合同-外发版.pdf',
      expireSeconds: 300,
      maxDownloadCount: 2,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.fileId', type: 'string', description: '文件 ID' },
        { name: 'data.fileName', type: 'string', description: '下载文件名' },
        { name: 'data.expireAtEpochSecond', type: 'number', description: '过期时间戳（秒）' },
        { name: 'data.maxDownloadCount', type: 'number', description: '允许下载总次数，null 表示不限制' },
        { name: 'data.remainingDownloadCount', type: 'number', description: '剩余下载次数，null 表示不限制' },
        { name: 'data.signature', type: 'string', description: '签名值' },
        { name: 'data.url', type: 'string', description: '完整签名下载 URL' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          fileId: 'file-001',
          fileName: '合同-外发版.pdf',
          expireAtEpochSecond: 1760000000,
          maxDownloadCount: 2,
          remainingDownloadCount: 2,
          signature: 'abc123signature',
          url: 'https://example.com/api/storage/download-signed?fileId=file-001&filename=%E5%90%88%E5%90%8C-%E5%A4%96%E5%8F%91%E7%89%88.pdf&expireAt=1760000000&maxDownloadCount=2&signature=abc123signature',
        },
      },
    },
  ]}
/>

---

## 12. 签名下载正式文件

<ApiEndpoint
  name="签名下载正式文件"
  description="第三方或未登录用户通过分享链接下载文件，不依赖 Authorization，只依赖签名、时效和次数限制。"
  method="GET"
  path="/api/storage/download-signed"
  queryParams={[
    { name: 'fileId', type: 'string', required: true, description: '正式文件 ID' },
    { name: 'filename', type: 'string', required: true, description: '下载文件名，参与签名计算，不要擅自篡改' },
    { name: 'expireAt', type: 'number', required: true, description: '过期时间戳（秒）' },
    { name: 'maxDownloadCount', type: 'number', required: false, description: '最大下载次数' },
    { name: 'signature', type: 'string', required: true, description: '签名值' },
  ]}
  responses={[
    {
      status: 200,
      label: '文件流',
      fields: [
        { name: 'Content-Type', type: 'http-header', description: '文件 MIME 类型或 application/octet-stream' },
        { name: 'Content-Disposition', type: 'http-header', description: '附件下载文件名' },
      ],
      example: {
        note: '返回的是二进制文件流，不是 JSON。',
      },
    },
  ]}
/>

---

## 13. 删除正式文件

<ApiEndpoint
  name="删除正式文件"
  description="删除正式文件记录；如果没有其他记录引用同一底层存储位置，模块会进一步删除真实内容。"
  method="DELETE"
  path="/api/storage/files/{fileId}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'code', type: 'string', description: '响应码' },
        { name: 'message', type: 'string', description: '响应消息' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: null,
      },
    },
  ]}
/>

---

## 14. 接口使用建议

### 14.1 普通附件

推荐顺序：

1. `POST /api/storage/upload`
2. `POST /api/storage/upload-tasks/{taskId}/bind`
3. `GET /api/storage/files/{fileId}` 或 `/api/storage/download`

### 14.2 大文件

推荐顺序：

1. `POST /api/storage/upload-tasks`
2. `PUT /api/storage/upload-tasks/{taskId}/parts/{partNo}`
3. `POST /api/storage/upload-tasks/{taskId}/complete`
4. `POST /api/storage/upload-tasks/{taskId}/bind`

### 14.3 分享下载

推荐顺序：

1. `POST /api/storage/generate-signed-url`
2. 把返回的 `data.url` 分享给第三方
3. 第三方访问 `/api/storage/download-signed`
