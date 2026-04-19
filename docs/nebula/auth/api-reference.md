import ApiEndpoint from '@site/src/components/ApiEndpoint'

# Nebula Auth 接口信息

本文基于 `nebula-auth-local` 中当前已经实现的 Controller 整理，对外接口入口统一位于 `/api/auth/**`。

## 1. 登录与认证

<ApiEndpoint
  name="用户注册"
  description="创建一个新的平台用户账号，默认状态为启用。"
  method="POST"
  path="/api/auth/register"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'username', type: 'string', required: true, description: '用户名，长度 3-20' },
      { name: 'password', type: 'string', required: true, description: '密码，长度 6-20' },
      { name: 'nickname', type: 'string', required: false, description: '昵称' },
      { name: 'email', type: 'string', required: false, description: '邮箱，需满足邮箱格式校验' },
      { name: 'phone', type: 'string', required: false, description: '手机号，需满足手机号格式校验' },
    ],
    example: {
      username: 'zhangsan',
      password: '123456',
      nickname: '张三',
      email: 'zhangsan@example.com',
      phone: '13800138000',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'code', type: 'string', description: '响应码' },
        { name: 'message', type: 'string', description: '响应消息' },
        { name: 'data', type: 'string', description: '新创建用户 ID' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: '01962f0adfbe7b6f9d94d5cbab4a1234',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="用户登录"
  description="使用用户名与密码登录，登录成功后返回 accessToken 与 refreshToken。"
  method="POST"
  path="/api/auth/login"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'username', type: 'string', required: true, description: '用户名或手机号' },
      { name: 'password', type: 'string', required: true, description: '密码' },
      { name: 'captcha', type: 'string', required: false, description: '验证码' },
      { name: 'captchaKey', type: 'string', required: false, description: '验证码 key' },
    ],
    example: {
      username: 'admin',
      password: '123456',
      captcha: '1234',
      captchaKey: 'captcha_key_123',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.accessToken', type: 'string', description: '访问令牌' },
        { name: 'data.refreshToken', type: 'string', description: '刷新令牌' },
        { name: 'data.accessTokenExpiresIn', type: 'number', description: '访问令牌过期时间戳' },
        { name: 'data.refreshTokenExpiresIn', type: 'number', description: '刷新令牌过期时间戳' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.yyy',
          accessTokenExpiresIn: 1777777777,
          refreshTokenExpiresIn: 1778382577,
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="刷新令牌"
  description="使用 refreshToken 换取新的登录结果。"
  method="POST"
  path="/api/auth/refresh"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'refreshToken', type: 'string', required: true, description: '刷新令牌' },
    ],
    example: {
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.accessToken', type: 'string', description: '新的访问令牌' },
        { name: 'data.refreshToken', type: 'string', description: '新的刷新令牌' },
        { name: 'data.accessTokenExpiresIn', type: 'number', description: '访问令牌过期时间戳' },
        { name: 'data.refreshTokenExpiresIn', type: 'number', description: '刷新令牌过期时间戳' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          accessTokenExpiresIn: 1777778888,
          refreshTokenExpiresIn: 1778388888,
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="获取认证初始化配置"
  description="返回前端登录页初始化所需的开关、注册策略和第三方登录可用性。"
  method="GET"
  path="/api/auth/get-auth-config"
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.usernameEnabled', type: 'boolean', description: '是否启用用户名登录' },
        { name: 'data.usernameRegisterAllowed', type: 'boolean', description: '是否允许用户名注册' },
        { name: 'data.usernamePasswordMinLength', type: 'number', description: '用户名密码最小长度' },
        { name: 'data.usernamePasswordMaxLength', type: 'number', description: '用户名密码最大长度' },
        { name: 'data.phoneEnabled', type: 'boolean', description: '是否启用手机号登录' },
        { name: 'data.emailEnabled', type: 'boolean', description: '是否启用邮箱登录' },
        { name: 'data.oauth2Enabled', type: 'boolean', description: '是否启用 OAuth2 登录' },
        { name: 'data.wechatWebEnabled', type: 'boolean', description: '是否启用微信网站登录' },
        { name: 'data.wechatWebType', type: 'string', description: '微信网站登录类型：redirect / qr' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          usernameEnabled: true,
          usernameRegisterAllowed: true,
          usernamePasswordMinLength: 6,
          usernamePasswordMaxLength: 20,
          phoneEnabled: false,
          phoneRegisterAllowed: false,
          emailEnabled: false,
          emailRegisterAllowed: false,
          oauth2Enabled: true,
          oauth2RegisterAllowed: true,
          qqOauth2Enabled: false,
          wechatMiniProgramEnabled: true,
          wechatWebEnabled: true,
          wechatWebType: 'qr',
          alipayOauth2Enabled: false,
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="获取当前登录用户"
  description="返回当前 accessToken 对应的用户上下文，包括角色、组织、权限编码与菜单列表。"
  method="GET"
  path="/api/auth/current-user"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.id', type: 'string', description: '用户 ID' },
        { name: 'data.username', type: 'string', description: '用户名' },
        { name: 'data.nickname', type: 'string', description: '昵称' },
        { name: 'data.orgCodeList', type: 'array', description: '组织编码列表' },
        { name: 'data.roleCodeList', type: 'array', description: '角色编码列表' },
        { name: 'data.permissionCodeList', type: 'array', description: '权限编码列表' },
        { name: 'data.menuList', type: 'array', description: '当前用户菜单列表' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: '01962f0adfbe7b6f9d94d5cbab4a1234',
          username: 'admin',
          nickname: '系统管理员',
          orgCodeList: ['ROOT'],
          roleCodeList: ['ADMIN'],
          permissionCodeList: ['*:*:*'],
          menuList: [],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="用户登出"
  description="当前用户退出登录，也可以通过请求体显式指定 userId 和 cacheKey。"
  method="POST"
  path="/api/auth/logout"
  headers={[
    { name: 'Authorization', type: 'string', required: false, description: 'Bearer accessToken，未显式传 userId / cacheKey 时将尝试从 token 解析' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'userId', type: 'string', required: false, description: '用户 ID' },
      { name: 'cacheKey', type: 'string', required: false, description: '在线会话缓存键' },
    ],
    example: {
      userId: '01962f0adfbe7b6f9d94d5cbab4a1234',
      cacheKey: 'auth:user:session:abc123',
    },
  }}
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
  name="分页查询在线用户"
  description="仅管理员或拥有全量权限的用户可调用，用于后台查看当前在线会话。"
  method="POST"
  path="/api/auth/online-users/page"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'userId', type: 'string', required: false, description: '用户 ID' },
      { name: 'username', type: 'string', required: false, description: '用户名' },
      { name: 'nickname', type: 'string', required: false, description: '昵称' },
      { name: 'email', type: 'string', required: false, description: '邮箱' },
      { name: 'phone', type: 'string', required: false, description: '手机号' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      username: 'admin',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.records', type: 'array', description: '在线用户分页数据' },
        { name: 'data.records[].cacheKey', type: 'string', description: '会话缓存键' },
        { name: 'data.records[].userId', type: 'string', description: '用户 ID' },
        { name: 'data.records[].remainingTtlSeconds', type: 'number', description: '剩余 TTL 秒数' },
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
              cacheKey: 'auth:user:session:abc123',
              userId: '01962f0adfbe7b6f9d94d5cbab4a1234',
              username: 'admin',
              nickname: '系统管理员',
              remainingTtlSeconds: 6911,
            },
          ],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="踢出在线用户"
  description="按 cacheKey 强制移除在线会话。"
  method="POST"
  path="/api/auth/online-users/{cacheKey}/kick-out"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
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

---

## 2. 微信与 OAuth2 登录

<ApiEndpoint
  name="微信小程序登录"
  description="通过微信小程序 code 换取登录结果。"
  method="POST"
  path="/api/auth/wechat/mini-program/login"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'code', type: 'string', required: true, description: '微信小程序登录 code' },
    ],
    example: {
      code: 'wx-mini-program-code',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.accessToken', type: 'string', description: '访问令牌' },
        { name: 'data.refreshToken', type: 'string', description: '刷新令牌' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          accessTokenExpiresIn: 1777777777,
          refreshTokenExpiresIn: 1778382577,
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="准备微信网站跳转登录"
  description="生成 redirect 模式的微信授权地址和 state。"
  method="POST"
  path="/api/auth/wechat/web/redirect/prepare"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'redirectAfterLogin', type: 'string', required: false, description: '登录成功后前端希望跳转的地址' },
    ],
    example: {
      redirectAfterLogin: '/workbench',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.state', type: 'string', description: '微信授权 state' },
        { name: 'data.authorizeUrl', type: 'string', description: '微信授权地址' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          state: '7b1af4c08b1246c79680e40398b3fa09',
          authorizeUrl: 'https://open.weixin.qq.com/connect/qrconnect?...',
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="微信网站跳转登录回调"
  description="redirect 模式回调后完成登录并返回 token。"
  method="POST"
  path="/api/auth/wechat/web/redirect/callback"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'code', type: 'string', required: true, description: '微信回调 code' },
      { name: 'state', type: 'string', required: true, description: '授权 state' },
    ],
    example: {
      code: 'wechat-web-code',
      state: '7b1af4c08b1246c79680e40398b3fa09',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          accessTokenExpiresIn: 1777777777,
          refreshTokenExpiresIn: 1778382577,
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="创建微信网站扫码登录二维码"
  description="qr 模式下生成二维码登录链接、loginId 与过期时间。"
  method="POST"
  path="/api/auth/wechat/web/qrcode"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'redirectAfterLogin', type: 'string', required: false, description: '登录成功后的跳转地址' },
    ],
    example: {
      redirectAfterLogin: '/dashboard',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.loginId', type: 'string', description: '登录轮询 ID' },
        { name: 'data.qrCodeUrl', type: 'string', description: '二维码链接' },
        { name: 'data.expiresInSeconds', type: 'number', description: '二维码有效期秒数' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          loginId: 'a13e012ef9594d57bc4b8e6f1fd5b6b8',
          qrCodeUrl: 'https://open.weixin.qq.com/connect/qrconnect?...',
          expiresInSeconds: 600,
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="查询微信网站扫码登录状态"
  description="前端轮询扫码状态，可能返回 WAITING、SCANNED、SUCCESS、EXPIRED。"
  method="GET"
  path="/api/auth/wechat/web/status"
  queryParams={[
    { name: 'loginId', type: 'string', required: true, description: '二维码登录 ID' },
  ]}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.loginId', type: 'string', description: '登录 ID' },
        { name: 'data.status', type: 'string', description: '当前状态' },
        { name: 'data.redirectAfterLogin', type: 'string', description: '登录后跳转地址' },
        { name: 'data.loginResult', type: 'object', description: '登录成功后的 token 信息，仅 SUCCESS 时返回' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          loginId: 'a13e012ef9594d57bc4b8e6f1fd5b6b8',
          status: 'WAITING',
          redirectAfterLogin: '/dashboard',
          loginResult: null,
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="处理微信网站扫码登录回调"
  description="微信扫码回调入口，标记扫码状态并在成功后写入登录结果。"
  method="POST"
  path="/api/auth/wechat/web/callback"
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'code', type: 'string', required: true, description: '微信回调 code' },
      { name: 'state', type: 'string', required: true, description: '回调 state' },
    ],
    example: {
      code: 'wechat-web-code',
      state: '7b1af4c08b1246c79680e40398b3fa09',
    },
  }}
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

