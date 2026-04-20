import ApiEndpoint from '@site/src/components/ApiEndpoint'

# Nebula Dict 接口信息

本文档基于 `nebula-dict-local` 中当前已经实现的 `DictController` 整理，对外接口入口统一位于 `/api/dict/**`。

说明约定：

- 所有接口返回统一 `ApiResult`
- 分页接口统一使用 `POST`
- 字典项支持平铺查询与树查询两种读取方式
- `onlyEnabled` 不传时默认按 `true` 处理

---

## 1. 字典类型接口

<ApiEndpoint
  name="创建字典类型"
  description="创建一个新的字典类型，用于承载某一类业务枚举或业务分类。"
  method="POST"
  path="/api/dict/types"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'code', type: 'string', required: true, description: '字典编码，要求唯一，例如 order_status' },
      { name: 'name', type: 'string', required: true, description: '字典名称' },
      { name: 'status', type: 'number', required: false, description: '状态，通常 1=启用，0=停用' },
      { name: 'remark', type: 'string', required: false, description: '备注' },
    ],
    example: {
      code: 'order_status',
      name: '订单状态',
      status: 1,
      remark: '订单流程状态字典',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'code', type: 'string', description: '响应码' },
        { name: 'message', type: 'string', description: '响应消息' },
        { name: 'data', type: 'string', description: '新建字典类型 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: '019daaa0bbcf717c89d1a2515dcfc0eb',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="更新字典类型"
  description="更新指定字典类型的名称、状态与备注。"
  method="PUT"
  path="/api/dict/types/{id}"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'name', type: 'string', required: true, description: '字典名称' },
      { name: 'status', type: 'number', required: false, description: '状态' },
      { name: 'remark', type: 'string', required: false, description: '备注' },
    ],
    example: {
      name: '订单状态',
      status: 1,
      remark: '用于订单生命周期展示',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'string', description: '字典类型 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: '019daaa0bbcf717c89d1a2515dcfc0eb',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="删除字典类型"
  description="删除指定字典类型。若该字典下仍有字典项，则服务端会拒绝删除。"
  method="DELETE"
  path="/api/dict/types/{id}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: null,
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="字典类型详情"
  description="根据字典类型 ID 查询详情。"
  method="GET"
  path="/api/dict/types/{id}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.id', type: 'string', description: '字典类型 ID' },
        { name: 'data.code', type: 'string', description: '字典编码' },
        { name: 'data.name', type: 'string', description: '字典名称' },
        { name: 'data.status', type: 'number', description: '状态' },
        { name: 'data.remark', type: 'string', description: '备注' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: '019daaa0bbcf717c89d1a2515dcfc0eb',
          code: 'order_status',
          name: '订单状态',
          status: 1,
          remark: '订单流程状态字典',
          createTime: '2026-04-20T19:22:33',
          updateTime: '2026-04-20T19:22:33',
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询字典类型"
  description="按字典编码、名称、状态等条件分页查询字典类型。"
  method="POST"
  path="/api/dict/types/page"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'orderName', type: 'string', required: false, description: '排序字段名' },
      { name: 'orderType', type: 'string', required: false, description: '排序方向，asc/desc' },
      { name: 'code', type: 'string', required: false, description: '字典编码' },
      { name: 'name', type: 'string', required: false, description: '字典名称' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      code: 'order',
      status: 1,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.records', type: 'array', description: '分页记录' },
        { name: 'data.records[].id', type: 'string', description: '字典类型 ID' },
        { name: 'data.records[].code', type: 'string', description: '字典编码' },
        { name: 'data.records[].name', type: 'string', description: '字典名称' },
        { name: 'data.records[].status', type: 'number', description: '状态' },
        { name: 'data.total', type: 'number', description: '总条数' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            {
              id: '019daaa0bbcf717c89d1a2515dcfc0eb',
              code: 'order_status',
              name: '订单状态',
              status: 1,
              createTime: '2026-04-20T19:22:33',
              updateTime: '2026-04-20T19:22:33',
            },
          ],
        },
      },
    },
  ]}
/>

---

## 2. 字典项接口

