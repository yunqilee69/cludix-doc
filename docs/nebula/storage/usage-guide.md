# Nebula Storage 使用方式

## 1. 接入方式总览

`nebula-storage` 支持两种主要接入方式：

- 单体模式：业务应用直接引入 `nebula-storage-local`
- 微服务模式：独立部署 `nebula-storage-service`，业务应用引入 `nebula-storage-remote`

无论哪种方式，业务代码最好都面向 `IStorageService` 及其 command/query/dto 契约编程。

---

## 2. 单体应用接入

### 2.1 Maven 依赖

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-storage-local</artifactId>
</dependency>
```

### 2.2 适合场景

适用于：

- 单体后台系统
- 已经使用 `nebula-app-starter` 的场景
- 文件存储能力直接随主应用一起运行

### 2.3 运行方式

此时：

- `StorageController` 直接对外提供接口
- `IStorageService` 由 `StorageServiceImpl` 本地实现
- temp 区与 formal 区都在当前应用中处理

---

## 3. 独立存储服务接入

### 3.1 启动独立服务

```bash
mvn spring-boot:run -pl nebula-storage/nebula-storage-service
```

### 3.2 当前服务配置

从 `nebula-storage-service/src/main/resources/application.yml` 可确认：

- 默认端口：`17783`
- `nebula.storage.mode=local`

即独立服务本身暴露的是本地实现接口，对外作为 storage provider 服务运行。

### 3.3 消费方依赖

业务服务作为消费者时，应引入：

```xml
<dependency>
    <groupId>com.cludix</groupId>
    <artifactId>nebula-storage-remote</artifactId>
</dependency>
```

### 3.4 remote 配置示例

```yaml
nebula:
  storage:
    mode: remote
    remote:
      service-name: nebula-storage-service
      service-url: http://localhost:17783
```

### 3.5 适合场景

适用于：

- 多个业务服务共用一套附件中心
- 文件上传下载能力需要集中治理
- 希望对象存储配置与附件逻辑统一收口

---

## 4. 配置说明

## 4.1 基础示例

```yaml
nebula:
  storage:
    mode: local
    temp-dir: /data/nebula/storage/temp
    signed-download:
      enabled: true
      secret: change-me-storage-signed-secret
      default-expire-seconds: 300
      max-expire-seconds: 1800
      default-max-download-count: 3
      max-download-count-limit: 10
    content:
      type: minio
      filesystem:
        base-dir: /data/nebula/storage/content
      minio:
        endpoint: http://127.0.0.1:9000
        access-key: minioadmin
        secret-key: minioadmin
        bucket: nebula-storage
        create-bucket-if-missing: true
```

### 4.2 `temp-dir`

作用：

- 存普通上传临时文件
- 存分片文件
- 存分片合并结果

注意：

- temp 区固定走文件系统目录
- bind 成功后会通过事件和定时任务清理
- 不适合当长期存储区使用

### 4.3 `content.type`

可选值：

- `filesystem`
- `db`
- `minio`

它决定的是**正式文件内容区**如何保存，而不是业务元数据表落在哪里。

### 4.4 `signed-download`

关键参数：

- `enabled`
- `secret`
- `default-expire-seconds`
- `max-expire-seconds`
- `default-max-download-count`
- `max-download-count-limit`

建议：

- `secret` 使用独立高强度随机值
- 不要把有效期设置过长
- 对对外分享场景可以增加下载次数限制

---

## 5. 业务侧如何使用

## 5.1 普通附件上传

推荐流程：

1. 前端选择文件
2. 调用 `/api/storage/upload`
3. 后端根据文件名/上传上下文补齐扩展名与 MIME，并返回临时上传任务详情 `taskId`
4. 业务表单保存成功
5. 调用 `/api/storage/upload-tasks/{taskId}/bind`
6. 保存返回的正式 `fileId`

适合：

- 合同附件
- 公告附件
- 单据附件
- 用户头像、图片、文档附件

### 5.2 分片上传

推荐流程：

1. 先创建上传任务
2. 前端循环上传分片
3. 调用 complete 合并分片，并由后端按文件名补齐 MIME
4. 业务保存成功后调用 bind
5. 持久化 `fileId`

适合：

- 视频
- 导入包
- 大压缩包
- 超大附件

### 5.3 查询和展示附件

常见做法：

- 业务表只保存 `fileId` 或文件关联关系
- 列表页通过 `/api/storage/files/page` 或业务侧附件关系回表展示
- 详情页调用 `/api/storage/files/{fileId}` 回显文件元信息

### 5.4 平台内部下载

推荐直接使用：

- `GET /api/storage/download?fileId=...`

适用场景：

- 已登录后台用户下载
- 平台前端自己下载
- 网关或浏览器自动携带认证信息

### 5.5 对外分享下载

推荐做法：

1. 用户点击“生成分享链接”
2. 调用 `POST /api/storage/generate-signed-url`
3. 后端先校验原始下载权限
4. 返回短时有效 `url`
5. 将 URL 分享给第三方

不建议：

- 在普通附件列表里批量预生成签名地址
- 把签名下载当成平台内部下载主链路
- 生成长期不失效的公开链接

---

## 6. 业务系统如何扩展权限

`nebula-storage` 当前提供了扩展点：

- `StoragePermissionChecker`

默认实现 `DefaultStoragePermissionChecker` 会直接放行，因此如果业务系统需要更精细的下载权限，应自行实现 Bean 覆盖。

示意：

```java
@Component
public class ContractStoragePermissionChecker implements StoragePermissionChecker {

