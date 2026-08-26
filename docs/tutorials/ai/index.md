---
title: AI
date: 2026-08-25 15:30
tags: [ai, agent, tutorial]
---

# AI

本目录收录 AI 开发相关文档。当前以 Agent 为主线（概念原理、框架选型、Harness 工程实践三个层面），后续扩展 RAG、微调等其他 AI 技术主题，配套总览篇 [AI Agent 从 0 到 1](/blog/ai-agent-from-zero-to-one) 阅读。

## 目录简介

- **concepts**：理论细节——分类、执行循环、tool calling、context 与 memory
- **frameworks**：Java 框架对比（Spring AI / Spring AI Alibaba / LangChain4j / 裸调自建），附 Python 生态对照
- **harness**：工程实践——harness 设计原则、Coding Agent 拆解、编排框架机制
- **后续扩展**：RAG（检索增强生成）、微调与评估等主题，落地时新增子目录

## 文档清单

> 尚未落地的文档标注「规划中」，完成后转为链接并更新本清单。

### concepts

| 文档 | 说明 | 状态 |
| --- | --- | --- |
| agent分类 | 自主性光谱、workflow vs agent、架构模式（ReAct / Plan-and-Execute / Reflection / Router / Multi-Agent）、应用形态 | 规划中 |
| 执行循环 | LLM loop 逐环节拆解：上下文构造、推理、工具执行、observation 回填、终止条件 | 规划中 |
| tool-calling机制 | 模型如何表达调用意图、JSON 参数校验、引擎侧执行、工具描述设计 | 规划中 |
| context与memory | 上下文窗口即工作内存、压缩与摘要、短期上下文 vs 长期外部存储 | 规划中 |

### frameworks

| 文档 | 说明 | 状态 |
| --- | --- | --- |
| java框架对比 | Spring AI / Spring AI Alibaba / LangChain4j / 裸调 SDK 的定位、选型维度、tool calling 写法对比 | 规划中 |
| python生态对照 | LangChain（组件库思路）与 LangGraph（显式状态图）的设计理念，作 Java 选型参照系 | 规划中 |

### harness

| 文档 | 说明 | 状态 |
| --- | --- | --- |
| harness概念 | 包裹模型的工程外壳：为什么 demo ≠ 产品，模型决定上限、harness 决定下限 | 规划中 |
| coding-agent拆解 | 以 Claude Code / OpenCode 为例：规则注入、工具最小权限、subagent 隔离、验证闭环、审批门与沙箱 | 规划中 |
| 编排框架机制 | 图编排、状态管理与 checkpoint、HITL 人工介入、可观测性 | 规划中 |

## 使用建议

1. 先读总览篇 [AI Agent 从 0 到 1](/blog/ai-agent-from-zero-to-one) 建立全局认知
2. 裸调 SDK 手写一遍 Agent Loop（concepts 部分），理解框架包装的是什么
3. 横向对比框架（frameworks 部分），确定自己的技术栈落点
4. 带着框架使用中的困惑看 harness 部分，理解每个机制解决的真实问题
