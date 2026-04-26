import ApiEndpoint from '@site/src/components/ApiEndpoint'

# Nebula Param 接口信息

本文档基于 `nebula-param-local` 中当前已经实现的 `SystemParamController` 整理，对外接口入口统一位于 `/api/param/system-params/**`。

说明约定：

- 所有接口返回统一 `ApiResult`
- 分页接口统一使用 `POST`
- 参数值最终都按字符串存储，但服务层会依据 `dataType` 执行校验与类型转换
- 批量更新接口更适合后台设置页一次提交多个参数值

---

## 1. 系统参数管理接口

<ApiEndpoint
  name="创建系统参数"
  description="创建一个新的系统参数，同时保存参数元数据、数据类型和校验规则。"
  method="POST"
  path="/api/param/system-params"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'paramKey', type: 'string', required: true, description: '参数键，要求唯一，例如 frontend.project-name' },
      { name: 'paramName', type: 'string', required: true, description: '参数名称' },
      { name: 'description', type: 'string', required: false, description: '参数说明' },
      { name: 'paramValue', type: 'string', required: false, description: '参数值' },
      { name: 'dataType', type: 'string', required: true, description: '数据类型：STRING / INT / DOUBLE / BOOLEAN / SINGLE / MULTIPLE' },
      { name: 'optionCode', type: 'string', required: false, description: '选项编码，SINGLE / MULTIPLE 类型时用于关联字典' },
      { name: 'minValue', type: 'number', required: false, description: '最小值，INT / DOUBLE 类型时使用' },
      { name: 'maxValue', type: 'number', required: false, description: '最大值，INT / DOUBLE 类型时使用' },
      { name: 'minLength', type: 'number', required: false, description: '最小长度，STRING 类型时使用' },
      { name: 'maxLength', type: 'number', required: false, description: '最大长度，STRING 类型时使用' },
      { name: 'defaultValue', type: 'string', required: false, description: '默认值' },
      { name: 'validatorRegex', type: 'string', required: false, description: '正则校验表达式' },
      { name: 'validatorMessage', type: 'string', required: false, description: '校验失败提示信息' },
      { name: 'renderEnabled', type: 'boolean', required: false, description: '是否启用前端渲染' },
      { name: 'placeholder', type: 'string', required: false, description: '输入框占位提示文本' },
      { name: 'moduleCode', type: 'string', required: false, description: '模块编码，用于分组展示' },
      { name: 'displayOrder', type: 'number', required: false, description: '展示顺序' },
      { name: 'sensitiveFlag', type: 'boolean', required: false, description: '是否敏感参数' },
      { name: 'builtinFlag', type: 'boolean', required: false, description: '是否内建参数' },
      { name: 'editableFlag', type: 'boolean', required: false, description: '是否允许在批量更新中修改' },
      { name: 'visibleFlag', type: 'boolean', required: false, description: '是否在模块查询中可见' },
    ],
    example: {
      paramKey: 'frontend.project-name',
      paramName: '前端项目名称',
      description: '后台前端页面左上角显示的项目名称',
      paramValue: 'Nebula',
      dataType: 'STRING',
      defaultValue: 'Nebula',
      minLength: 1,
      maxLength: 50,
      renderEnabled: true,
      placeholder: '请输入项目名称',
      moduleCode: 'frontend',
      displayOrder: 10,
      sensitiveFlag: false,
      builtinFlag: true,
      editableFlag: true,
      visibleFlag: true,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'string', description: '新建系统参数 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: '019dbed8f4bd7644a16d8b41d8fbb101',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="更新系统参数"
  description="更新指定系统参数的元数据、校验规则和当前参数值。"
  method="PUT"
  path="/api/param/system-params/{id}"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'paramName', type: 'string', required: true, description: '参数名称' },
      { name: 'description', type: 'string', required: false, description: '参数说明' },
      { name: 'paramValue', type: 'string', required: false, description: '参数值' },
      { name: 'dataType', type: 'string', required: true, description: '数据类型' },
      { name: 'optionCode', type: 'string', required: false, description: '选项编码' },
      { name: 'minValue', type: 'number', required: false, description: '最小值' },
      { name: 'maxValue', type: 'number', required: false, description: '最大值' },
      { name: 'minLength', type: 'number', required: false, description: '最小长度' },
      { name: 'maxLength', type: 'number', required: false, description: '最大长度' },
      { name: 'defaultValue', type: 'string', required: false, description: '默认值' },
      { name: 'validatorRegex', type: 'string', required: false, description: '正则校验表达式' },
      { name: 'validatorMessage', type: 'string', required: false, description: '校验失败提示信息' },
      { name: 'renderEnabled', type: 'boolean', required: false, description: '是否启用前端渲染' },
      { name: 'placeholder', type: 'string', required: false, description: '占位提示' },
      { name: 'moduleCode', type: 'string', required: false, description: '模块编码' },
      { name: 'displayOrder', type: 'number', required: false, description: '展示顺序' },
      { name: 'sensitiveFlag', type: 'boolean', required: false, description: '是否敏感' },
      { name: 'editableFlag', type: 'boolean', required: false, description: '是否可编辑' },
      { name: 'visibleFlag', type: 'boolean', required: false, description: '是否可见' },
    ],
    example: {
      paramName: '前端项目名称',
      description: '用于工作台和标签页展示的平台名称',
      paramValue: 'Nebula Console',
      dataType: 'STRING',
      defaultValue: 'Nebula',
      minLength: 1,
      maxLength: 60,
      validatorRegex: '^[A-Za-z0-9\\s_-]+$',
      validatorMessage: '仅支持字母、数字、空格、下划线和中划线',
      renderEnabled: true,
      placeholder: '请输入项目名称',
      moduleCode: 'frontend',
      displayOrder: 10,
      sensitiveFlag: false,
      editableFlag: true,
      visibleFlag: true,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'string', description: '系统参数 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: '019dbed8f4bd7644a16d8b41d8fbb101',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="删除系统参数"
  description="删除指定系统参数。当前实现使用软删除，并清理按 key 读取缓存。"
  method="DELETE"
  path="/api/param/system-params/{id}"
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
  name="系统参数详情"
  description="根据系统参数 ID 查询详情。"
  method="GET"
  path="/api/param/system-params/{id}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.id', type: 'string', description: '参数 ID' },
        { name: 'data.paramKey', type: 'string', description: '参数键' },
        { name: 'data.paramName', type: 'string', description: '参数名称' },
        { name: 'data.paramValue', type: 'string', description: '参数值' },
        { name: 'data.dataType', type: 'string', description: '数据类型' },
        { name: 'data.moduleCode', type: 'string', description: '模块编码' },
        { name: 'data.renderEnabled', type: 'boolean', description: '是否启用前端渲染' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: '019dbed8f4bd7644a16d8b41d8fbb101',
          paramKey: 'frontend.project-name',
          paramName: '前端项目名称',
          description: '后台前端页面左上角显示的项目名称',
          paramValue: 'Nebula',
          dataType: 'STRING',
          defaultValue: 'Nebula',
          renderEnabled: true,
          placeholder: '请输入项目名称',
          moduleCode: 'frontend',
          displayOrder: 10,
          sensitiveFlag: false,
          builtinFlag: true,
          editableFlag: true,
          visibleFlag: true,
          createTime: '2026-04-23T10:20:31',
          updateTime: '2026-04-23T10:20:31',
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="按参数键查询详情"
  description="根据参数键查询参数详情，更适合配置中心页面按 key 定位某项参数。"
  method="GET"
  path="/api/param/system-params/key/{paramKey}/detail"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.paramKey', type: 'string', description: '参数键' },
        { name: 'data.paramName', type: 'string', description: '参数名称' },
        { name: 'data.paramValue', type: 'string', description: '参数值' },
        { name: 'data.dataType', type: 'string', description: '数据类型' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: '019dbed8f4bd7644a16d8b41d8fbb101',
          paramKey: 'frontend.project-name',
          paramName: '前端项目名称',
          paramValue: 'Nebula',
          dataType: 'STRING',
          moduleCode: 'frontend',
          displayOrder: 10,
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询系统参数"
  description="按参数键、名称、模块编码、数据类型和渲染开关等条件分页查询系统参数。"
  method="POST"
  path="/api/param/system-params/page"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'orderName', type: 'string', required: false, description: '排序字段名' },
      { name: 'orderType', type: 'string', required: false, description: '排序方向，asc/desc' },
      { name: 'paramKey', type: 'string', required: false, description: '参数键' },
      { name: 'paramName', type: 'string', required: false, description: '参数名称' },
      { name: 'moduleCode', type: 'string', required: false, description: '模块编码' },
      { name: 'dataType', type: 'string', required: false, description: '数据类型' },
      { name: 'renderEnabled', type: 'boolean', required: false, description: '是否启用前端渲染' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      moduleCode: 'frontend',
      renderEnabled: true,
      orderName: 'displayOrder',
      orderType: 'asc',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.records', type: 'array', description: '分页记录' },
        { name: 'data.records[].paramKey', type: 'string', description: '参数键' },
        { name: 'data.records[].paramName', type: 'string', description: '参数名称' },
        { name: 'data.records[].dataType', type: 'string', description: '数据类型' },
        { name: 'data.total', type: 'number', description: '总条数' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 2,
          records: [
            {
              id: '019dbed8f4bd7644a16d8b41d8fbb101',
              paramKey: 'frontend.project-name',
              paramName: '前端项目名称',
              paramValue: 'Nebula',
              dataType: 'STRING',
              moduleCode: 'frontend',
              displayOrder: 10,
              renderEnabled: true,
            },
          ],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="按模块编码查询参数列表"
  description="按模块编码加载一组可见参数，适合前端设置页渲染。当前结果会按 displayOrder 升序返回。"
  method="GET"
  path="/api/param/system-params/module/{moduleCode}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data[]', type: 'array', description: '参数列表' },
        { name: 'data[].paramKey', type: 'string', description: '参数键' },
        { name: 'data[].paramName', type: 'string', description: '参数名称' },
        { name: 'data[].dataType', type: 'string', description: '数据类型' },
        { name: 'data[].displayOrder', type: 'number', description: '展示顺序' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: [
          {
            id: '019dbed8f4bd7644a16d8b41d8fbb101',
            paramKey: 'frontend.project-name',
            paramName: '前端项目名称',
            paramValue: 'Nebula',
            dataType: 'STRING',
            moduleCode: 'frontend',
            displayOrder: 10,
            renderEnabled: true,
          },
          {
            id: '019dbed8f53b71d289a88af88f0e8d10',
            paramKey: 'frontend.default-locale',
            paramName: '默认语言',
            paramValue: 'zh-CN',
            dataType: 'STRING',
            moduleCode: 'frontend',
            displayOrder: 20,
            renderEnabled: true,
          },
        ],
      },
    },
  ]}
/>

---

## 2. 按键保存与批量更新接口

<ApiEndpoint
  name="按参数键保存或更新系统参数"
  description="按 key 直接创建或更新一项系统参数，更适合模块内部程序化写入默认配置。"
  method="PUT"
  path="/api/param/system-params/key/{paramKey}"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'paramName', type: 'string', required: false, description: '参数名称' },
      { name: 'paramValue', type: 'string', required: false, description: '参数值' },
      { name: 'dataType', type: 'string', required: false, description: '数据类型' },
      { name: 'moduleCode', type: 'string', required: false, description: '模块编码' },
      { name: 'displayOrder', type: 'number', required: false, description: '展示顺序' },
      { name: 'renderEnabled', type: 'boolean', required: false, description: '是否启用前端渲染' },
    ],
    example: {
      paramName: '默认主题编码',
      paramValue: 'nebula-light',
      dataType: 'STRING',
      moduleCode: 'frontend',
      displayOrder: 30,
      renderEnabled: true,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'string', description: '保存或更新后的参数 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: '019dbed8f6c17443b264a2d76f7cc321',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="批量更新参数值"
  description="一次提交多个参数值，服务端逐项校验并返回每项更新结果。适合后台设置页“保存全部设置”。"
  method="POST"
  path="/api/param/system-params/batch-update-values"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: '[].paramKey', type: 'string', required: true, description: '参数键' },
      { name: '[].paramValue', type: 'string', required: false, description: '参数值' },
    ],
    example: [
      {
        paramKey: 'frontend.project-name',
        paramValue: 'Nebula Console',
      },
      {
        paramKey: 'frontend.default-locale',
        paramValue: 'en-US',
      },
    ],
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.successCount', type: 'number', description: '成功条数' },
        { name: 'data.failCount', type: 'number', description: '失败条数' },
        { name: 'data.results', type: 'array', description: '逐项结果' },
        { name: 'data.results[].paramKey', type: 'string', description: '参数键' },
        { name: 'data.results[].success', type: 'boolean', description: '是否成功' },
        { name: 'data.results[].message', type: 'string', description: '结果消息' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          successCount: 2,
          failCount: 0,
          results: [
            {
              paramKey: 'frontend.project-name',
              success: true,
              message: '更新成功',
            },
            {
              paramKey: 'frontend.default-locale',
              success: true,
              message: '更新成功',
            },
          ],
        },
      },
    },
  ]}
/>

---

## 3. 按参数键读取接口

<ApiEndpoint
  name="按参数键获取原始字符串值"
  description="根据参数键读取原始字符串值。若参数不存在，通常返回 null。"
  method="GET"
  path="/api/param/system-params/key/{paramKey}"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'string', description: '原始参数值' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: 'Nebula Console',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="按参数键获取布尔值"
  description="根据参数键读取布尔型参数值。若底层值不是 true/false，将返回参数值不合法错误。"
  method="GET"
  path="/api/param/system-params/key/{paramKey}/boolean"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'boolean', description: '布尔型参数值' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: true,
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="按参数键获取整数值"
  description="根据参数键读取整数型参数值。若底层值无法解析为整数，将返回参数值不合法错误。"
  method="GET"
  path="/api/param/system-params/key/{paramKey}/integer"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data', type: 'number', description: '整数型参数值' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: 5,
      },
    },
  ]}
/>