## 3. 用户管理

<ApiEndpoint
  name="创建用户"
  description="创建后台用户，并可同时指定角色和组织。"
  method="POST"
  path="/api/auth/users"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'username', type: 'string', required: true, description: '用户名，长度 3-20' },
      { name: 'password', type: 'string', required: true, description: '密码，长度 6-20' },
      { name: 'nickname', type: 'string', required: false, description: '昵称' },
      { name: 'avatar', type: 'string', required: false, description: '头像 URL' },
      { name: 'email', type: 'string', required: false, description: '邮箱' },
      { name: 'phone', type: 'string', required: false, description: '手机号' },
      { name: 'status', type: 'number', required: false, description: '状态：0 禁用，1 启用' },
      { name: 'roleIds', type: 'array', required: false, description: '角色 ID 列表' },
      { name: 'orgIds', type: 'array', required: false, description: '组织 ID 列表' },
    ],
    example: {
      username: 'lisi',
      password: '123456',
      nickname: '李四',
      email: 'lisi@example.com',
      phone: '13900139000',
      status: 1,
      roleIds: ['role-admin'],
      orgIds: ['org-tech'],
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: '01962f0adfbe7b6f9d94d5cbab4affff',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="更新用户"
  description="根据用户 ID 更新昵称、头像、联系方式、状态、角色和组织。"
  method="PUT"
  path="/api/auth/users/{id}"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'id', type: 'string', required: true, description: '用户 ID，请与路径中的 id 保持一致' },
      { name: 'nickname', type: 'string', required: false, description: '昵称' },
      { name: 'avatar', type: 'string', required: false, description: '头像 URL' },
      { name: 'email', type: 'string', required: false, description: '邮箱' },
      { name: 'phone', type: 'string', required: false, description: '手机号' },
      { name: 'status', type: 'number', required: false, description: '状态' },
      { name: 'roleIds', type: 'array', required: false, description: '角色 ID 列表' },
      { name: 'orgIds', type: 'array', required: false, description: '组织 ID 列表' },
    ],
    example: {
      id: '01962f0adfbe7b6f9d94d5cbab4affff',
      nickname: '李四（已更新）',
      status: 1,
      roleIds: ['role-user'],
      orgIds: ['org-product'],
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: '01962f0adfbe7b6f9d94d5cbab4affff',
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="获取用户详情"
  description="查询用户基础信息以及已绑定的角色与组织。"
  method="GET"
  path="/api/auth/users/{id}"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [
        { name: 'data.id', type: 'string', description: '用户 ID' },
        { name: 'data.username', type: 'string', description: '用户名' },
        { name: 'data.roles', type: 'array', description: '角色列表' },
        { name: 'data.organizations', type: 'array', description: '组织列表' },
      ],
      example: {
        code: '0',
        message: 'success',
        data: {
          id: '01962f0adfbe7b6f9d94d5cbab4affff',
          username: 'lisi',
          nickname: '李四',
          status: 1,
          roles: [
            { id: 'role-user', name: '普通用户', code: 'USER' },
          ],
          organizations: [
            { id: 'org-product', name: '产品部', code: 'PRODUCT' },
          ],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询用户"
  description="按用户名、昵称、邮箱、手机号、状态筛选用户。"
  method="POST"
  path="/api/auth/users/page"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'username', type: 'string', required: false, description: '用户名' },
      { name: 'nickname', type: 'string', required: false, description: '昵称' },
      { name: 'email', type: 'string', required: false, description: '邮箱' },
      { name: 'phone', type: 'string', required: false, description: '手机号' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      nickname: '李',
      status: 1,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            {
              id: '01962f0adfbe7b6f9d94d5cbab4affff',
              username: 'lisi',
              nickname: '李四',
              status: 1,
            },
          ],
        },
      },
    },
  ]}