<ApiEndpoint
  name="创建字典项"
  description="创建新的字典项。既可创建平铺字典项，也可通过 parentId 创建树形字典子节点。"
  method="POST"
  path="/api/dict/items"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'dictCode', type: 'string', required: true, description: '所属字典编码' },
      { name: 'name', type: 'string', required: true, description: '字典项名称' },
      { name: 'parentId', type: 'string', required: false, description: '父级字典项 ID，不传表示根节点' },
      { name: 'itemValue', type: 'string', required: true, description: '字典项值' },
      { name: 'sort', type: 'number', required: false, description: '排序值' },
      { name: 'status', type: 'number', required: false, description: '状态' },
      { name: 'defaultFlag', type: 'boolean', required: false, description: '是否默认值' },
      { name: 'tagColor', type: 'string', required: false, description: '标签颜色' },
      { name: 'extraJson', type: 'string', required: false, description: '扩展属性 JSON' },
      { name: 'remark', type: 'string', required: false, description: '备注' },
    ],
    example: {
      dictCode: 'region',
      name: '上海',
      parentId: '019daaa0bc4370188b6afea800ca4e03',
      itemValue: 'SH',
      sort: 10,
      status: 1,
      defaultFlag: false,
      tagColor: '#1677ff',
      extraJson: '{"level":2}',
      remark: '直辖市',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'string', description: '新建字典项 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: '019daaa0bc46770a851b0b31420da04e',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="更新字典项"
  description="更新指定字典项的展示信息、状态、层级关系与扩展属性。修改 parentId 时服务端会自动维护 path。"
  method="PUT"
  path="/api/dict/items/{id}"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'name', type: 'string', required: true, description: '字典项名称' },
      { name: 'parentId', type: 'string', required: false, description: '父级字典项 ID，可用于节点迁移' },
      { name: 'itemValue', type: 'string', required: true, description: '字典项值' },
      { name: 'sort', type: 'number', required: false, description: '排序值' },
      { name: 'status', type: 'number', required: false, description: '状态' },
      { name: 'defaultFlag', type: 'boolean', required: false, description: '是否默认值' },
      { name: 'tagColor', type: 'string', required: false, description: '标签颜色' },
      { name: 'extraJson', type: 'string', required: false, description: '扩展属性 JSON' },
      { name: 'remark', type: 'string', required: false, description: '备注' },
    ],
    example: {
      name: '上海市',
      parentId: '019daaa0bc4370188b6afea800ca4e03',
      itemValue: 'SH',
      sort: 20,
      status: 1,
      defaultFlag: false,
      tagColor: '#1677ff',
      extraJson: '{"level":2,"hot":true}',
      remark: '华东区域核心城市',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'string', description: '字典项 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: '019daaa0bc46770a851b0b31420da04e',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="删除字典项"
  description="删除指定字典项。若该节点仍有子节点，服务端会拒绝删除。"
  method="DELETE"
  path="/api/dict/items/{id}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: null,
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="字典项详情"
  description="根据字典项 ID 查询详情，返回层级信息、扩展属性与路径信息。"
  method="GET"
  path="/api/dict/items/{id}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.id', type: 'string', description: '字典项 ID' },
        { name: 'data.dictCode', type: 'string', description: '所属字典编码' },
        { name: 'data.name', type: 'string', description: '字典项名称' },
        { name: 'data.parentId', type: 'string', description: '父级字典项 ID' },
        { name: 'data.path', type: 'string', description: '树路径' },
        { name: 'data.itemValue', type: 'string', description: '字典项值' },
        { name: 'data.defaultFlag', type: 'boolean', description: '是否默认值' },
        { name: 'data.tagColor', type: 'string', description: '标签颜色' },
        { name: 'data.extraJson', type: 'string', description: '扩展属性 JSON' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: '019daaa0bc46770a851b0b31420da04e',
          dictCode: 'region',
          name: '上海',
          parentId: '019daaa0bc4370188b6afea800ca4e03',
          path: '019daaa0bc4370188b6afea800ca4e03,019daaa0bc46770a851b0b31420da04e',
          itemValue: 'SH',
          sort: 10,
          status: 1,
          defaultFlag: false,
          tagColor: '#1677ff',
          extraJson: '{"level":2}',
          remark: '直辖市',
          createTime: '2026-04-20T19:22:33',
          updateTime: '2026-04-20T19:22:33',
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询字典项"
  description="按字典编码、名称、状态等条件分页查询字典项。"
  method="POST"
  path="/api/dict/items/page"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'orderName', type: 'string', required: false, description: '排序字段名' },
      { name: 'orderType', type: 'string', required: false, description: '排序方向，asc/desc' },
      { name: 'dictCode', type: 'string', required: false, description: '字典编码' },
      { name: 'name', type: 'string', required: false, description: '字典项名称' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      dictCode: 'region',
      name: '上',
      status: 1,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.records', type: 'array', description: '分页记录' },
        { name: 'data.records[].id', type: 'string', description: '字典项 ID' },
        { name: 'data.records[].dictCode', type: 'string', description: '字典编码' },
        { name: 'data.records[].name', type: 'string', description: '字典项名称' },
        { name: 'data.records[].parentId', type: 'string', description: '父级字典项 ID' },
        { name: 'data.records[].itemValue', type: 'string', description: '字典项值' },
        { name: 'data.records[].sort', type: 'number', description: '排序值' },
        { name: 'data.records[].status', type: 'number', description: '状态' },
        { name: 'data.records[].defaultFlag', type: 'boolean', description: '是否默认值' },
        { name: 'data.records[].tagColor', type: 'string', description: '标签颜色' },
        { name: 'data.total', type: 'number', description: '总条数' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            {
              id: '019daaa0bc46770a851b0b31420da04e',
              dictCode: 'region',
              name: '上海',
              parentId: '019daaa0bc4370188b6afea800ca4e03',
              itemValue: 'SH',
              sort: 10,
              status: 1,
              defaultFlag: false,
              tagColor: '#1677ff',
              createTime: '2026-04-20T19:22:33',
              updateTime: '2026-04-20T19:22:33',
            },
          ],
        },
      },
    },
  ]}
