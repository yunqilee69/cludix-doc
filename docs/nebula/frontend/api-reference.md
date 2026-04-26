import ApiEndpoint from '@site/src/components/ApiEndpoint'

# Nebula Frontend 接口信息

本文档基于 `nebula-frontend-local` 中当前已经实现的 `FrontendController` 整理，对外接口入口统一位于 `/api/frontend/**`。

说明约定：

- 所有接口返回统一 `ApiResult`
- 配置类接口主要面向平台管理员和后台设置页
- 偏好类接口面向当前登录用户
- 缓存管理接口面向 `DynamicCacheService` 管理的动态缓存

---

## 1. 初始化与配置接口

<ApiEndpoint
  name="获取前端初始化配置"
  description="返回前端启动所需的一次性初始化数据，包含平台配置、登录配置、默认偏好和默认主题。"
  method="GET"
  path="/api/frontend/init"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.frontendConfig', type: 'object', description: '平台级前端配置' },
        { name: 'data.loginConfig', type: 'object', description: '登录页初始化配置' },
        { name: 'data.defaultPreference', type: 'object', description: '默认偏好' },
        { name: 'data.defaultTheme', type: 'object', description: '默认主题定义' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          frontendConfig: {
            projectName: 'Nebula',
            layoutMode: 'side',
            defaultThemeCode: 'nebula-light',
            defaultLocale: 'zh-CN',
            localeOptions: ['zh-CN', 'en-US'],
          },
          loginConfig: {
            usernameEnabled: true,
            usernameRegisterAllowed: true,
            oauth2Enabled: true,
            wechatWebEnabled: true,
            wechatWebType: 'qr',
          },
          defaultPreference: {
            localeTag: 'zh-CN',
            themeCode: 'nebula-light',
            navigationLayoutCode: 'side-nav',
            sidebarLayoutCode: 'classic-sidebar',
          },
          defaultTheme: {
            themeCode: 'nebula-light',
            themeName: 'Nebula Light',
            builtinFlag: true,
            themeConfig: {
              primaryColor: '#1f6feb',
              sidebarColor: '#0f172a',
              headerColor: '#ffffff',
              backgroundColor: '#f8fafc',
              textColor: '#0f172a',
            },
          },
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="获取前端配置"
  description="获取平台级前端配置，主要用于后台配置页面回显。"
  method="GET"
  path="/api/frontend/config"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.projectName', type: 'string', description: '项目名称' },
        { name: 'data.layoutMode', type: 'string', description: '布局模式：side / top / mix' },
        { name: 'data.defaultThemeCode', type: 'string', description: '默认主题编码' },
        { name: 'data.defaultLocale', type: 'string', description: '默认语言' },
        { name: 'data.localeOptions', type: 'array', description: '可选语言列表' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          projectName: 'Nebula',
          layoutMode: 'side',
          defaultThemeCode: 'nebula-light',
          defaultLocale: 'zh-CN',
          localeOptions: ['zh-CN', 'en-US'],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="保存前端配置"
  description="保存平台级前端配置，会把项目名称、默认主题、默认语言等配置写入参数中心。"
  method="PUT"
  path="/api/frontend/config"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'projectName', type: 'string', required: true, description: '项目名称' },
      { name: 'layoutMode', type: 'string', required: true, description: '布局模式：side / top / mix' },
      { name: 'defaultThemeCode', type: 'string', required: true, description: '默认主题编码' },
      { name: 'defaultLocale', type: 'string', required: true, description: '默认语言，例如 zh-CN' },
      { name: 'localeOptions', type: 'array', required: true, description: '可选语言列表' },
    ],
    example: {
      projectName: 'Nebula Console',
      layoutMode: 'mix',
      defaultThemeCode: 'nebula-graphite',
      defaultLocale: 'en-US',
      localeOptions: ['zh-CN', 'en-US'],
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.projectName', type: 'string', description: '项目名称' },
        { name: 'data.layoutMode', type: 'string', description: '布局模式' },
        { name: 'data.defaultThemeCode', type: 'string', description: '默认主题编码' },
        { name: 'data.defaultLocale', type: 'string', description: '默认语言' },
        { name: 'data.localeOptions', type: 'array', description: '可选语言列表' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          projectName: 'Nebula Console',
          layoutMode: 'mix',
          defaultThemeCode: 'nebula-graphite',
          defaultLocale: 'en-US',
          localeOptions: ['zh-CN', 'en-US'],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="获取主题目录"
  description="获取当前支持的主题列表以及主题配置项定义。"
  method="GET"
  path="/api/frontend/themes"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.themes', type: 'array', description: '主题列表' },
        { name: 'data.configItems', type: 'array', description: '主题配置项定义' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          themes: [
            {
              themeCode: 'nebula-light',
              themeName: 'Nebula Light',
              builtinFlag: true,
              themeConfig: {
                primaryColor: '#1f6feb',
                sidebarColor: '#0f172a',
                headerColor: '#ffffff',
                backgroundColor: '#f8fafc',
                textColor: '#0f172a',
              },
            },
            {
              themeCode: 'nebula-graphite',
              themeName: 'Nebula Graphite',
              builtinFlag: true,
              themeConfig: {
                primaryColor: '#0f766e',
                sidebarColor: '#1c1917',
                headerColor: '#292524',
                backgroundColor: '#f5f5f4',
                textColor: '#1c1917',
              },
            },
          ],
          configItems: [
            {
              configKey: 'primaryColor',
              configName: '主色',
              defaultValue: '#1f6feb',
            },
          ],
        },
      },
    },
  ]}