/>

---

## 4. 角色与权限管理

<ApiEndpoint
  name="创建角色"
  description="创建角色定义。"
  method="POST"
  path="/api/auth/roles"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'name', type: 'string', required: true, description: '角色名称，长度 2-20' },
      { name: 'code', type: 'string', required: true, description: '角色编码，长度 2-30' },
      { name: 'description', type: 'string', required: false, description: '角色描述' },
      { name: 'status', type: 'number', required: false, description: '状态：0 禁用，1 启用' },
    ],
    example: {
      name: '管理员',
      code: 'ADMIN',
      description: '系统管理员角色',
      status: 1,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: { code: '0', message: 'success', data: 'role-admin' },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询角色"
  description="按名称、编码、状态分页查询角色。"
  method="POST"
  path="/api/auth/roles/page"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'name', type: 'string', required: false, description: '角色名称' },
      { name: 'code', type: 'string', required: false, description: '角色编码' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      code: 'ADMIN',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            { id: 'role-admin', name: '管理员', code: 'ADMIN', status: 1 },
          ],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="查询所有角色"
  description="返回所有启用角色列表，适合表单下拉框初始化。"
  method="GET"
  path="/api/auth/roles/list"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: [
          { id: 'role-admin', name: '管理员', code: 'ADMIN', description: '系统管理员角色', status: 1 },
        ],
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="创建授权"
  description="创建 USER / ROLE / ORG 对 MENU / BUTTON 的授权关系。"
  method="POST"
  path="/api/auth/permissions"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'subjectType', type: 'string', required: true, description: '主体类型：USER / ROLE / ORG' },
      { name: 'subjectId', type: 'string', required: true, description: '主体 ID' },
      { name: 'resourceType', type: 'string', required: true, description: '资源类型：MENU / BUTTON' },
      { name: 'resourceId', type: 'string', required: true, description: '资源 ID' },
      { name: 'effect', type: 'string', required: false, description: '效果：Allow / Deny' },
      { name: 'scope', type: 'string', required: false, description: '权限范围，默认 ALL' },
    ],
    example: {
      subjectType: 'ROLE',
      subjectId: 'role-admin',
      resourceType: 'MENU',
      resourceId: 'menu-dashboard',
      effect: 'Allow',
      scope: 'ALL',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: { code: '0', message: 'success', data: 'perm-001' },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询授权"
  description="分页查询授权记录。"
  method="POST"
  path="/api/auth/permissions/page"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'subjectType', type: 'string', required: false, description: '主体类型' },
      { name: 'subjectId', type: 'string', required: false, description: '主体 ID' },
      { name: 'resourceType', type: 'string', required: false, description: '资源类型' },
      { name: 'resourceId', type: 'string', required: false, description: '资源 ID' },
      { name: 'effect', type: 'string', required: false, description: '效果' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      subjectType: 'ROLE',
      effect: 'Allow',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            {
              id: 'perm-001',
              subjectType: 'ROLE',
              subjectId: 'role-admin',
              resourceType: 'MENU',
              resourceId: 'menu-dashboard',
              effect: 'Allow',
            },
          ],
        },
      },
    },
  ]}