/>

---

## 3. 按字典编码读取接口

<ApiEndpoint
  name="按字典编码查询平铺字典项"
  description="按字典编码查询字典项平铺列表，适合下拉框、状态映射和简单枚举展示。"
  method="GET"
  path="/api/dict/items/dict/{dictCode}"
  queryParams={[
    { name: 'onlyEnabled', type: 'boolean', required: false, description: '是否仅返回启用项；不传时默认 true' },
  ]}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'array', description: '字典项平铺列表' },
        { name: 'data[].id', type: 'string', description: '字典项 ID' },
        { name: 'data[].dictCode', type: 'string', description: '字典编码' },
        { name: 'data[].name', type: 'string', description: '字典项名称' },
        { name: 'data[].parentId', type: 'string', description: '父级字典项 ID' },
        { name: 'data[].itemValue', type: 'string', description: '字典项值' },
        { name: 'data[].sort', type: 'number', description: '排序值' },
        { name: 'data[].status', type: 'number', description: '状态' },
        { name: 'data[].defaultFlag', type: 'boolean', description: '是否默认值' },
        { name: 'data[].tagColor', type: 'string', description: '标签颜色' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: [
          {
            id: '019daaa0bc007785bd85b11d78394543',
            dictCode: 'order_status',
            name: '新建',
            parentId: null,
            itemValue: 'NEW',
            sort: 1,
            status: 1,
            defaultFlag: false,
            tagColor: null,
            createTime: '2026-04-20T19:22:33',
            updateTime: '2026-04-20T19:22:33',
          },
          {
            id: '019daaa0bc0475f98a55dc27a44998be',
            dictCode: 'order_status',
            name: '已支付',
            parentId: null,
            itemValue: 'PAID',
            sort: 2,
            status: 1,
            defaultFlag: false,
            tagColor: '#52c41a',
            createTime: '2026-04-20T19:22:34',
            updateTime: '2026-04-20T19:22:34',
          },
        ],
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="按字典编码查询字典项树"
  description="按字典编码查询字典项树，适合分类树、区域树和级联选择器。若当前结果集中父节点不存在，节点会以根节点形式返回。"
  method="GET"
  path="/api/dict/items/dict/{dictCode}/tree"
  queryParams={[
    { name: 'onlyEnabled', type: 'boolean', required: false, description: '是否仅返回启用项；不传时默认 true' },
  ]}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'array', description: '字典项树列表' },
        { name: 'data[].id', type: 'string', description: '字典项 ID' },
        { name: 'data[].dictCode', type: 'string', description: '字典编码' },
        { name: 'data[].name', type: 'string', description: '字典项名称' },
        { name: 'data[].parentId', type: 'string', description: '父级字典项 ID' },
        { name: 'data[].path', type: 'string', description: '树路径' },
        { name: 'data[].itemValue', type: 'string', description: '字典项值' },
        { name: 'data[].extraJson', type: 'string', description: '扩展属性 JSON' },
        { name: 'data[].remark', type: 'string', description: '备注' },
        { name: 'data[].children', type: 'array', description: '子节点列表' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: [
          {
            id: '019daaa0bc4370188b6afea800ca4e03',
            dictCode: 'region',
            name: '中国',
            parentId: null,
            path: '019daaa0bc4370188b6afea800ca4e03',
            itemValue: 'CN',
            sort: 0,
            status: 1,
            defaultFlag: false,
            tagColor: null,
            extraJson: null,
            remark: null,
            createTime: '2026-04-20T19:22:33',
            updateTime: '2026-04-20T19:22:33',
            children: [
              {
                id: '019daaa0bc46770a851b0b31420da04e',
                dictCode: 'region',
                name: '上海',
                parentId: '019daaa0bc4370188b6afea800ca4e03',
                path: '019daaa0bc4370188b6afea800ca4e03,019daaa0bc46770a851b0b31420da04e',
                itemValue: 'SH',
                sort: 0,
                status: 1,
                defaultFlag: false,
                tagColor: null,
                extraJson: '{"level":2}',
                remark: null,
                createTime: '2026-04-20T19:22:33',
                updateTime: '2026-04-20T19:22:33',
                children: [],
              },
            ],
          },
        ],
      },
    },
  ]}
/>