/>

---

## 2. 用户偏好接口

<ApiEndpoint
  name="切换语言"
  description="为当前登录用户切换语言偏好。若未在可选语言列表中，将返回语言配置不合法错误。"
  method="PUT"
  path="/api/frontend/preferences/locale"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'localeTag', type: 'string', required: true, description: '语言标签，例如 zh-CN / en-US' },
    ],
    example: {
      localeTag: 'en-US',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.localeTag', type: 'string', description: '当前语言偏好' },
        { name: 'data.themeCode', type: 'string', description: '当前主题编码' },
        { name: 'data.navigationLayoutCode', type: 'string', description: '当前导航布局编码' },
        { name: 'data.sidebarLayoutCode', type: 'string', description: '当前侧边栏布局编码' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          localeTag: 'en-US',
          themeCode: 'nebula-light',
          navigationLayoutCode: 'side-nav',
          sidebarLayoutCode: 'classic-sidebar',
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="切换主题"
  description="为当前登录用户切换主题偏好。主题编码必须存在于内置主题目录中。"
  method="PUT"
  path="/api/frontend/preferences/theme"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'themeCode', type: 'string', required: true, description: '主题编码，例如 nebula-light' },
    ],
    example: {
      themeCode: 'nebula-graphite',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.localeTag', type: 'string', description: '当前语言偏好' },
        { name: 'data.themeCode', type: 'string', description: '当前主题编码' },
        { name: 'data.navigationLayoutCode', type: 'string', description: '当前导航布局编码' },
        { name: 'data.sidebarLayoutCode', type: 'string', description: '当前侧边栏布局编码' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          localeTag: 'zh-CN',
          themeCode: 'nebula-graphite',
          navigationLayoutCode: 'side-nav',
          sidebarLayoutCode: 'classic-sidebar',
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="切换导航和侧边菜单布局"
  description="为当前登录用户切换导航布局和侧边栏布局。布局编码必须落在系统支持的受控集合内。"
  method="PUT"
  path="/api/frontend/preferences/layout"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'navigationLayoutCode', type: 'string', required: true, description: '导航布局编码：side-nav / top-nav / mix-nav' },
      { name: 'sidebarLayoutCode', type: 'string', required: true, description: '侧边栏布局编码：classic-sidebar / double-sidebar / collapsed-sidebar' },
    ],
    example: {
      navigationLayoutCode: 'mix-nav',
      sidebarLayoutCode: 'double-sidebar',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.localeTag', type: 'string', description: '当前语言偏好' },
        { name: 'data.themeCode', type: 'string', description: '当前主题编码' },
        { name: 'data.navigationLayoutCode', type: 'string', description: '当前导航布局编码' },
        { name: 'data.sidebarLayoutCode', type: 'string', description: '当前侧边栏布局编码' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          localeTag: 'zh-CN',
          themeCode: 'nebula-light',
          navigationLayoutCode: 'mix-nav',
          sidebarLayoutCode: 'double-sidebar',
        },
      },
    },
  ]}
/>

---

## 3. 动态缓存管理接口

<ApiEndpoint
  name="查看动态缓存"
  description="查看当前所有动态缓存分组、缓存项及其 TTL 信息。返回值面向后台缓存治理页。"
  method="GET"
  path="/api/frontend/caches"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data[]', type: 'array', description: '缓存分组列表' },
        { name: 'data[].cacheName', type: 'string', description: '缓存名称' },
        { name: 'data[].defaultTtlSeconds', type: 'number', description: '默认 TTL 秒数' },
        { name: 'data[].entryCount', type: 'number', description: '缓存项数量' },
        { name: 'data[].entries', type: 'array', description: '缓存项列表' },
        { name: 'data[].entries[].cacheKey', type: 'string', description: '缓存键' },
        { name: 'data[].entries[].cacheValueJson', type: 'string', description: '缓存值 JSON' },
        { name: 'data[].entries[].cacheValueType', type: 'string', description: '缓存值 Java 类型名' },
        { name: 'data[].entries[].ttlSeconds', type: 'number', description: '写入时 TTL' },
        { name: 'data[].entries[].remainingTtlSeconds', type: 'number', description: '剩余 TTL' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: [
          {
            cacheName: 'systemParamByKey',
            defaultTtlSeconds: 300,
            entryCount: 1,
            entries: [
              {
                cacheKey: 'frontend.project-name',
                cacheValueJson: '{"paramKey":"frontend.project-name","paramValue":"Nebula Console"}',
                cacheValueType: 'com.cludix.nebula.param.model.entity.SystemParamEntity',
                ttlSeconds: 300,
                remainingTtlSeconds: 217,
              },
            ],
          },
        ],
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="删除动态缓存项"
  description="按缓存名称和缓存键精确删除一条动态缓存。只允许删除已注册缓存名称中的条目。"
  method="DELETE"
  path="/api/frontend/caches/entries"
  queryParams={[
    { name: 'cacheName', type: 'string', required: true, description: '缓存名称' },
    { name: 'cacheKey', type: 'string', required: true, description: '缓存键' },
  ]}
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