/>

---

## 5. 组织、菜单、按钮资源

<ApiEndpoint
  name="创建组织"
  description="创建组织节点，可形成公司 / 部门 / 小组的层级结构。"
  method="POST"
  path="/api/auth/orgs"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'name', type: 'string', required: true, description: '组织名称' },
      { name: 'code', type: 'string', required: true, description: '组织编码' },
      { name: 'parentId', type: 'string', required: false, description: '父级组织 ID' },
      { name: 'type', type: 'string', required: true, description: '类型：COMPANY / DEPARTMENT / TEAM' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      name: '技术部',
      code: 'TECH',
      parentId: 'org-root',
      type: 'DEPARTMENT',
      status: 1,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: { code: '0', message: 'success', data: 'org-tech' },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询组织"
  description="按名称、编码、父节点和状态分页查询组织。"
  method="POST"
  path="/api/auth/orgs/page"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'name', type: 'string', required: false, description: '组织名称' },
      { name: 'code', type: 'string', required: false, description: '组织编码' },
      { name: 'parentId', type: 'string', required: false, description: '父组织 ID' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      code: 'TECH',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            { id: 'org-tech', name: '技术部', code: 'TECH', type: 'DEPARTMENT', status: 1 },
          ],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="查询组织树"
  description="返回完整组织树结构。"
  method="GET"
  path="/api/auth/orgs/tree"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: [
          {
            id: 'org-root',
            name: '总部',
            code: 'ROOT',
            type: 'COMPANY',
            children: [
              { id: 'org-tech', name: '技术部', code: 'TECH', type: 'DEPARTMENT', children: [] },
            ],
          },
        ],
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="创建菜单"
  description="创建菜单资源，支持前端路由配置字段。"
  method="POST"
  path="/api/auth/menus"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'name', type: 'string', required: true, description: '菜单名称' },
      { name: 'code', type: 'string', required: true, description: '菜单编码' },
      { name: 'parentId', type: 'string', required: false, description: '父菜单 ID' },
      { name: 'path', type: 'string', required: false, description: '路由路径' },
      { name: 'component', type: 'string', required: false, description: '前端组件路径' },
      { name: 'icon', type: 'string', required: false, description: '图标' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      name: '工作台',
      code: 'DASHBOARD',
      path: '/dashboard',
      component: 'dashboard/index',
      icon: 'DashboardOutlined',
      status: 1,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: { code: '0', message: 'success', data: 'menu-dashboard' },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询菜单"
  description="分页查询根菜单，并返回子菜单树结构。"
  method="POST"
  path="/api/auth/menus/page"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'name', type: 'string', required: false, description: '菜单名称' },
      { name: 'code', type: 'string', required: false, description: '菜单编码' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      code: 'DASHBOARD',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            {
              id: 'menu-dashboard',
              name: '工作台',
              code: 'DASHBOARD',
              children: [],
            },
          ],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="查询菜单树"
  description="返回完整菜单树。"
  method="GET"
  path="/api/auth/menus/tree"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: [
          {
            id: 'menu-dashboard',
            name: '工作台',
            code: 'DASHBOARD',
            path: '/dashboard',
            children: [],
          },
        ],
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="创建按钮"
  description="创建按钮资源，用于动作级权限控制。"
  method="POST"
  path="/api/auth/buttons"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'menuId', type: 'string', required: true, description: '所属菜单 ID' },
      { name: 'code', type: 'string', required: true, description: '按钮编码' },
      { name: 'name', type: 'string', required: true, description: '按钮名称' },
      { name: 'type', type: 'string', required: false, description: '按钮类型，如 add / edit / delete / export' },
      { name: 'sort', type: 'number', required: false, description: '排序号' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      menuId: 'menu-dashboard',
      code: 'DASHBOARD:EXPORT',
      name: '导出',
      type: 'export',
      sort: 10,
      status: 1,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: { code: '0', message: 'success', data: 'button-export' },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询按钮"
  description="分页查询按钮资源。"
  method="POST"
  path="/api/auth/buttons/page"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'menuId', type: 'string', required: false, description: '菜单 ID' },
      { name: 'code', type: 'string', required: false, description: '按钮编码' },
      { name: 'name', type: 'string', required: false, description: '按钮名称' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      menuId: 'menu-dashboard',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            {
              id: 'button-export',
              menuId: 'menu-dashboard',
              code: 'DASHBOARD:EXPORT',
              name: '导出',
              status: 1,
            },
          ],
        },
      },
    },
  ]}