    @Override
    public boolean canDownload(UserContextDto currentUser, StorageFileDetailDto fileDetail) {
        if (!"contract".equals(fileDetail.getSourceEntity())) {
            return true;
        }
        return hasContractReadPermission(currentUser, fileDetail.getSourceId());
    }

    private boolean hasContractReadPermission(UserContextDto currentUser, String contractId) {
        // 这里接业务权限逻辑
        return true;
    }
}
```

这样可以按：

- 业务单据可见范围
- 组织权限
- 租户范围
- 上传人归属
- 角色授权

进行下载控制。

---

## 7. provider 选型建议

### 7.1 filesystem

建议用于：

- 本地开发
- 单机测试
- 小规模环境

优点：

- 简单直接
- 无额外依赖

缺点：

- 不适合多节点共享
- 容灾能力弱

### 7.2 db

建议用于：

- 不方便接对象存储的环境
- 文件量不大、集中数据库治理的场景

优点：

- 运维简单
- 统一落数据库

缺点：

- 数据库压力更大
- 大文件场景不够友好

### 7.3 minio

建议用于：

- 生产环境
- 多节点部署
- 较大附件规模

优点：

- 更适合正式文件内容存储
- 可扩展性更好

---

## 8. 前端接入建议

### 8.1 上传侧

前端一般需要保存：

- `taskId`
- 上传进度
- `fileId`（bind 成功后）

建议区分两类组件：

1. **普通上传组件**
   - 直接走 `/api/storage/upload`
   - 适合图片、文档、小文件

2. **分片上传组件**
   - 先申请 task
   - 再逐片上传
   - 最后 complete + bind

### 8.2 下载侧

建议区分两类按钮：

1. **下载附件**
   - 走 `/api/storage/download`

2. **复制分享链接**
   - 先调用 `/api/storage/generate-signed-url`
   - 再复制返回的 `data.url`

这样用户心智更清晰，也更符合 storage 模块设计边界。

---

## 9. 常见落地建议

### 9.1 业务表如何关联文件

建议至少记录：

- `fileId`
- 业务主键
- 文件用途（可选）
- 排序号（可选）

### 9.2 bind 调用时机

推荐在：

- 业务主表写入成功之后
- 明确拿到业务主键之后

不要在：

- 表单刚打开时
- 业务还没保存成功时
- 还不知道 `sourceEntity/sourceId` 时

### 9.3 删除策略

如果业务删除附件关系后希望同步删除正式文件，可以显式调 storage 删除接口；
如果只是解除业务关联、不想删物理文件，则应在业务侧单独控制，不要直接调用 storage 删除正式文件。

---

## 10. 小结

storage 模块的最佳使用方式可以概括为：

- **上传时先拿临时任务，不急着视为正式附件**
- **业务保存成功后再 bind 转正**
- **平台内部下载走鉴权下载**
- **外部分享走签名下载**
- **正式内容区优先考虑 MinIO 等对象存储**
- **业务权限通过 `StoragePermissionChecker` 自行补强**

这样才能真正发挥 `nebula-storage` 作为统一附件中心的价值。
