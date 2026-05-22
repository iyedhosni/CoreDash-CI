# ⚙️ CoreDash CI: Enterprise DevOps & CI/CD Command Center

## 📖 Overview
In modern software engineering, development and operations teams often suffer from "tool fatigue"—navigating between siloed platforms to monitor builds, check code quality, and manage cluster deployments. 

**CoreDash CI** is a centralized web platform engineered to solve this fragmentation by automating, supervising, and managing DevOps operations from a single unified command center. It acts as a middleware bridge, seamlessly pulling real-time data and triggering pipelines across industry-standard tools including Jenkins, SonarQube, Nexus, GitHub, Grafana, and Kubernetes.

## 🚀 Project History & Enterprise Adoption
CoreDash CI originated as a highly ambitious *Projet de Fin d'Études (PFE)*. The objective was to build a comprehensive, multi-role DevOps portal from scratch in just four months.

Following the successful deployment of this initial architecture, our engineering team was officially hired by **3S (Standard Sharing Software)** to complete the project and integrate it directly into their corporate infrastructure. 

> **⚠️ Repository Context:** > The codebase hosted in this public repository represents the **V1 MVP (Minimum Viable Product)** of CoreDash CI. The finalized, enterprise-scale iteration is proprietary and currently live in production at 3S.

## 🏗️ System Architecture & Tech Stack
The platform is built on a highly modular and secure architecture designed for scalability.

**1. Application Layer**
* **Frontend:** A modern, responsive, and unified interface developed with HTML, CSS, and JavaScript.
* **Backend:** A secure core API and routing middleware engineered in Node.js.
* **Database:** Relational data management using SQL (Initial schema provided in `3s (5).sql`).

**2. Infrastructure & Orchestration Scope**
* The full deployment environment spans across **three Ubuntu Virtual Machines**.
* **Containerization & Orchestration:** Docker and Kubernetes manage the distributed environments.
* **CI/CD & Code Quality:** Automated pipelines orchestrated via Jenkins, with real-time code analysis from SonarQube.
* **Observability:** System and application metrics are tracked using Prometheus and visualized through Grafana.

## ✨ Core Features (MVP)
* **Omni-View Dashboarding:** Aggregates scattered metrics, build statuses, and deployment pipelines into one accessible interface.
* **Advanced RBAC (Role-Based Access Control):** Granular permission handling that dynamically personalizes the interface based on user profiles: *Administrator, DevOps, Developer,* and *Supervisor*.
* **Real-Time Supervision:** Equipped with an advanced notification system providing immediate operational feedback and alert routing.

## 📚 Comprehensive Documentation (Architecture Report)
This repository contains the foundational source code for the platform. However, the complete physical and logical architectural diagrams, infrastructure rollout steps, and first-principles design decisions are deeply documented in the accompanying project thesis.

📄 **For a complete deep-dive, please refer to the attached document:** [`CoreDash_CI_Architecture_Report.pdf`](./CoreDash_CI_Architecture_Report.pdf) .

This document serves as a complete entry guide into the DevOps universe, detailing the setup of the distributed infrastructure, security protocols, and CI/CD implementation.

## 📂 Repository Structure
```text
📦 CoreDash-CI
 ┣ 📂 Backend-api/       # Node.js source code for the modular backend API
 ┣ 📂 public/            # Frontend client assets (HTML, CSS, JS)
 ┣ 📜 3s (5).sql         # Database schema export and initial configuration
 ┣ 📜 .gitattributes     # Git repository configuration
 ┗ 📜 README.md          # Project documentation