/>

---

## 6. OAuth2 客户端与账户绑定管理

<ApiEndpoint
  name="创建 OAuth2 客户端"
  description="为第三方应用创建 OAuth2 客户端配置。"
  method="POST"
  path="/api/auth/oauth2/clients"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'clientId', type: 'string', required: true, description: '客户端 ID，长度 5-50' },
      { name: 'clientSecret', type: 'string', required: true, description: '客户端密钥，长度 10-100' },
      { name: 'clientName', type: 'string', required: false, description: '客户端名称' },
      { name: 'grantTypes', type: 'string', required: false, description: '授权类型' },
      { name: 'scopes', type: 'string', required: false, description: '授权范围' },
      { name: 'redirectUris', type: 'string', required: false, description: '重定向 URI，当前请求示例写法按字符串传入' },
      { name: 'autoApprove', type: 'boolean', required: false, description: '是否自动批准' },
      { name: 'accessTokenValidity', type: 'number', required: false, description: '访问令牌有效期（秒）' },
      { name: 'refreshTokenValidity', type: 'number', required: false, description: '刷新令牌有效期（秒）' },
      { name: 'additionalInformation', type: 'string', required: false, description: '额外信息 JSON' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      clientId: 'client_001',
      clientSecret: 'client_secret_123456',
      clientName: '移动应用',
      grantTypes: 'password,refresh_token',
      scopes: 'read,write',
      redirectUris: 'https://app.example.com/callback',
      autoApprove: true,
      accessTokenValidity: 7200,
      refreshTokenValidity: 604800,
      additionalInformation: '{"channel":"mobile"}',
      status: 1,
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: { code: '0', message: 'success', data: 'oauth-client-001' },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询 OAuth2 客户端"
  description="分页查询 OAuth2 客户端配置。"
  method="POST"
  path="/api/auth/oauth2/clients/page"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'clientId', type: 'string', required: false, description: '客户端 ID' },
      { name: 'clientName', type: 'string', required: false, description: '客户端名称' },
      { name: 'status', type: 'number', required: false, description: '状态' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      clientName: '移动应用',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            {
              clientId: 'client_001',
              clientName: '移动应用',
              status: 1,
            },
          ],
        },
      },
    },
  ]}
