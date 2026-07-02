# Implementation Roadmap (Phase Overview)

## 1. Purpose

Roadmap này đóng vai trò là "Executive Summary" cho toàn bộ quá trình triển khai dự án Universal Coding Harness. Khác với Milestones (M0-M14) tập trung vào chi tiết từng Engine, Roadmap này định hướng các Phase (Giai đoạn) cấp cao để xác định "MVP là gì" và tránh over-engineering.

## 2. Core Strategy

Không build toàn bộ system cùng lúc.
Thay vào đó: **Build vertical slices (end-to-end minimal flow).**

## 3. MVP Principle

MVP (Phase 1) **CHỈ** cần:
* Context Engine (BM25 simple)
* Planning Engine (Rule-based)
* Runtime Engine (File write + Checkpoint basic)
* Verification Engine (Build + Test only)
* 1 Plugin (DotNet hoặc Node)

MVP **KHÔNG** bao gồm:
* Full plugin marketplace
* Mutation testing
* Full observability system
* Multi-language support

---

## 4. Phase Overview

```text id="phase"
Phase 0 → Foundation
Phase 1 → Core Execution Loop (MVP)
Phase 2 → Generation + Enforcement
Phase 3 → Plugin Expansion
Phase 4 → Observability + Scaling
```

---

## 5. Phase 0 — Foundation

**Mục tiêu:** Thiết lập base system + data model + MCP interface.

**Deliverables:**
* MCP Server skeleton
* Task / Plan / Step schema
* Basic Context Pack builder (simple version)
* Local state storage (`~/.harness`)
* CLI init

**Không cần:** Plugin system, Verification engine, Generation Engine.

---

## 6. Phase 1 — Core Execution Loop (MVP)

**Mục tiêu:** Chạy được end-to-end flow: `Context → Plan → Execute → Verify (basic)`

**Components:**
* Context Engine (BM25 simple)
* Planning Engine (rule-based)
* Runtime Engine (file write + checkpoint basic)
* Verification Engine (build + test only)

**Flow:**
```text
Context → Plan → Execute → Build/Test → Done
```

---

## 7. Phase 2 — Generation + Enforcement

**Mục tiêu:** Đóng băng kiến trúc thành code constraints, áp dụng Governance Rules.

**Components:**
* Generation Engine (Sinh artifact, xác định Protected Regions)
* Policy Engine (Sub-module của Planning: Risk mapping, Auto-approve thresholds)
* Code Index (Parser, AST)
* Verification Engine (Lint, Arch check)

---

## 8. Phase 3 — Plugin Expansion

**Mục tiêu:** Mở rộng Harness thành "Universal" thực sự.

**Components:**
* Hoàn thiện Capability Registry
* Xây dựng Java Plugin, Python Plugin, Go Plugin
* Tách Policy Engine thành microservice độc lập (nếu cần thiết)

---

## 9. Phase 4 — Observability + Scaling

**Mục tiêu:** Giám sát, tracing và xử lý fault-tolerance quy mô lớn.

**Components:**
* Observability System (Audit Logging, Tracing)
* Metrics Dashboard
* High Availability Deployments
* Advanced caching strategies (Redis, Vector Stores)
