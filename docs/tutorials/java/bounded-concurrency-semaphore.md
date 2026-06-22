---
title: 有界并发 - Semaphore
---
# 有界并发 - Semaphore

## 简介

`Semaphore` 是 Java 并发包 (`java.util.concurrent`) 中的信号量类，用于控制同时访问某个资源的线程数量。

可以把 Semaphore 理解成一个**许可证分发器**：

- 初始化时设定许可证数量
- 线程通过 `acquire()` 获取许可证
- 线程通过 `release()` 释放许可证
- 当许可证耗尽时，后续线程阻塞等待

---

## 核心概念

### 许可证模型

```text
Semaphore(3) → 初始有 3 个许可证

线程A: acquire() → 拿走 1 个，剩余 2 个
线程B: acquire() → 拿走 1 个，剩余 1 个
线程C: acquire() → 拿走 1 个，剩余 0 个

线程D: acquire() → 没许可证了，阻塞等待

线程A: release() → 归还 1 个，剩余 1 个
线程D: 立刻获得许可证，开始执行
```

---

## 主要方法

| 方法 | 说明 |
|------|------|
| `acquire()` | 获取 1 个许可证，如果没有则阻塞等待 |
| `acquire(int permits)` | 获取指定数量的许可证 |
| `release()` | 释放 1 个许可证，归还给 Semaphore |
| `release(int permits)` | 释放指定数量的许可证 |
| `tryAcquire()` | 尝试获取许可证，不阻塞，返回成功/失败 |
| `tryAcquire(long timeout, TimeUnit unit)` | 尝试获取许可证，最多等待指定时间 |
| `availablePermits()` | 返回当前可用的许可证数量 |

---

## 实际应用示例

### 示例1：限制并发任务数量

```java
// 配置并发数 = 3，最多 3 个任务同时执行
int concurrency = 3;
Semaphore semaphore = new Semaphore(concurrency);

ExecutorService executor = Executors.newFixedThreadPool(10);

for (int i = 0; i < 20; i++) {
    executor.submit(() -> {
        try {
            semaphore.acquire();  // 获取许可证，只有 3 个线程能通过这里
            // 第 4 个线程会阻塞等待
            
            // 执行任务
            doTask();
            
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            semaphore.release();  // 完成后归还许可证
            // 等待的线程获得许可，开始执行
        }
    });
}
```

**效果说明：**
- 20 个任务提交到线程池
- 前 3 个立即执行
- 后续任务在 `acquire()` 处阻塞
- 当任意一个任务完成并调用 `release()`，等待队列中的下一个任务开始执行

### 示例2：数据库连接池模拟

```java
public class ConnectionPool {
    private final Semaphore semaphore;
    private final List<Connection> connections;
    
    public ConnectionPool(int poolSize) {
        this.semaphore = new Semaphore(poolSize);
        this.connections = new ArrayList<>(poolSize);
        // 初始化连接池
        for (int i = 0; i < poolSize; i++) {
            connections.add(createConnection());
        }
    }
    
    public Connection acquireConnection() throws InterruptedException {
        semaphore.acquire();  // 获取许可证，控制并发访问数量
        return connections.remove(0);
    }
    
    public void releaseConnection(Connection conn) {
        connections.add(conn);
        semaphore.release();  // 归还许可证
    }
}
```

### 示例3：限流控制

```java
// 控制对某个 API 的并发调用数量，防止压垮下游服务
Semaphore apiLimiter = new Semaphore(5);

public ApiResponse callExternalApi(Request request) {
    try {
        apiLimiter.acquire();
        return externalApiClient.call(request);
    } catch (InterruptedException e) {
        throw new RuntimeException("API call interrupted", e);
    } finally {
        apiLimiter.release();
    }
}
```

---

## 与线程池对比

| 对比项 | 线程池 (`ExecutorService`) | Semaphore |
|--------|---------------------------|-----------|
| 控制对象 | 纺程数量 | 并发执行的任务数量 |
| 资源消耗 | 固定线程占用内存 | 仅一个计数器，几乎零开销 |
| 适用场景 | 限制线程本身 | 限制对特定资源的并发访问 |
| 灵活性 | 全局控制 | 可针对特定操作单独控制 |
| 是否持有线程 | 是，线程被池化管理 | 否，只是计数许可 |

**最佳实践：** 使用虚拟线程池（线程数可很大），但用 Semaphore 限制对稀缺资源（如数据库连接、外部 API）的并发访问。

---

## 典型应用场景

### 1. 流量控制（限流）

控制对数据库、外部 API 的并发调用数量，防止压垮下游服务。

```java
// 限制最多 10 个并发数据库查询
Semaphore dbLimiter = new Semaphore(10);
```

### 2. 资源池管理

用于控制连接池、对象池的大小。

```java
// 数据库连接池：最多 20 个连接同时被使用
Semaphore connectionLimiter = new Semaphore(20);
```

### 3. 停车场模型

停车场有 5 个车位，超过 5 辆车要排队等待。

```java
Semaphore parking = new Semaphore(5);  // 5 个车位
// 车进入：parking.acquire()
// 车离开：parking.release()
```

### 4. 有界并发模式

配合线程池实现有界并发任务执行。

```java
ExecutorService executor = Executors.newCachedThreadPool();  // 线程池不限
Semaphore bounded = new Semaphore(10);  // 但任务并发数限制为 10

for (Task task : tasks) {
    executor.submit(() -> {
        bounded.acquire();
        try {
            task.execute();
        } finally {
            bounded.release();
        }
    });
}
```

---

## 注意事项

1. **必须释放许可证** - 在 `finally` 块中调用 `release()`，防止许可证泄露
2. **公平性选择** - 可使用 `new Semaphore(permits, true)` 创建公平模式，按等待顺序获取许可
3. **不要获取过多** - `acquire(n)` 获取数量不应超过初始化许可数，否则可能导致死锁
4. **线程中断处理** - `acquire()` 会抛出 `InterruptedException`，需要正确处理

```java
// 推荐的异常处理模式
try {
    semaphore.acquire();
    try {
        // 执行业务逻辑
    } finally {
        semaphore.release();
    }
} catch (InterruptedException e) {
    Thread.currentThread().interrupt();  // 恢复中断状态
    // 处理中断逻辑
}
```

---

## 总结

Semaphore 是一种轻量级的并发控制机制，核心价值在于：

- **不持有线程** - 只是许可计数，资源开销极小
- **精确控制** - 可针对特定资源设置并发上限
- **灵活组合** - 可与线程池、CompletableFuture 等配合使用

在实际项目中，常见于限流、资源池管理、外部服务调用保护等场景。配合虚拟线程使用，可以实现"线程无限但任务有界"的高效并发模型。