/>

---

<ApiEndpoint
  name="创建 OAuth2 账户绑定"
  description="将本地用户与第三方账号建立绑定关系。"
  method="POST"
  path="/api/auth/oauth2/accounts"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'userId', type: 'string', required: true, description: '本地用户 ID' },
      { name: 'providerId', type: 'string', required: true, description: '提供商 ID，例如 github / wechat / alipay' },
      { name: 'providerUserId', type: 'string', required: false, description: '提供商侧用户 ID' },
      { name: 'providerAttributes', type: 'string', required: false, description: '提供商返回的用户属性 JSON' },
    ],
    example: {
      userId: '01962f0adfbe7b6f9d94d5cbab4affff',
      providerId: 'github',
      providerUserId: 'github_user_123',
      providerAttributes: '{"login":"octocat"}',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: { code: '0', message: 'success', data: 'oauth-account-001' },
    },
  ]}
/>

---

<ApiEndpoint
  name="分页查询 OAuth2 账户绑定"
  description="按用户和提供商分页查询第三方账号绑定。"
  method="POST"
  path="/api/auth/oauth2/accounts/page"
  headers={[
    { name: 'Authorization', type: 'string', required: true, description: 'Bearer accessToken' },
  ]}
  requestBody={{
    contentType: 'application/json',
    fields: [
      { name: 'pageNum', type: 'number', required: false, description: '页码' },
      { name: 'pageSize', type: 'number', required: false, description: '分页大小' },
      { name: 'userId', type: 'string', required: false, description: '用户 ID' },
      { name: 'providerId', type: 'string', required: false, description: '提供商 ID' },
    ],
    example: {
      pageNum: 1,
      pageSize: 10,
      providerId: 'github',
    },
  }}
  responses={[
    {
      status: 200,
      label: '成功',
      fields: [],
      example: {
        code: '0',
        message: 'success',
        data: {
          pageNum: 1,
          pageSize: 10,
          total: 1,
          records: [
            {
              userId: '01962f0adfbe7b6f9d94d5cbab4affff',
              providerId: 'github',
              providerUserId: 'github_user_123',
            },
          ],
        },
      },
    },
  ]}
/>
