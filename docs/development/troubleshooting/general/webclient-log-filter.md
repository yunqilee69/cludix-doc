---
tags:
  - Java
  - Spring Boot
---
Spring Boot提供了WebClient，这种非阻塞式的网络请求库，拥有着高性能、高效率。但是就是由于非阻塞的特性的，导致很难获取请求体的内容

下面提供一整个代码文件，直接拷走就可以使用，完全打印请求参数、请求体、请求体以及响应体。

## 核心代码

```java WebClientLoggingFilter
package com.cludix.log;

import lombok.extern.slf4j.Slf4j;
import org.reactivestreams.Publisher;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferFactory;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.core.io.buffer.DefaultDataBufferFactory;
import org.springframework.http.client.reactive.ClientHttpRequestDecorator;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * WebClient 流式请求日志拦截器
 *
 */
@Slf4j
@SuppressWarnings("squid:CatchCheck")
public class WebClientLoggingFilter implements ExchangeFilterFunction {

    private final DataBufferFactory dataBufferFactory = new DefaultDataBufferFactory();

    @Override
    public Mono<ClientResponse> filter(ClientRequest request, ExchangeFunction next) {
        long startTime = System.currentTimeMillis();

        // 打印请求信息
        log.info("===== WebClient Request =====");
        log.info("Method: {}", request.method());
        log.info("URL: {}", request.url());
        log.info("Headers: {}", request.headers());

        // 捕获并打印请求体
        ClientRequest modifiedRequest = ClientRequest.from(request)
                .body((outputMessage, context) ->
                        request.body().insert(new ClientHttpRequestDecorator(outputMessage) {
                            @Override
                            public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
                                // 使用Flux处理，确保异常不会中断流程
                                Flux<DataBuffer> capturedBody = Flux.from(body)
                                        .collectList()
                                        .flatMapMany(dataBuffers -> {
                                            // 转换为具体的List<DataBuffer>类型
                                            java.util.List<DataBuffer> bufferList = new java.util.ArrayList<>(dataBuffers);

                                            // 异步记录日志，不阻塞主流程
                                            logRequestBody(bufferList);

                                            // 创建新的DataBuffer副本，避免原始buffer被消费
                                            return Flux.fromIterable(bufferList)
                                                    .map(buffer -> {
                                                        // 复制buffer内容到新的DataBuffer
                                                        byte[] bytes = new byte[buffer.readableByteCount()];
                                                        buffer.read(bytes);
                                                        buffer.readPosition(0); // 重置原始buffer（虽然不会再用）
                                                        // 返回新的DataBuffer
                                                        return dataBufferFactory.wrap(bytes);
                                                    })
                                                    .doOnComplete(() -> {
                                                        // 释放原始buffers
                                                        dataBuffers.forEach(DataBufferUtils::release);
                                                    });
                                        })
                                        .onErrorResume(error -> {
                                            // 日志记录失败时，降级处理：不记录日志，直接传递原始body
                                            log.warn("Failed to capture request body for logging, proceeding without logging", error);
                                            return Flux.from(body);
                                        });

                                return super.writeWith(capturedBody);
                            }
                        }, context)
                )
                .build();

        // 执行请求并打印响应
        return next.exchange(modifiedRequest)
                .flatMap(response -> logStreamResponse(response, startTime))
                .doOnError(error -> {
                    long duration = System.currentTimeMillis() - startTime;
                    log.error("===== Request Failed =====");
                    log.error("Duration: {} ms", duration);
                    log.error("Error: {}", error.getMessage());
                    log.error("===========================");
                });
    }

    /**
     * 记录请求体日志（异步执行，不阻塞主流程）
     */
    private void logRequestBody(java.util.List<DataBuffer> dataBuffers) {
        try {
            if (dataBuffers.isEmpty()) {
                log.info("Request Body: <empty>");
                log.info("==============================");
                return;
            }

            // 计算总大小
            long totalSize = dataBuffers.stream()
                    .mapToLong(DataBuffer::readableByteCount)
                    .sum();

            // 读取并打印完整请求体内容
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            for (DataBuffer buffer : dataBuffers) {
                byte[] bytes = new byte[buffer.readableByteCount()];
                buffer.read(bytes);
                baos.write(bytes);
                buffer.readPosition(0); // 重置读取位置
            }

            String bodyContent = baos.toString(StandardCharsets.UTF_8);
            log.info("Request Body (size: {} bytes): {}", totalSize, bodyContent);
            log.info("==============================");

        } catch (Exception e) {
            // 日志记录失败不应影响请求
            log.warn("Failed to log request body", e);
            log.info("Request Body: <failed to read content>");
            log.info("==============================");
        }
    }

    /**
     * 打印流式响应信息
     */
    private Mono<ClientResponse> logStreamResponse(ClientResponse response, long startTime) {
        long duration = System.currentTimeMillis() - startTime;

        log.info("===== WebClient Response =====");
        log.info("Status Code: {}", response.statusCode());
        log.info("Duration: {} ms", duration);
        log.info("Headers: {}", response.headers().asHttpHeaders());
        log.info("Response Body (Streaming):");

        // 包装响应体以打印每个流式数据块
        ClientResponse wrappedResponse = response.mutate()
                .body(flux -> flux
                        .map(dataBuffer -> {
                            try {
                                // 读取内容用于日志
                                byte[] bytes = new byte[dataBuffer.readableByteCount()];
                                dataBuffer.read(bytes);
                                String chunk = new String(bytes, StandardCharsets.UTF_8);
                                log.info("  Chunk (size: {} bytes): {}", bytes.length, chunk);

                                // 重置读取位置，确保下游可以正常读取
                                dataBuffer.readPosition(0);
                                return dataBuffer;

                            } catch (Exception e) {
                                // 日志记录失败不应影响响应流
                                log.warn("Failed to log stream chunk, proceeding without logging", e);
                                // 尝试重置读取位置（如果还没读完的话）
                                try {
                                    dataBuffer.readPosition(0);
                                } catch (Exception resetError) {
                                    // 重置失败，返回原buffer让下游处理
                                    log.warn("Failed to reset buffer position", resetError);
                                }
                                return dataBuffer;
                            }
                        })
                )
                .build();

        return Mono.just(wrappedResponse);
    }
}
```