# Source Map (Consolidation Index)

This file is a **map**, not a rewrite: it tells you where the source docs live and how to navigate them.

## Inventory summary

Total markdown scanned: **642**

By category:
- **Archive**: 325
- **Audit**: 121
- **Doc**: 117
- **Blog**: 63
- **Spec**: 9
- **Memory**: 4
- **ADR**: 3

## Canonical file set

- [docs/consolidated/00_OVERVIEW.md](docs/consolidated/00_OVERVIEW.md)
- [docs/consolidated/01_TIMELINE.md](docs/consolidated/01_TIMELINE.md)
- [docs/consolidated/02_ARCHITECTURE_AND_DECISIONS.md](docs/consolidated/02_ARCHITECTURE_AND_DECISIONS.md)
- [docs/consolidated/03_BUILD_AND_OPERATIONS.md](docs/consolidated/03_BUILD_AND_OPERATIONS.md)
- [docs/consolidated/04_FEATURES_AND_WORKFLOWS.md](docs/consolidated/04_FEATURES_AND_WORKFLOWS.md)
- [docs/consolidated/05_KIRO_PROCESS.md](docs/consolidated/05_KIRO_PROCESS.md)
- [docs/consolidated/06_GAPS_AND_NEXT.md](docs/consolidated/06_GAPS_AND_NEXT.md)

## Primary sources used per canonical doc

### 00_OVERVIEW.md
- [memory-bank/active-state.md](memory-bank/active-state.md) — **Last Updated:** 2026-01-29 **Last Session By:** Kiro AI (Session 39 - Dev/Prod Separation + Health Fixes)
- [memory-bank/system_patterns.md](memory-bank/system_patterns.md) — **Last Updated:** 2026-01-29
- [spec/design.md](spec/design.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Status**: Production-Ready Documentation
- [spec/INSTALL.md](spec/INSTALL.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Platforms**: Windows 10/11, Linux, macOS (Docker)
- [docs/architecture/overview.md](docs/architecture/overview.md) — The CAPS POS system is an offline-first, desktop application designed for automotive retail stores selling caps, parts, paint, and equipmen…
- [audit/AUDIT_EXECUTION_PLAN.md](audit/AUDIT_EXECUTION_PLAN.md) — This audit covers both:
- [audit/truth_sync_2026-01-25/PATCH_PLAN.md](audit/truth_sync_2026-01-25/PATCH_PLAN.md) — This plan lists the **insert-only patches** to apply to canonical targets. It is the execution map for reconciling memory + steering + prod…
- [audit/frontend_wiring_2026-01-25/PATCH_PLAN.md](audit/frontend_wiring_2026-01-25/PATCH_PLAN.md) — **Generated**: 2026-01-25 **Approach**: Insert-only changes to wire unwired features and resolve drift
### 02_ARCHITECTURE_AND_DECISIONS.md
- [spec/design.md](spec/design.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Status**: Production-Ready Documentation
- [spec/req.md](spec/req.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Status**: Production-Ready Documentation
- [memory-bank/project_brief.md](memory-bank/project_brief.md) — > Build a production-ready white-label point-of-sale system that operates offline-first, synchronizes across multiple locations, and can be…
- [docs/architecture/overview.md](docs/architecture/overview.md) — The CAPS POS system is an offline-first, desktop application designed for automotive retail stores selling caps, parts, paint, and equipmen…
- [memory-bank/adr/002-pos-system-project-choice.md](memory-bank/adr/002-pos-system-project-choice.md) — **Status:** Accepted **Date:** 2026-01-08 **Deciders:** User + Kiro AI
- [memory-bank/adr/001-memory-bank-system.md](memory-bank/adr/001-memory-bank-system.md) — **Status:** Accepted **Date:** 2026-01-08 **Deciders:** User + Kiro AI
### 03_BUILD_AND_OPERATIONS.md
- [spec/INSTALL.md](spec/INSTALL.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Platforms**: Windows 10/11, Linux, macOS (Docker)
- [spec/AUTOMATION_SCRIPTS.md](spec/AUTOMATION_SCRIPTS.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Platform**: Windows (batch files)
- [memory-bank/system_patterns.md](memory-bank/system_patterns.md) — **Last Updated:** 2026-01-29
### 04_FEATURES_AND_WORKFLOWS.md
- [spec/req.md](spec/req.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Status**: Production-Ready Documentation
- [docs/user-guides/quick-start.md](docs/user-guides/quick-start.md) — This guide will help you get started with the CAPS Point of Sale system. Whether you're a cashier, inventory clerk, or manager, this guide …
- [docs/api/README.md](docs/api/README.md) — The CAPS POS API is a RESTful API built with Rust and Actix-web. It provides endpoints for all POS operations including authentication, sal…
- [audit/API_WIRING_MATRIX.md](audit/API_WIRING_MATRIX.md) — **Generated**: 2026-01-25 **Scope**: Complete backend route inventory vs. frontend API call inventory **Evidence-Based**: All claims includ…
- [audit/e2e/spec.md](audit/e2e/spec.md) — **Generated**: 2026-01-26 **Purpose**: Implementation specification for missing E2E wiring to make backend features reachable from frontend…
### 05_KIRO_PROCESS.md
- [memory-bank/MEMORY_SYSTEM.md](memory-bank/MEMORY_SYSTEM.md) — --- inclusion: always ---
- [memory-bank/system_patterns.md](memory-bank/system_patterns.md) — **Last Updated:** 2026-01-29
- [spec/plan.md](spec/plan.md) — **Version**: 1.0 **Last Updated**: 2026-01-29 **Status**: Production-Ready Documentation
- [audit/truth_sync_2026-01-25/PATCH_PLAN.md](audit/truth_sync_2026-01-25/PATCH_PLAN.md) — This plan lists the **insert-only patches** to apply to canonical targets. It is the execution map for reconciling memory + steering + prod…
### 06_GAPS_AND_NEXT.md
- [docs/README.md](docs/README.md) — This directory contains all project documentation for the CAPS POS system.

---

## Full inventory (TSV)

Copy/paste this into a spreadsheet if you want sorting/filtering:

```tsv
type	date	path	title
ADR	2026-01-08	memory-bank/adr/000-template.md	ADR-000: Template for Architecture Decision Records
ADR	2026-01-08	memory-bank/adr/001-memory-bank-system.md	ADR-001: Implement Memory Bank System for AI Context Management
ADR	2026-01-08	memory-bank/adr/002-pos-system-project-choice.md	ADR-002: Build POS System for Automotive Retail
Archive	2026-01-08	archive/phases/SETUP_COMPLETE.md	🎉 Memory Bank & Blog System Setup Complete!
Archive	2026-01-08	archive/status-reports/DEVLOG.md	Development Log - EasySale System
Archive	2026-01-09	archive/deprecated/QUICK_FIX_SUMMARY.md	Quick Fix Summary - Login and Port Issues
Archive	2026-01-09	archive/deprecated/README.old.md	CAPS POS System (Deprecated README)
Archive	2026-01-09	archive/phases/FOUNDATION_COMPLETE.md	🎉 Foundation Infrastructure Complete
Archive	2026-01-09	archive/phases/SETTINGS_FOUNDATION_SUMMARY.md	Settings Consolidation - Foundation Complete
Archive	2026-01-09	archive/phases/SETTINGS_TASKS_3_4_SUMMARY.md	Settings Consolidation - Tasks 3 & 4 Complete
Archive	2026-01-09	archive/status-reports/SALES_CUSTOMER_MGMT_SUMMARY.md	Sales & Customer Management - Implementation Summary
Archive	2026-01-09	archive/tasks/TASK_10_SUMMARY.md	Task 10 Implementation Summary: CI/CD Pipeline
Archive	2026-01-09	archive/tasks/TASK_12_14_SUMMARY.md	Task 12 & 14 Completion Summary
Archive	2026-01-09	archive/tasks/TASK_12_SUMMARY.md	Task 12 Summary: Sales & Customer Management - Route Registration & Build Verification
Archive	2026-01-09	archive/tasks/TASK_8_9_SUMMARY.md	Tasks 8-9 Summary: Permission Enforcement & Store/Station Requirements
Archive	2026-01-09	archive/tasks/TASK_8_SUMMARY.md	Task 8 Summary: Permission Enforcement Middleware
Archive	2026-01-09	archive/tasks/TASK_9_SUMMARY.md	Task 9 Implementation Summary: Docker Development Environment
Archive	2026-01-09	archive/tasks/TASK_COMPLETION_SUMMARY.md	Task Completion Summary
Archive	2026-01-10	archive/README.md	Archive Directory
Archive	2026-01-10	archive/audits/AUDIT_SUMMARY.md	Codebase Audit - Executive Summary
Archive	2026-01-10	archive/audits/CODEBASE_AUDIT_REPORT.md	Codebase Audit Report - Unified Design System
Archive	2026-01-10	archive/status-reports/BAT_FILES_FIXED.md	Windows .bat Files - Fixed and Improved ✅
Archive	2026-01-10	archive/status-reports/BUILD_ISSUES_RESOLVED.md	Build Issues Resolved ✅
Archive	2026-01-10	archive/status-reports/CLEANUP_COMPLETED.md	Component Cleanup - Completed ✅
Archive	2026-01-10	archive/status-reports/CLEANUP_EXECUTION_PLAN.md	Component Cleanup - Execution Plan
Archive	2026-01-10	archive/status-reports/CLEANUP_REPORT.md	Codebase Cleanup Report
Archive	2026-01-10	archive/status-reports/DOCKER_FIX_SUMMARY.md	Docker Production Hardening Summary
Archive	2026-01-11	archive/status-reports/DEPLOYMENT_CAPS.md	Deploying EasySale for CAPS Automotive
Archive	2026-01-11	archive/status-reports/HARDCODED_VALUES_CLEANUP.md	Hardcoded Business Values Cleanup
Archive	2026-01-11	archive/status-reports/MULTI_TENANT_FINAL_STATUS.md	Multi-Tenant Platform: Final Status Report
Archive	2026-01-11	archive/status-reports/PHASE_4_5_STATUS.md	Multi-Tenant Data Migration: Phase 4 & 5 Status Report
Archive	2026-01-11	archive/status-reports/REMAINING_TASKS_SUMMARY.md	Remaining Tasks Summary - All Specs
Archive	2026-01-11	archive/status-reports/WHITE_LABEL_COMPLIANCE.md	White-Label Compliance Report
Archive	2026-01-12	archive/status-reports/API_INTEGRATION_STATUS.md	Settings API Integration - In Progress
Archive	2026-01-12	archive/status-reports/COMPILATION_FIXES_STATUS.md	Compilation Fixes Status
Archive	2026-01-12	archive/status-reports/COMPILATION_STATUS.md	Backend Compilation Status - January 12, 2026
Archive	2026-01-12	archive/status-reports/EXECUTION_PLAN.md	Execution Plan - Remaining Work
Archive	2026-01-12	archive/status-reports/FRONTEND_API_INTEGRATION_COMPLETE.md	Frontend API Integration - Complete!
Archive	2026-01-12	archive/status-reports/IMPLEMENTATION_PROGRESS_SUMMARY.md	EasySale Implementation Progress Summary
Archive	2026-01-12	archive/status-reports/SESSION_COMPLETION_SUMMARY.md	Session Completion Summary
Archive	2026-01-12	archive/status-reports/SESSION_FINAL_SUMMARY.md	Session Final Summary - January 12, 2026
Archive	2026-01-12	archive/status-reports/SESSION_STATUS.md	Session Status - January 12, 2026
Archive	2026-01-12	archive/status-reports/SETTINGS_PAGES_COMPLETE.md	Settings Pages Implementation Complete
Archive	2026-01-12	archive/status-reports/TESTING_SESSION_COMPLETE.md	Testing Session Complete - Universal Product Catalog
Archive	2026-01-12	archive/status-reports/UNIVERSAL_PRODUCT_CATALOG_COMPLETE.md	Universal Product Catalog - Implementation Complete
Archive	2026-01-12	archive/status-reports/VENDOR_BILL_PHASE_5_COMPLETE.md	Vendor Bill Receiving - Phase 5 Complete! 🎉
Archive	2026-01-12	archive/status-reports/VENDOR_BILL_PHASE_6_COMPLETE.md	Vendor Bill Receiving - Phase 6 Complete! 🎉
Archive	2026-01-12	archive/status-reports/VENDOR_BILL_RECEIVING_COMPLETE.md	Vendor Bill Receiving System - COMPLETE! 🎉
Archive	2026-01-12	archive/status-reports/task-4.3-implementation-log.md	Task 4.3 Implementation Log: Update PerformancePage.tsx
Archive	2026-01-13	archive/status-reports/DOCKER_BUILD_FIXES.md	Docker Build Fixes - January 13, 2026
Archive	2026-01-13	archive/status-reports/DOCKER_DATABASE_PATH_FIX.md	Docker Database Path Fix
Archive	2026-01-13	archive/status-reports/FINAL_SESSION_SUMMARY.md	Final Session Summary - January 13, 2026
Archive	2026-01-13	archive/status-reports/IMPLEMENTATION_STATUS_FINAL.md	Universal Data Sync - Implementation Status Report
Archive	2026-01-13	archive/status-reports/MIGRATION_010_FIX.md	Migration 010 SQL Syntax Fix - January 13, 2026
Archive	2026-01-13	archive/status-reports/QUICKBOOKS_ENTITY_OPERATIONS_COMPLETE.md	QuickBooks Entity Operations Complete! 🎉
Archive	2026-01-13	archive/status-reports/READY_FOR_TESTING.md	Ready for Manual Testing! 🎉
Archive	2026-01-13	archive/status-reports/REMAINING_WORK_SUMMARY.md	Remaining Work Summary
Archive	2026-01-13	archive/status-reports/SESSION_31_COMPLETE_SUMMARY.md	Session 31: Universal Data Sync - Comprehensive Implementation Summary
Archive	2026-01-13	archive/status-reports/SESSION_31_FINAL_SUMMARY.md	Session 31: Universal Data Sync - Major Implementation Complete! 🎉
Archive	2026-01-13	archive/status-reports/SESSION_32_FINAL_STATUS.md	Session 32: Universal Data Sync - Field Mapping & Sync Orchestration
Archive	2026-01-13	archive/status-reports/SESSION_33_COMPLETE_SUMMARY.md	Session 33: Universal Data Sync - Task 8 & Epic 3 Complete! 🎉
Archive	2026-01-13	archive/status-reports/SESSION_34_COMPLETE.md	Session 34 Complete: Backend 100% + Frontend UI Components
Archive	2026-01-13	archive/status-reports/SESSION_FINAL_COMPLETE.md	Session Complete - System 100% Backend Ready! 🎉
Archive	2026-01-13	archive/status-reports/SESSION_PROGRESS_SUMMARY.md	Session Progress Summary
Archive	2026-01-13	archive/status-reports/SESSION_SUMMARY_TASK_22.1.md	Session Summary: Task 22.1 & Docker Path Fix
Archive	2026-01-13	archive/status-reports/SPEC_UPDATES_SUMMARY.md	Spec Updates Summary - Universal Data Sync
Archive	2026-01-13	archive/status-reports/TASK_22.1_COMPLETE.md	Task 22.1 Complete: Real Connectivity Checks
Archive	2026-01-13	archive/status-reports/TASK_2_3_IMPLEMENTATION_STATUS.md	Task 2 & 3 Implementation Status
Archive	2026-01-13	archive/status-reports/TASK_7.4_IMPLEMENTATION_COMPLETE.md	Task 7.4 Implementation Complete - QuickBooks Transformer
Archive	2026-01-13	archive/status-reports/TASK_8_FIELD_MAPPING_COMPLETE.md	Task 8: Field Mapping Engine - COMPLETE ✅
Archive	2026-01-13	archive/status-reports/TASK_9.4_COMPLETE.md	Task 9.4 Complete: Sync Orchestrator Implementation
Archive	2026-01-13	archive/status-reports/UNIVERSAL_DATA_SYNC_PROGRESS_SUMMARY.md	Universal Data Sync - Implementation Progress Summary
Archive	2026-01-13	archive/status-reports/UNIVERSAL_DATA_SYNC_WEBHOOKS_COMPLETE.md	Universal Data Sync - QuickBooks Webhooks Complete! 🎉
Archive	2026-01-14	archive/status-reports/BUILD_VERIFICATION.md	Build Verification - January 14, 2026
Archive	2026-01-14	archive/status-reports/COMMIT_READY.md	Ready to Commit: Phase 1 Complete
Archive	2026-01-14	archive/status-reports/DOCKER_NAMING_FIXES.md	Docker Naming Standardization - Complete ✅
Archive	2026-01-14	archive/status-reports/DOCUMENTATION_SYNC_PLAN.md	Documentation Sync Plan
Archive	2026-01-14	archive/status-reports/EPIC_1_3_PROGRESS.md	Epic 1 & Epic 3 Progress Update
Archive	2026-01-14	archive/status-reports/EPIC_5_COMPLETE.md	Epic 5: Logging & Monitoring - COMPLETE
Archive	2026-01-14	archive/status-reports/EPIC_6_COMPLETE.md	Epic 6: User Interface & Configuration - COMPLETE ✅
Archive	2026-01-14	archive/status-reports/EPIC_8_PROGRESS_UPDATE.md	Epic 8 Progress Update: Technical Debt Cleanup
Archive	2026-01-14	archive/status-reports/EPIC_8_TASKS_COMPLETE.md	Epic 8: Technical Debt Cleanup - COMPLETE
Archive	2026-01-14	archive/status-reports/IMPLEMENTATION_STATUS.md	Implementation Status - Universal Data Sync
Archive	2026-01-14	archive/status-reports/NAMING_STANDARDIZATION_COMPLETE.md	Docker Naming Standardization - Complete
Archive	2026-01-14	archive/status-reports/PHASE_1_COMPLETE.md	Phase 1 Complete: Database Technology Correction
Archive	2026-01-14	archive/status-reports/PHASE_1_DATABASE_CORRECTION.md	Phase 1: Database Technology Correction
Archive	2026-01-14	archive/status-reports/PHASE_1_FINAL_SUMMARY.md	Phase 1: Final Summary - Documentation Sync Implementation
Archive	2026-01-14	archive/status-reports/PORT_FIX_COMPLETE.md	Port Configuration Fixed
Archive	2026-01-14	archive/status-reports/SESSION_SUMMARY_2026-01-14.md	Session Summary: January 14, 2026
Archive	2026-01-14	archive/status-reports/SESSION_SUMMARY_EPIC_6_COMPLETE.md	Session Summary - Epic 6 Complete
Archive	2026-01-14	archive/status-reports/STANDARDIZATION_STATUS.md	EasySale Naming Standardization Status
Archive	2026-01-14	archive/status-reports/TASK_19.2_COMPLETE.md	Task 19.2 Complete: Configurable OAuth Redirect URIs
Archive	2026-01-14	archive/status-reports/TRACEABILITY_INDEX_UPDATED.md	Traceability Index - Updated January 14, 2026
Archive	2026-01-14	archive/status-reports/UNIVERSAL_DATA_SYNC_FINAL_STATUS.md	Universal Data Sync System - Final Status Report
Archive	2026-01-14	archive/status-reports/VIN_DECODER_REMOVED.md	VIN Decoder Removed
Archive	2026-01-15	archive/status-reports/CURRENT_STATE.md	Current State - EasySale System
Archive	2026-01-15	archive/status-reports/MEMORY_UPDATED.md	Memory Bank Updated - January 15, 2026
Archive	2026-01-15	archive/status-reports/README_SESSION_HANDOFF.md	Session Handoff - January 15, 2026
Archive	2026-01-15	archive/status-reports/SESSION_COMPLETE_2026-01-15.md	Session Complete - January 15, 2026
Archive	2026-01-15	archive/status-reports/SESSION_SUMMARY_2026-01-15.md	Session Summary - January 15, 2026
Archive	2026-01-15	archive/status-reports/SYNC_FLOWS_IMPLEMENTATION_COMPLETE.md	Sync Flows Implementation - COMPLETED
Archive	2026-01-15	archive/status-reports/TASKS_1_5_COMPLETE.md	Tasks 1-5 Implementation Complete
Archive	2026-01-16	archive/status-reports/DOCKER_BUILD_FIXED.md	Docker Build Fixed - Complete Guide
Archive	2026-01-16	archive/status-reports/DOCKER_CACHE_ISSUE_RESOLVED.md	Docker Cache Issue - RESOLVED
Archive	2026-01-16	archive/status-reports/LOGIN_SYSTEM_READY.md	Login System Ready for Testing
Archive	2026-01-16	archive/status-reports/QUICK_FIX_SUMMARY.md	Quick Fix Summary - Login & Docker Issues
Archive	2026-01-16	archive/status-reports/THEMEABLE_LOGIN_COMPLETE.md	Themeable Login System - Implementation Complete
Archive	2026-01-16	archive/status-reports/THEMEABLE_LOGIN_FINAL_STATUS.md	Themeable Login System - Final Status
Archive	2026-01-16	archive/status-reports/THEMEABLE_LOGIN_FIXES.md	Themeable Login System - Runtime Fixes
Archive	2026-01-16	archive/status-reports/THEMEABLE_LOGIN_RUNTIME_FIX.md	Themeable Login System - Runtime Fix (Final)
Archive	2026-01-16	archive/status-reports/TYPESCRIPT_COMPILATION_FIXES.md	TypeScript Compilation Fixes - Complete
Archive	2026-01-17	archive/status-reports/ACTUAL_IMPLEMENTATION_STATUS.md	Actual Implementation Status
Archive	2026-01-17	archive/status-reports/ALL_FIXES_PERMANENT.md	All Fixes Are Permanent - Final Verification
Archive	2026-01-17	archive/status-reports/BAT_FILES_CLEANUP.md	BAT Files Cleanup & Consolidation
Archive	2026-01-17	archive/status-reports/CLEAN_BUILD_TEST.md	Clean Build Test - Verification
Archive	2026-01-17	archive/status-reports/DEVELOPMENT_ROADMAP.md	EasySale Development Roadmap
Archive	2026-01-17	archive/status-reports/ENV_CONSOLIDATION.md	Environment Configuration Consolidation
Archive	2026-01-17	archive/status-reports/EPIC_3_COMPLETE.md	Epic 3: Sync Engine & Orchestration - COMPLETE ✅
Archive	2026-01-17	archive/status-reports/EPIC_3_PROGRESS.md	Epic 3: Sync Engine & Orchestration - Progress Report
Archive	2026-01-17	archive/status-reports/EPIC_3_TASK_10_COMPLETE.md	Epic 3 - Task 10: Sync Scheduling & Triggers - COMPLETE
Archive	2026-01-17	archive/status-reports/EPIC_4_COMPLETE.md	Epic 4: Safety & Prevention Controls - COMPLETE ✅
Archive	2026-01-17	archive/status-reports/EPIC_7_COMPLETE.md	Epic 7 Complete: Testing & Documentation
Archive	2026-01-17	archive/status-reports/EPIC_7_IMPLEMENTATION_PLAN.md	Epic 7 Implementation Plan: Testing & Documentation
Archive	2026-01-17	archive/status-reports/EPIC_8_COMPLETE.md	Epic 8: Cross-Cutting Concerns - COMPLETE
Archive	2026-01-17	archive/status-reports/FINAL_FIX_COMPLETE.md	Final Fix Complete - Login System Ready
Archive	2026-01-17	archive/status-reports/FRESH_INSTALL_READY.md	EasySale - Fresh Install Ready! 🎉
Archive	2026-01-17	archive/status-reports/HEALTHCHECK_FIX.md	Docker Healthcheck Fix - RESOLVED
Archive	2026-01-17	archive/status-reports/LOGIN_AUTHENTICATION_FIXED.md	Login Authentication Fixed - CORS Update
Archive	2026-01-17	archive/status-reports/PHASE_1_2_COMPLETE_SUMMARY.md	Phase 1 & 2 Implementation Status - COMPLETE ✅
Archive	2026-01-17	archive/status-reports/REMAINING_TASKS_ANALYSIS.md	Remaining Tasks Analysis - Universal Data Sync
Archive	2026-01-17	archive/status-reports/SESSION_SUMMARY_2026-01-17.md	Session Summary - January 17, 2026
Archive	2026-01-17	archive/status-reports/SESSION_SUMMARY_2026-01-17_CONTINUED.md	Session Summary: Memory Update & Task Continuation
Archive	2026-01-17	archive/status-reports/SESSION_SUMMARY_2026-01-17_EPIC_7_COMPLETE.md	Session Summary: Epic 7 Complete
Archive	2026-01-17	archive/status-reports/SESSION_SUMMARY_2026-01-17_EPIC_7_READY.md	Session Summary: Task 14.3 Complete & Epic 7 Ready
Archive	2026-01-17	archive/status-reports/SESSION_SUMMARY_2026-01-17_FINAL.md	Session Summary - January 17, 2026 (Final)
Archive	2026-01-17	archive/status-reports/SESSION_SUMMARY_2026-01-17_TASK_COMPLETION.md	Session Summary: Task Completion Progress
Archive	2026-01-17	archive/status-reports/TASK_14.3_COMPLETE.md	Task 14.3 Complete: Error Notification System
Archive	2026-01-17	archive/status-reports/UNIMPLEMENTED_FEATURES.md	Unimplemented Features Audit
Archive	2026-01-17	archive/status-reports/UNIVERSAL_SETUP_FIXED.md	Universal Setup Fixed - Fresh Install Ready
Archive	2026-01-18	archive/status-reports/ALL_FEATURES_COMPLETE_VERIFIED.md	✅ ALL FEATURES COMPLETE - VERIFIED
Archive	2026-01-18	archive/status-reports/ALL_TASKS_COMPLETE.md	🎉 All Tasks Complete - EasySale System
Archive	2026-01-18	archive/status-reports/ALL_TASKS_COMPLETE_FINAL.md	🎉 ALL TASKS COMPLETE! 🎉
Archive	2026-01-18	archive/status-reports/BUILD_READY.md	EasySale - Ready for Production Build
Archive	2026-01-18	archive/status-reports/BUILD_SCRIPTS_FINAL.md	Build Scripts - Final Configuration
Archive	2026-01-18	archive/status-reports/BUILD_SYSTEM_FIXED.md	Build System Fixed - Complete Summary
Archive	2026-01-18	archive/status-reports/CLEANUP_AUDIT_2026-01-18.md	Workspace Cleanup Audit - January 18, 2026
Archive	2026-01-18	archive/status-reports/CODE_QUALITY_CLEANUP_COMPLETE.md	Code Quality Cleanup Complete (Task 23)
Archive	2026-01-18	archive/status-reports/CODE_QUALITY_COMPLETE.md	Code Quality Cleanup Complete - January 18, 2026
Archive	2026-01-18	archive/status-reports/COMPILATION_FIXES_FINAL.md	Compilation Fixes - Final Round
Archive	2026-01-18	archive/status-reports/COMPLETION_SUMMARY_2026-01-18.md	EasySale Completion Summary - January 18, 2026
Archive	2026-01-18	archive/status-reports/DOCKER_BUILD_COMPLETE_IMPLEMENTATION.md	Docker Build Warnings - Complete Implementation
Archive	2026-01-18	archive/status-reports/DOCKER_BUILD_FINAL_STATUS.md	Docker Build Final Status - January 18, 2026
Archive	2026-01-18	archive/status-reports/DOCKER_BUILD_FIXES_COMPLETE.md	Docker Build Fixes Complete
Archive	2026-01-18	archive/status-reports/DOCKER_BUILD_WARNINGS_ANALYSIS.md	Docker Build Warnings Analysis & Implementation Plan
Archive	2026-01-18	archive/status-reports/EXECUTION_COMPLETE_2026-01-18.md	Execution Complete - January 18, 2026
Archive	2026-01-18	archive/status-reports/FINAL_BUILD_INSTRUCTIONS.md	Final Build Instructions - EasySale
Archive	2026-01-18	archive/status-reports/FINAL_SESSION_SUMMARY_2026-01-18.md	Final Session Summary - January 18, 2026
Archive	2026-01-18	archive/status-reports/FRONTEND_BUILD_ERRORS_SUMMARY.md	Frontend Build Errors Summary
Archive	2026-01-18	archive/status-reports/FRONTEND_TASKS_ALREADY_COMPLETE.md	Frontend Tasks Already Complete!
Archive	2026-01-18	archive/status-reports/IMPLEMENTATION_COMPLETE.md	Implementation Complete - All Priorities Executed
Archive	2026-01-18	archive/status-reports/IMPLEMENTATION_COMPLETE_NOT_EASY_ROUTE.md	Implementation Complete: The Right Way, Not The Easy Way
Archive	2026-01-18	archive/status-reports/MISSION_ACCOMPLISHED.md	🎉 MISSION ACCOMPLISHED! 🎉
Archive	2026-01-18	archive/status-reports/MISSION_COMPLETE.md	🎉 MISSION COMPLETE!
Archive	2026-01-18	archive/status-reports/NEXT_STEPS_PLAN.md	Next Steps Plan - January 18, 2026
Archive	2026-01-18	archive/status-reports/OCR_ENHANCEMENT_PLAN_SUMMARY.md	Invoice OCR Enhancement Plan - Summary
Archive	2026-01-18	archive/status-reports/OCR_ENHANCEMENT_STATUS.md	OCR Enhancement - Implementation Status
Archive	2026-01-18	archive/status-reports/PRIORITY_1_COMPLETE.md	Priority 1 Complete: Sync Operations API
Archive	2026-01-18	archive/status-reports/PRIORITY_2_COMPLETE.md	Priority 2 Complete: Safety Controls
Archive	2026-01-18	archive/status-reports/PRIORITY_2_PROGRESS.md	Priority 2 Progress: Safety Controls
Archive	2026-01-18	archive/status-reports/PRIORITY_3_COMPLETE.md	Priority 3 Complete: Logging & Monitoring (Task 14)
Archive	2026-01-18	archive/status-reports/QUICKBOOKS_COMPLIANCE_VERIFIED.md	QuickBooks API Compliance Verification
Archive	2026-01-18	archive/status-reports/QUICK_STATUS.md	EasySale - Quick Status Reference
Archive	2026-01-18	archive/status-reports/READY_FOR_DOCKER_BUILD.md	Ready for Docker Build - Final Status
Archive	2026-01-18	archive/status-reports/REMAINING_EPICS_AND_TASKS.md	🎉 ALL TASKS COMPLETE! 🎉
Archive	2026-01-18	archive/status-reports/REMAINING_WARNINGS_IMPLEMENTATION_PLAN.md	Remaining Warnings Implementation Plan
Archive	2026-01-18	archive/status-reports/REMAINING_WORK.md	Remaining Work - EasySale System
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18.md	Session Summary - January 18, 2026
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_BUILD_COMPLETE.md	Session Summary - January 18, 2026: Docker Build Complete
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_BUILD_SYSTEM_COMPLETE.md	Session Summary - Build System Complete
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_COMPLETE.md	Session Summary: Complete Docker Build Warnings Implementation
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_COMPLETE_STATUS.md	Session Summary - January 18, 2026: Complete Project Status
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_FINAL.md	Final Session Summary: All Backend Tasks Complete
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_FINAL_COMPLETE.md	Session Summary - January 18, 2026: All Warnings Fixed
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_FINAL_STATUS.md	Session Summary - January 18, 2026: Final Status Report
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_IMPLEMENTATIONS_COMPLETE.md	Session Summary - January 18, 2026: All Incomplete Features Implemented
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_INTEGRATION_TESTS_COMPLETE.md	Session Summary - January 18, 2026: Integration Tests Complete
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_MULTI_PASS_OCR_IMPLEMENTED.md	Session Summary - January 18, 2026: Multi-Pass OCR Implemented
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_OCR_ENHANCEMENT_PLAN.md	Session Summary - January 18, 2026: OCR Enhancement Plan Created
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_PRIORITY_3.md	Session Summary: Priority 3 Complete
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_TASK_AUDIT.md	Session Summary - January 18, 2026: Task Status Audit
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_TENANT_SECURITY_FIXED.md	Session Summary - January 18, 2026: Tenant Security Fixed
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_TYPESCRIPT_FIXED.md	Session Summary - TypeScript Errors Fixed
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_VERIFICATION_COMPLETE.md	Session Summary - January 18, 2026: Verification Complete
Archive	2026-01-18	archive/status-reports/SESSION_SUMMARY_2026-01-18_WARNINGS_FIXED.md	Session Summary - January 18, 2026: Docker Build Warnings Analysis
Archive	2026-01-18	archive/status-reports/SETTINGS_ALL_TASKS_COMPLETE.md	Settings Consolidation - ALL TASKS COMPLETE ✅
Archive	2026-01-18	archive/status-reports/SETTINGS_CONSOLIDATION_COMPLETE.md	Settings Consolidation - Implementation Complete
Archive	2026-01-18	archive/status-reports/SETTINGS_CONSOLIDATION_PROGRESS.md	Settings Consolidation Progress
Archive	2026-01-18	archive/status-reports/SETTINGS_CONSOLIDATION_SESSION_COMPLETE.md	Settings Consolidation - Session Complete
Archive	2026-01-18	archive/status-reports/SETTINGS_PHASE_3_COMPLETE.md	Settings Consolidation - Phase 3 Progress Summary
Archive	2026-01-18	archive/status-reports/SETTINGS_PHASE_3_FINAL_STATUS.md	Settings Consolidation - Phase 3 Final Status
Archive	2026-01-18	archive/status-reports/SETTINGS_PHASE_3_PROGRESS.md	Settings Consolidation - Phase 3 Progress Update
Archive	2026-01-18	archive/status-reports/SETTINGS_TRULY_COMPLETE.md	Settings Consolidation - TRULY 100% COMPLETE ✅
Archive	2026-01-18	archive/status-reports/SYNC_TASKS_AUDIT_2026-01-18.md	Universal Data Sync - Task Status Audit
Archive	2026-01-18	archive/status-reports/TYPESCRIPT_ERRORS_FIXED.md	TypeScript Errors Fixed - Complete
Archive	2026-01-18	archive/status-reports/UNIVERSAL_DATA_SYNC_COMPLETE.md	Universal Data Sync - PRODUCTION READY 🎉
Archive	2026-01-19	archive/status-reports/ADVANCED_SYNC_FEATURES_COMPLETE.md	Advanced Sync Features - COMPLETE
Archive	2026-01-19	archive/status-reports/BATCH_PROCESSING_COMPLETE.md	Batch Processing Implementation - COMPLETE
Archive	2026-01-19	archive/status-reports/DEAD_CODE_ACTUAL_ASSESSMENT.md	Dead Code - Actual Assessment
Archive	2026-01-19	archive/status-reports/DEAD_CODE_CLEANUP_COMPLETE.md	Dead Code Cleanup & WooCommerce Sync Wiring - COMPLETE
Archive	2026-01-19	archive/status-reports/DEAD_CODE_CLEANUP_PLAN.md	Dead Code Cleanup Plan
Archive	2026-01-19	archive/status-reports/WOOCOMMERCE_FLOWS_COMPLETE.md	WooCommerce Sync Flows - FULLY WIRED AND OPERATIONAL
Archive	2026-01-20	archive/status-reports/DOCKER_BUILD_FIX_COMPLETE.md	Docker Build Fix - Complete
Archive	2026-01-20	archive/status-reports/DOCKER_BUILD_VERIFICATION.md	Docker Build Verification - January 20, 2026
Archive	2026-01-20	archive/status-reports/FINAL_IMPLEMENTATION_STATUS.md	Final Implementation Status - January 20, 2026
Archive	2026-01-20	archive/status-reports/FINAL_IMPLEMENTATION_SUMMARY.md	Final Implementation Summary - Real Features Delivered
Archive	2026-01-20	archive/status-reports/IMPLEMENTATION_PROGRESS.md	Implementation Progress - Real Functionality Added
Archive	2026-01-20	archive/status-reports/IMPLEMENTATION_STATUS_2026-01-20.md	Implementation Status - January 20, 2026
Archive	2026-01-20	archive/status-reports/OPTION_C_PROGRESS_REPORT.md	Option C Progress Report - Zero Warnings Mission
Archive	2026-01-20	archive/status-reports/PHASE_1_2_COMPLETE.md	Phase 1 & 2 Complete - Vendor & Variant Management
Archive	2026-01-20	archive/status-reports/UNUSED_CODE_ANALYSIS.md	Unused Code Analysis & Implementation Plan
Archive	2026-01-20	archive/status-reports/ZERO_WARNINGS_PROGRESS.md	Zero Warnings Progress Report
Archive	2026-01-24	archive/status-reports/BACKEND_FIXES_APPLIED.md	Backend Fixes Applied - January 24, 2026
Archive	2026-01-24	archive/status-reports/CLEANUP_COMPLETE.md	Frontend Cleanup Complete - January 24, 2026
Archive	2026-01-24	archive/status-reports/COMPLETE_FIX_SUMMARY.md	Complete Fix Summary - January 24, 2026
Archive	2026-01-24	archive/status-reports/FIXES_APPLIED_2026-01-24.md	Fixes Applied - January 24, 2026
Archive	2026-01-24	archive/status-reports/FRONTEND_CLEANUP_NEEDED.md	Frontend Cleanup & Implementation Tasks
Archive	2026-01-24	archive/status-reports/THEME_FIXED_MOCK_DATA_LOCATIONS.md	Status Update - January 24, 2026
Archive	2026-01-25	archive/status-reports/BUILD_VERIFICATION_RESULTS.md	Build Verification Results
Archive	2026-01-25	archive/status-reports/EPIC_4_COMPLETE_2026-01-25.md	Epic A: Validation Engine - Complete (2026-01-25)
Archive	2026-01-25	archive/status-reports/FINAL_SESSION_SUMMARY_2026-01-25.md	Final Session Summary - January 25, 2026
Archive	2026-01-25	archive/status-reports/FIXES_APPLIED_2026-01-25.md	Fixes Applied - 2026-01-25
Archive	2026-01-25	archive/status-reports/INVOICE_OCR_PROGRESS_2026-01-25.md	Invoice OCR Enhancement v3.0 - Progress Update (2026-01-25)
Archive	2026-01-25	archive/status-reports/INVOICE_OCR_V3_100_PERCENT_COMPLETE.md	Invoice OCR v3.0 - 100% COMPLETE ✅
Archive	2026-01-25	archive/status-reports/INVOICE_OCR_V3_COMPLETE_2026-01-25.md	Invoice OCR v3.0 - Implementation Complete
Archive	2026-01-25	archive/status-reports/INVOICE_OCR_V3_FINAL_STATUS.md	Invoice OCR v3.0 - Final Status Report
Archive	2026-01-25	archive/status-reports/INVOICE_OCR_V3_PROGRESS_2026-01-25.md	Invoice OCR v3.0 Implementation Progress
Archive	2026-01-25	archive/status-reports/INVOICE_OCR_V3_VERIFICATION_COMPLETE.md	Invoice OCR v3.0 - Verification Complete ✅
Archive	2026-01-25	archive/status-reports/SESSION_PROGRESS_2026-01-25.md	Session Progress Summary - January 25, 2026
Archive	2026-01-25	archive/status-reports/SPLIT_BUILD_100_PERCENT_COMPLETE.md	Split Build System - 100% Complete
Archive	2026-01-25	archive/status-reports/SPLIT_BUILD_COMPLETE.md	Split Build System - Complete ✅
Archive	2026-01-25	archive/status-reports/SPLIT_BUILD_FINAL_STATUS.md	Split Build System - Final Status Report
Archive	2026-01-25	archive/status-reports/SPLIT_BUILD_SESSION_COMPLETE.md	Split Build System - Session Complete
Archive	2026-01-25	archive/status-reports/SPLIT_BUILD_SESSION_SUMMARY.md	Split Build System - Session Summary
Archive		archive/ARCHIVE_POLICY.md	## Archive Policy (Code + Docs)
Archive		archive/audits/FINAL_PORT_CONFIGURATION.md	Final Port Configuration - Truly Unique Ports
Archive		archive/audits/PORT_CONFIGURATION_FIX.md	Port Configuration Fix
Archive		archive/audits/PORT_MIGRATION_PLAN.md	Port Migration Plan - Unique Ports
Archive		archive/code/README.md	Archived (quarantined) code
Archive		archive/deprecated/PORT_INCONSISTENCIES_FOUND.md	Port Configuration Inconsistencies - Audit Report
Archive		archive/deprecated/QUICK_START_CLEANUP.md	Quick Start - Component Cleanup
Archive		archive/deprecated/warehouse/src_warehouse/TASK_2.1_SUMMARY.md	Task 2.1: Update WarehousePage.tsx - Implementation Summary
Archive		archive/phases/FOUNDATION_REVIEW.md	Foundation Infrastructure Review
Archive		archive/phases/OPTIONAL_TASKS_SUMMARY.md	Optional Tasks Completion Summary
Archive		archive/phases/PORT_UPDATE_COMPLETE.md	✅ Port Update Complete - Truly Unique Ports
Archive		archive/phases/SETTINGS_PHASE_1_COMPLETE.md	Settings Consolidation - Phase 1 Complete
Archive		archive/phases/SETTINGS_PHASE_2_COMPLETE.md	Settings Consolidation Phase 2: Complete Summary
Archive		archive/phases/SETTINGS_PHASE_2_PROGRESS.md	Settings Consolidation Phase 2: Progress Summary
Archive		archive/phases/SETTINGS_TASKS_7_SUMMARY.md	Settings Consolidation - Task 7 Complete
Archive		archive/status-reports/BACKEND_COMPILATION_FIXED.md	Backend Compilation Fixed - Complete Status
Archive		archive/status-reports/BUILD_FIX_COMPLETE_STATUS.md	
Archive		archive/status-reports/BUILD_FIX_STATUS.md	Docker Build Fix Status
Archive		archive/status-reports/BUILD_INSTRUCTIONS.md	Build Instructions - EasySale
Archive		archive/status-reports/BUILD_ISSUE_RESOLVED.md	
Archive		archive/status-reports/BUILD_STATUS_CLARIFICATION.md	
Archive		archive/status-reports/BUILD_SYSTEM.md	EasySale Build System
Archive		archive/status-reports/CLEANUP_HACKATHON_REFERENCES.md	Cleanup Plan - Remove Hackathon References & Update Node
Archive		archive/status-reports/COMPILATION_FIXES_COMPLETE.md	
Archive		archive/status-reports/COMPILER_WARNINGS_ANALYSIS.md	Compiler Warnings Analysis
Archive		archive/status-reports/COMPONENT_STRUCTURE_DIAGRAM.md	Component Structure - Visual Diagram
Archive		archive/status-reports/COMPREHENSIVE_FIXES_NEEDED.md	Comprehensive Fixes Needed - Mock Data & Settings Issues
Archive		archive/status-reports/CRITICAL_FEATURES_COMPLETED.md	Critical Features Implementation Complete
Archive		archive/status-reports/DEVELOPMENT_OPTIONS.md	Development Options - Docker vs Native
Archive		archive/status-reports/DOCKER_ARCHITECTURE.md	EasySale Docker Architecture
Archive		archive/status-reports/DOCKER_FIXES_COMPLETE.md	
Archive		archive/status-reports/DOCKER_NAMING_STANDARD.md	EasySale Docker Naming Standard
Archive		archive/status-reports/DOCKER_NETWORK_FIX.md	Docker Network Configuration Fix
Archive		archive/status-reports/DOCKER_SETUP.md	Docker Development Environment
Archive		archive/status-reports/EPIC_D_COMPLETE_SUMMARY.md	Epic D: API Endpoints - COMPLETE ✅
Archive		archive/status-reports/EPIC_E_COMPLETE_SUMMARY.md	Epic E: Integration Services - COMPLETE ✅
Archive		archive/status-reports/FINAL_STATUS.md	Final Status - Mock Data Removal Project
Archive		archive/status-reports/FINAL_STATUS_ZERO_WARNINGS_ATTEMPT.md	Final Status - Zero Warnings Attempt
Archive		archive/status-reports/FRESH_INSTALL_GUIDE.md	Fresh Install Guide - EasySale
Archive		archive/status-reports/IMPLEMENTATION_COMPLETE_SUMMARY.md	Implementation Complete - Final Summary
Archive		archive/status-reports/IMPLEMENTATION_GUIDE.md	Implementation Guide: Completing Remaining Features
Archive		archive/status-reports/IMPORT_MIGRATION_GUIDE.md	Import Migration Guide
Archive		archive/status-reports/INCOMPLETE_FEATURES_PLAN.md	Incomplete Features Implementation Plan
Archive		archive/status-reports/INVOICE_OCR_EPIC_D_PROGRESS.md	Invoice OCR Enhancement v3.0 - Epic D Progress
Archive		archive/status-reports/INVOICE_OCR_V3_COMPLETE.md	Invoice OCR Enhancement v3.0 - Implementation Complete
Archive		archive/status-reports/LOGIN_FIX_SUMMARY.md	Login Fix Summary
Archive		archive/status-reports/MIGRATION_010_FIXED.md	
Archive		archive/status-reports/MIGRATION_FIXES_COMPLETE.md	Migration Fixes Complete - Status Report
Archive		archive/status-reports/OPTION_C_EXECUTION_PLAN.md	Option C: Future-Proof Implementation Plan
Archive		archive/status-reports/PAINT_VEHICLE_REMOVAL_COMPLETE.md	Paint & Vehicle References Removal - Complete
Archive		archive/status-reports/PROGRESS_UPDATE_2026-01-25.md	Invoice OCR Enhancement v3.0 - Progress Update
Archive		archive/status-reports/QUICK_BUILD_GUIDE.md	Quick Build Guide
Archive		archive/status-reports/QUICK_BUILD_GUIDE_UPDATED.md	Quick Build Guide - Updated System
Archive		archive/status-reports/QUICK_CLEANUP_GUIDE.md	Quick Cleanup Guide - Remove Mock Data
Archive		archive/status-reports/QUICK_REFERENCE.md	🚀 Quick Reference Card
Archive		archive/status-reports/QUICK_REFERENCE_SYNC.md	Quick Reference - Sync System
Archive		archive/status-reports/QUICK_START.md	Quick Start Guide
Archive		archive/status-reports/QUICK_WINS_GUIDE.md	Quick Wins Guide - EasySale Sync
Archive		archive/status-reports/REMAINING_BUILD_FIXES.md	Remaining Build Fixes
Archive		archive/status-reports/REMAINING_WARNINGS_BREAKDOWN.md	Remaining 166 Warnings - Complete Breakdown
Archive		archive/status-reports/REMOVE_ALL_MOCK_DATA.md	Remove All Mock Data - Action Plan
Archive		archive/status-reports/SCHEMA_FIXES_APPLIED.md	Schema Fixes Applied - Backend Compilation
Archive		archive/status-reports/SERVICES_WIRED_COMPLETE.md	Services Wired to Handlers - Complete
Archive		archive/status-reports/SESSION_28_EPIC_WIN.md	Session 28: Epic Win - From 147 Errors to Production Ready! 🎉🚀
Archive		archive/status-reports/SESSION_FINAL_COMPLETE_IMPLEMENTATION.md	
Archive		archive/status-reports/SESSION_PROGRESS_2026-01-25_CONTINUED.md	Invoice OCR Enhancement v3.0 - Continued Session Progress
Archive		archive/status-reports/SESSION_SUMMARY_2026-01-18_OCR_PHASE_1_2_COMPLETE.md	
Archive		archive/status-reports/SPLIT_BUILD_COMPLETE_SUMMARY.md	Split Build System - Complete Summary
Archive		archive/status-reports/SPLIT_BUILD_PROGRESS.md	Split Build System Implementation Progress
Archive		archive/status-reports/START_HERE_NOW.md	START HERE - Everything is Fixed!
Archive		archive/status-reports/TASK_12.1_OAUTH_IMPLEMENTATION_SUMMARY.md	Task 12.1: Google Drive OAuth Connection Flow - Implementation Summary
Archive		archive/status-reports/TENANT_TABLE_IMPLEMENTATION.md	Tenant Table Implementation
Archive		archive/status-reports/TEST_THE_CHANGES.md	Test the Changes - Quick Guide
Archive		archive/status-reports/THEMEABLE_LOGIN_PROGRESS.md	Themeable Login System - Implementation Progress
Archive		archive/status-reports/UNIFIED_DESIGN_SYSTEM_COMPLETE.md	Unified Design System - Implementation Complete
Archive		archive/status-reports/UNIFIED_DESIGN_SYSTEM_COMPLETION_SUMMARY.md	Unified Design System - Completion Summary
Archive		archive/status-reports/UNIFIED_DESIGN_SYSTEM_PROGRESS.md	Unified Design System - Implementation Progress
Archive		archive/status-reports/UNIVERSAL_PRODUCT_CATALOG_TESTING_COMPLETE.md	Universal Product Catalog - Testing Implementation Complete
Archive		archive/status-reports/VEHICLE_FUNCTIONALITY_REMOVED.md	
Archive		archive/status-reports/VEHICLE_REMOVAL_SUMMARY.md	Vehicle & Industry-Specific Code Removal Summary
Archive		archive/status-reports/VENDOR_BILL_INTEGRATION_COMPLETE.md	
Archive		archive/status-reports/VENDOR_BILL_SYSTEM_COMPLETE.md	Vendor Bill System - Complete Implementation
Archive		archive/status-reports/VENDOR_BILL_WIRED_UP.md	
Archive		archive/tasks/TASK_10_1_SUMMARY.md	Task 10.1 Complete: Extend AuditLogger Service
Archive		archive/tasks/TASK_11_SUMMARY.md	Task 11 Summary: Sales & Customer Management Implementation
Audit	2026-01-23	audit/CHANGELOG_AUDIT.md	## Audit changelog
Audit	2026-01-24	audit/WHAT_WAS_DONE.md	What we did (audit execution + safe subset changes)
Audit	2026-01-25	audit/API_WIRING_FIXES.md	API Wiring Fixes — Actionable Remediation Plan
Audit	2026-01-25	audit/API_WIRING_MATRIX.md	API Wiring Matrix — Backend/Frontend Truth Sync
Audit	2026-01-25	audit/AUTOMOTIVE_CLASSIFICATION.md	Automotive Feature Classification
Audit	2026-01-25	audit/FORBIDDEN_SCAN_BASELINE.md	Forbidden Pattern Scan Baseline
Audit	2026-01-25	audit/GATE_B_PROOF.md	Gate B - Navigation Structure Complete: Proof Document
Audit	2026-01-25	audit/PATH_TRUTH.md	Backend Path Truth Documentation
Audit	2026-01-25	audit/THEME_AND_CSS_AUDIT.md	Theme and CSS Audit Report
Audit	2026-01-25	audit/frontend_wiring_2026-01-25/CHANGELOG.md	Frontend Wiring Audit Changelog
Audit	2026-01-25	audit/frontend_wiring_2026-01-25/NAV_INVENTORY.md	Navigation Inventory
Audit	2026-01-25	audit/frontend_wiring_2026-01-25/OLD_VS_NEW_DRIFT.md	Old vs New System Drift
Audit	2026-01-25	audit/frontend_wiring_2026-01-25/PATCH_PLAN.md	Frontend Wiring Patch Plan
Audit	2026-01-25	audit/frontend_wiring_2026-01-25/ROUTES_INVENTORY.md	Routes Inventory
Audit	2026-01-25	audit/frontend_wiring_2026-01-25/UNWIRED_FEATURES.md	Unwired Features
Audit	2026-01-25	audit/refactor/TARGET_STRUCTURE.md	TARGET_STRUCTURE.md — Consolidated Folder Structure Proposal
Audit	2026-01-25	audit/truth_sync_2026-01-25/CHANGELOG.md	CHANGELOG — Truth Sync (2026-01-25)
Audit	2026-01-25	audit/truth_sync_2026-01-25/DIFF_SUMMARY.md	DIFF_SUMMARY — Truth Sync (2026-01-25)
Audit	2026-01-25	audit/truth_sync_2026-01-25/FEATURE_TRUTH_TABLE.md	FEATURE_TRUTH_TABLE — Truth Sync (2026-01-25)
Audit	2026-01-25	audit/truth_sync_2026-01-25/MEMORY_GAP_REPORT.md	MEMORY_GAP_REPORT — Truth Sync (2026-01-25)
Audit	2026-01-25	audit/truth_sync_2026-01-25/PATCH_PLAN.md	PATCH_PLAN — Truth Sync (2026-01-25)
Audit	2026-01-25	audit/truth_sync_2026-01-25/SOURCES_INDEX.md	SOURCES_INDEX — Truth Sync (2026-01-25)
Audit	2026-01-25	audit/windows_bat_validation_2026-01-25/BAT_INVENTORY.md	Windows BAT Script Inventory
Audit	2026-01-25	audit/windows_bat_validation_2026-01-25/BAT_STANDARD.md	Windows BAT Script Gold Standard
Audit	2026-01-25	audit/windows_bat_validation_2026-01-25/CHANGELOG.md	Windows BAT Validation - Change Log
Audit	2026-01-25	audit/windows_bat_validation_2026-01-25/README.md	Windows BAT Script Validation - EasySale
Audit	2026-01-25	audit/windows_bat_validation_2026-01-25/RESULTS.md	Windows BAT Script Validation Results
Audit	2026-01-25	audit/windows_bat_validation_2026-01-25/STATUS.md	Windows BAT Validation - Current Status
Audit	2026-01-25	audit/windows_bat_validation_2026-01-25/SUMMARY.md	Windows BAT Validation - Executive Summary
Audit	2026-01-25	audit/windows_bat_validation_2026-01-25/TEST_MATRIX.md	Windows BAT Script Test Matrix
Audit	2026-01-26	audit/API_CLIENT_MAP.md	API Client Map
Audit	2026-01-26	audit/BACKEND_ONLY.md	Backend-Only Features
Audit	2026-01-26	audit/BRANDING_ASSETS.md	Branding Assets Documentation
Audit	2026-01-26	audit/DB_SCHEMA.md	Database Schema Map
Audit	2026-01-26	audit/DECAPS_SWEEP.md	De-CAPS String and Fixture Sweep
Audit	2026-01-26	audit/FEATURE_MATRIX.md	Backend-Frontend Wiring Feature Matrix
Audit	2026-01-26	audit/INDEX.md	Audit Documentation Index
Audit	2026-01-26	audit/LAYOUT_MAP.md	Layout Composition Map
Audit	2026-01-26	audit/LEGACY_UI_MAP.md	Legacy UI Map
Audit	2026-01-26	audit/NAVIGATION_CSS_AUDIT.md	Navigation CSS Audit Report
Audit	2026-01-26	audit/NAV_AUDIT.md	Navigation Audit
Audit	2026-01-26	audit/NAV_MOUNTS.md	Navigation Mount Audit
Audit	2026-01-26	audit/NAV_SOURCES.md	Navigation Sources Reference
Audit	2026-01-26	audit/REPO_REORG_MAPPING.md	Repository Reorganization Mapping
Audit	2026-01-26	audit/SETTINGS_MATRIX.md	Settings Matrix
Audit	2026-01-26	audit/SIDEBAR_STYLING_TOKENS_VERIFICATION.md	Sidebar Styling Design Tokens Verification
Audit	2026-01-26	audit/STUB_ENDPOINTS.md	Stub Endpoints
Audit	2026-01-26	audit/TASKS_1.3_TO_1.11_SUMMARY.md	Tasks 1.3-1.11 Completion Summary
Audit	2026-01-26	audit/WIRING_GAPS.md	Backend-Frontend Wiring Gaps Analysis
Audit	2026-01-26	audit/e2e/BACKEND_ROUTES.md	Backend Route Inventory
Audit	2026-01-26	audit/e2e/CAPABILITIES_CATALOG.md	Capabilities Catalog
Audit	2026-01-26	audit/e2e/FRONTEND_ROUTES.md	Frontend Route Inventory
Audit	2026-01-26	audit/e2e/GAP_REPORT.md	E2E Gap Report
Audit	2026-01-26	audit/e2e/IMPLEMENTATION_PLAN.md	Implementation Plan
Audit	2026-01-26	audit/e2e/STACK_PATHS.md	Stack Paths Discovery
Audit	2026-01-26	audit/e2e/TRACEABILITY_MATRIX.md	E2E Traceability Matrix
Audit	2026-01-26	audit/e2e/design.md	Architecture Design: OCR / Document Center / Template Blocker
Audit	2026-01-26	audit/e2e/plan.md	E2E Implementation Plan: OCR/Document Center/Template Blocker
Audit	2026-01-26	audit/e2e/spec.md	E2E Wiring Specification: OCR/Document Center/Template Blocker
Audit	2026-01-26	audit/e2e/tasks.md	E2E Implementation Tasks
Audit	2026-01-26	audit/frontend-wiring/COMPLETION_UPDATE_2026-01-26.md	Customer Management Completion Update
Audit	2026-01-26	audit/frontend-wiring/IMPLEMENTATION_LOG_2026-01-26.md	Frontend Wiring Implementation Log
Audit	2026-01-26	audit/frontend-wiring/PHASE_1_COMPLETE.md	Phase 1 Complete: Customer Management
Audit	2026-01-26	audit/frontend-wiring/PHASE_2_COMPLETE.md	Phase 2 Complete: Sales Reports Integration
Audit	2026-01-26	audit/frontend-wiring/PHASE_3_COMPLETE.md	Phase 3 Complete: Product Management Forms
Audit	2026-01-26	audit/frontend-wiring/SESSION_SUMMARY_2026-01-26.md	Frontend Wiring Session Summary
Audit	2026-01-26	audit/frontend-wiring/SESSION_SUMMARY_2026-01-26_PHASE_2.md	Session Summary: Phase 2 Complete - Sales Reports Integration
Audit	2026-01-26	audit/frontend-wiring/SESSION_SUMMARY_2026-01-26_PHASE_3.md	Session Summary: Phase 3 Complete - Product Management Forms
Audit	2026-01-27	audit/BASELINE_LOGS.md	Baseline Logs — EasySale UI Audit
Audit	2026-01-27	audit/BAT_FILES_AUDIT_2026-01-27.md	Batch Files Audit - January 27, 2026
Audit	2026-01-27	audit/FAILURES_INDEX.md	Route/Page Failures Index
Audit	2026-01-27	audit/FINAL_GATE_PROOF.md	Final Gate - All Tasks Complete
Audit	2026-01-27	audit/P0_FIXES_APPLIED.md	P0 Fixes Applied — EasySale UI Audit
Audit	2026-01-27	audit/PAGE_CATALOG.md	Page Catalog - Complete Route & Implementation Status
Audit	2026-01-27	audit/refactor/CURRENT_STATE_MAP.md	EasySale Repository - Current State Map
Audit	2026-01-27	audit/refactor/MIGRATION_PLAN.md	Migration Plan — EasySale Codebase Refactoring
Audit	2026-01-27	audit/settings-master-2026-01-27/API_WIRING_MATRIX.md	API Wiring Matrix - Frontend to Backend Mapping
Audit	2026-01-27	audit/settings-master-2026-01-27/BASELINE_LOGS.md	Baseline System State Capture - 2026-01-27T22:23:57Z
Audit	2026-01-27	audit/settings-master-2026-01-27/FAILURES_INDEX.md	Failures Index - Settings Master Truth-Sync
Audit	2026-01-27	audit/settings-master-2026-01-27/IA_REFACTOR_PLAN.md	IA Refactor Plan
Audit	2026-01-27	audit/settings-master-2026-01-27/INTERACTION_WIRING_AUDIT.md	Interaction Wiring Audit
Audit	2026-01-27	audit/settings-master-2026-01-27/README.md	Settings Master Truth-Sync & Fix Pass - 2026-01-27
Audit	2026-01-27	audit/settings-master-2026-01-27/SETTINGS_MASTER_REPORT.md	Settings Master Report - 2026-01-27 (UPDATED)
Audit	2026-01-27	audit/settings-master-2026-01-27/SETTINGS_UI_CATALOG.md	Settings UI Catalog
Audit	2026-01-27	audit/settings-master-2026-01-27/THEME_AND_CSS_AUDIT.md	Theme and CSS Token Audit - 2026-01-27
Audit	2026-01-27	audit/settings-master-2026-01-27/sub-agent-a/ROUTE_INVENTORY.md	Settings/Config/Integrations Route Inventory
Audit	2026-01-28	audit/THEME_CONFLICT_MAP.md	Theme Conflict Map
Audit	2026-01-28	audit/THEME_SOURCE_OF_TRUTH.md	Theme Source of Truth
Audit	2026-01-28	audit/refactor/CONFIG_FILES_INVENTORY.md	Config Files Inventory — Files With Hardcoded Paths
Audit	2026-01-28	audit/refactor/IMPORT_INVENTORY.md	Import Inventory - Files That Import from features/
Audit	2026-01-28	audit/refactor/INDEX.md	EasySale Refactor Planning Documents
Audit	2026-01-28	audit/refactor/MOVE_MAP.md	Move Map - Folder Structure Refactor
Audit	2026-01-28	audit/refactor/NEW_SESSION_EXECUTION_PROMPTS.md	New Session Execution Prompts for Folder Structure Refactor
Audit	2026-01-28	audit/refactor/RISKS_AND_MITIGATIONS.md	Risks and Mitigations — EasySale Refactor
Audit	2026-01-28	audit/refactor/VALIDATION_REPORT.md	Refactor Validation Report
Audit	2026-01-28	audit/refactor/baseline/MANIFEST.md	Refactor Baseline Manifest
Audit	2026-01-28	audit/store-locale/FOUND_IN_CODEBASE.md	Store Locale Discovery — FOUND IN CODEBASE
Audit	2026-01-28	audit/store-locale/VALIDATION.md	Store Locale Defaults — Validation Checklist
Audit	2026-01-28	audit/theme/CONFIG_AND_PATH_DRIFT.md	Config and Path Drift Analysis
Audit	2026-01-28	audit/theme/baseline/BASELINE_SUMMARY.md	Theme Globalization Baseline
Audit	2026-01-29	audit/COMMANDS_FOUND.md	EasySale Commands Reference
Audit	2026-01-29	audit/DOC_CROSSCHECK.md	Documentation Cross-Check Report
Audit	2026-01-29	audit/INSTALL_VALIDATION.md	Installation Validation Report
Audit	2026-01-29	audit/REPO_TRUTH_MAP.md	EasySale Repository Truth Map
Audit	2026-01-29	audit/ROUTES_BACKEND.md	Backend Routes Inventory
Audit	2026-01-29	audit/ROUTES_FRONTEND.md	Frontend Routes Inventory
Audit	2026-01-29	audit/UI_ACTIONS_MAP.md	UI Actions Map - Document Cleanup Engine
Audit		audit/AUDIT_EXECUTION_PLAN.md	## Audit Execution Plan (Dead Code + Docs/Reality + Production Readiness)
Audit		audit/CONSOLIDATION_PLAN.md	## Consolidation plan (docs + reality)
Audit		audit/DEAD_CODE_REPORT.md	## Dead code report (evidence-based)
Audit		audit/DOCS_VS_CODE_MATRIX.md	## Docs ↔ Code matrix (evidence-based)
Audit		audit/GATE_C_PROOF.md	Gate C - Page Updates Complete
Audit		audit/PRODUCTION_READINESS_GAPS.md	## Production readiness gaps (evidence-based)
Audit		audit/ROUTE_REGISTRY_DIFF.md	Route Registry Audit Report
Audit		audit/SALES_FEATURES_MATRIX_TEMP.md	
Audit		audit/SALES_FEATURES_PART1.md	## Sales Features Endpoints
Audit		audit/WARNINGS_FIX_REPORT.md	Warnings Fix Report
Audit		audit/frontend_wiring_2026-01-25/ARCHIVE_CORRECTION.md	Component Archive Correction
Audit		audit/frontend_wiring_2026-01-25/COMPONENT_CLEANUP_SUMMARY.md	Frontend Component Cleanup Summary
Audit		audit/production-readiness/PROD_READINESS_INFO_PACK.md	PROD_READINESS_INFO_PACK.md
Audit		audit/theme/THEME_SCAN_CHECKLIST.md	Theme Scan Checklist
Blog	2026-01-09	blog/2026-01-09-critical-foundation-complete.md	Critical Foundation Tasks Complete 🎉
Blog	2026-01-09	blog/2026-01-09-foundation-complete.md	Foundation Complete: 100% Infrastructure Ready
Blog	2026-01-09	blog/2026-01-09-foundation-infrastructure-sprint.md	Foundation Infrastructure Sprint: Building the Bones
Blog	2026-01-09	blog/2026-01-09-mvp-implementation-sprint.md	MVP Implementation Sprint - Testing, Auth, and Database
Blog	2026-01-09	blog/2026-01-09-port-configuration-standardization.md	Port Configuration Standardization: A Tale of Technical Debt
Blog	2026-01-10	blog/2026-01-10-audit-logging-implementation.md	Audit Logging for Backup & Restore Operations
Blog	2026-01-10	blog/2026-01-10-backup-logs-viewer.md	Backup Logs Viewer Implementation
Blog	2026-01-10	blog/2026-01-10-backup-ui-implementation.md	Backup Administration UI Implementation
Blog	2026-01-10	blog/2026-01-10-design-system-complete.md	Design System Complete - Production Ready! 🎉
Blog	2026-01-10	blog/2026-01-10-design-system-completion.md	Design System Completion - Production Ready! 🎉
Blog	2026-01-10	blog/2026-01-10-design-system-page-migration.md	Design System Completion Sprint
Blog	2026-01-10	blog/2026-01-10-docker-production-hardening.md	Docker Production Hardening: From Hackathon Chaos to Production Ready
Blog	2026-01-10	blog/2026-01-10-incremental-backups-retention.md	Incremental Backups & Retention Policies - The Foundation of Reliable Data Protection
Blog	2026-01-10	blog/2026-01-10-restore-service-completion.md	Restore Service Completion & API Implementation
Blog	2026-01-10	blog/2026-01-10-restore-service-implementation.md	Restore Service Implementation - Core Functionality
Blog	2026-01-10	blog/2026-01-10-restore-ui-implementation.md	Restore UI Implementation - Complete User Experience
Blog	2026-01-10	blog/2026-01-10-white-label-transformation-complete.md	White-Label Transformation: From CAPS to EasySale
Blog	2026-01-11	blog/2026-01-11-autonomous-completion.md	Autonomous Task Completion - Multi-Tenant Platform
Blog	2026-01-11	blog/2026-01-11-backend-config-api-implementation.md	Backend Configuration API Implementation
Blog	2026-01-11	blog/2026-01-11-backend-config-system-complete.md	Backend Configuration System Complete! 🎉
Blog	2026-01-11	blog/2026-01-11-data-migration-phase-1.md	Data Migration for Multi-Tenancy - Phase 1 Complete
Blog	2026-01-11	blog/2026-01-11-data-migration-phase-2-complete.md	Data Migration Phase 2: Production Migration Complete! 🎉
Blog	2026-01-11	blog/2026-01-11-data-migration-phase-3-validation-complete.md	Data Migration Phase 3: Validation Complete! 🎉
Blog	2026-01-11	blog/2026-01-11-data-migration-phase-3-validation.md	Data Migration Phase 3: Validation Complete
Blog	2026-01-11	blog/2026-01-11-data-migration-phase-4-5-in-progress.md	Data Migration Phase 4 & 5: Application Update In Progress 🚧
Blog	2026-01-11	blog/2026-01-11-dynamic-category-forms.md	Dynamic Category Forms: Making EasySale Truly Configurable
Blog	2026-01-11	blog/2026-01-11-dynamic-forms-system.md	Dynamic Forms System with Pre-Built Templates
Blog	2026-01-11	blog/2026-01-11-frontend-configuration-tests-complete.md	Frontend Configuration Tests Complete
Blog	2026-01-11	blog/2026-01-11-multi-tenant-phase-4-application-update.md	Multi-Tenant Phase 4: Application Update Complete
Blog	2026-01-11	blog/2026-01-11-phase-4-complete.md	Phase 4 Complete: Dynamic Components System
Blog	2026-01-11	blog/2026-01-11-session-summary-and-path-forward.md	Session Summary & Path Forward
Blog	2026-01-11	blog/2026-01-11-template-library-expansion.md	Template Library Expansion - Forms, Wizards & Configurations
Blog	2026-01-12	blog/2026-01-12-completing-remaining-work.md	Completing Remaining Work - Session Summary
Blog	2026-01-12	blog/2026-01-12-phase-4-compilation-fixes.md	Multi-Tenant Phase 4: Compilation Fixes & Query Updates
Blog	2026-01-12	blog/2026-01-12-property-tests-passing.md	Property-Based Tests Passing! 🎉🎉🎉
Blog	2026-01-12	blog/2026-01-12-settings-consolidation-complete.md	Settings Consolidation Complete - 10 Pages in 2 Hours
Blog	2026-01-12	blog/2026-01-12-universal-product-catalog-phase-1-2-complete.md	Universal Product Catalog: Database Schema & Models Complete
Blog	2026-01-12	blog/2026-01-12-universal-product-catalog-spec.md	Universal Product Catalog System - Specification Complete
Blog	2026-01-12	blog/2026-01-12-universal-product-catalog-testing-complete.md	Universal Product Catalog Testing Complete
Blog	2026-01-17	blog/2026-01-17-epic-7-complete-testing-documentation.md	Epic 7 Complete: Testing & Documentation Milestone
Blog	2026-01-29	blog/2026-01-29-backend-clippy-warnings-cleanup.md	Backend Clippy Warnings Cleanup
Blog	2026-01-29	blog/2026-01-29-database-path-cleanup.md	Database Path Cleanup and SQLx Offline Mode
Blog	2026-01-29	blog/2026-01-29-dev-prod-batch-files-complete.md	Dev/Prod Batch Files Complete
Blog	2026-01-29	blog/2026-01-29-dev-prod-separation-and-health-fixes.md	Development/Production Separation and Health Endpoint Fixes
Blog	2026-01-29	blog/2026-01-29-docker-build-dependency-sync.md	Docker Build Dependency Sync Fix
Blog	2026-01-29	blog/2026-01-29-docker-build-workflow-complete.md	Docker Build Workflow Complete
Blog	2026-01-29	blog/2026-01-29-docker-production-tenant-config.md	Docker Production Tenant Configuration Fix
Blog	2026-01-29	blog/2026-01-29-document-cleanup-engine-complete.md	Document Cleanup Engine (DCE) Implementation Complete
Blog	2026-01-29	blog/2026-01-29-frontend-bundle-optimization.md	Frontend Bundle Optimization: 75% Size Reduction
Blog	2026-01-29	blog/2026-01-29-login-page-archiving-and-production-cleanup.md	Login Page Archiving and Production Cleanup
Blog	2026-01-29	blog/2026-01-29-pre-existing-errors-cleanup.md	Pre-existing Errors Cleanup
Blog	2026-01-29	blog/2026-01-29-production-dependency-management.md	Production-Grade Dependency Management
Blog	2026-01-29	blog/2026-01-29-setup-wizard-and-theme-fixes.md	Setup Wizard and Theme System Fixes
Blog	2026-01-29	blog/2026-01-29-setup-wizard-compact-spacing.md	Setup Wizard Compact Spacing Fix
Blog	2026-01-29	blog/2026-01-29-setup-wizard-lan-detection-and-responsive-fixes.md	Setup Wizard: LAN Detection & Responsive Scaling Fixes
Blog	2026-01-29	blog/2026-01-29-setup-wizard-network-fixes.md	Setup Wizard Network and Health Fixes
Blog	2026-01-29	blog/2026-01-29-split-build-architecture-complete.md	Split Build Architecture Complete
Blog	2026-01-29	blog/2026-01-29-theme-persistence-and-flickering-fix.md	Theme Persistence and Flickering Fix
Blog	2026-01-29	blog/2026-01-29-theme-system-hardcoded-color-cleanup.md	Theme System: Hardcoded Color Cleanup
Blog	2026-01-29	blog/2026-01-29-theme-system-overhaul.md	Theme System Overhaul - Light Mode Fix and New Defaults
Blog	2026-01-29	blog/2026-01-29-ui-polish-and-demo-mode-fix.md	UI Polish and Demo Mode Fix
Blog	2026-01-29	blog/2026-01-29-universal-data-sync-100-percent-complete.md	Universal Data Sync - 100% Complete! 🎉
Blog	2026-01-29	blog/2026-01-29-woo-qbo-integration-truth-sync-complete.md	WooCommerce + QuickBooks Integration Truth-Sync Complete
Doc	2025-08-01	docs/sync/API_MIGRATION.md	API Migration Notes
Doc	2026-01-08	docs/development/EDIT_GUIDE.md	Quick Edit Guide - Remove Mock Data
Doc	2026-01-09	docs/README.md	Documentation
Doc	2026-01-17	docs/deployment/SETUP_GUIDE.md	EasySale - Fresh Install Setup Guide
Doc	2026-01-17	docs/sync/MAPPING_GUIDE.md	Field Mapping Guide
Doc	2026-01-19	docs/development/TODO.md	TODO - EasySale System
Doc	2026-01-20	docs/api/integration_api.md	Integration API Documentation
Doc	2026-01-20	docs/docker/bloat_report.md	Docker Build Context Bloat Report
Doc	2026-01-20	docs/export/current_export_surface.md	Current Export Surface Inventory
Doc	2026-01-20	docs/export/qbo_templates_inventory.md	QuickBooks Online CSV Templates Inventory
Doc	2026-01-20	docs/qbo/current_integration_map.md	QuickBooks Online Integration Map
Doc	2026-01-20	docs/traceability/requirements_trace.md	Requirements Traceability Matrix
Doc	2026-01-24	docs/design-system/css_audit_detailed.md	Detailed CSS Audit Report: Color and Spacing Patterns
Doc	2026-01-24	docs/design-system/current_state_audit.md	Current State Audit Report: EasySale Design System
Doc	2026-01-24	docs/design-system/layout_issues_documentation.md	Layout Issues Documentation
Doc	2026-01-24	docs/design-system/tailwind-usage-guidelines.md	Tailwind CSS Usage Guidelines
Doc	2026-01-24	docs/design-system/task-2.0.1-summary.md	Task 2.0.1 Summary: Tailwind-Token Alignment
Doc	2026-01-25	docs/DEPLOYMENT_WINDOWS.md	EasySale - Windows Deployment Guide
Doc	2026-01-25	docs/FEATURE_CHECKLIST.md	EasySale POS System - Feature Checklist
Doc	2026-01-25	docs/MAPPING_INTEGRATION_CHANGES.md	Mapping + Domain Integration Hardening - Changes Summary
Doc	2026-01-25	docs/USER_GUIDE_OUTLINE.md	EasySale POS System - User Guide Outline
Doc	2026-01-25	docs/deployment/WINDOWS_DEPLOYMENT_COMPLETE.md	Windows Deployment Validation - COMPLETE ✅
Doc	2026-01-25	docs/deployment/WINDOWS_DEPLOYMENT_QUICK_START.md	EasySale - Windows Deployment Quick Start
Doc	2026-01-25	docs/split-build/CAPABILITY_MATRIX.md	EasySale Capability Matrix — LITE vs FULL Build Analysis
Doc	2026-01-25	docs/split-build/RECOMMENDATIONS_D.md	EasySale Split Build Recommendations — Agent D
Doc	2026-01-25	docs/task-14.1-implementation-summary.md	Task 14.1 Implementation Summary
Doc	2026-01-26	docs/INDEX.md	EasySale Documentation Index
Doc	2026-01-26	docs/audit/requirements.md	Backend-Frontend Wiring Audit — Requirements
Doc	2026-01-27	docs/PRODUCTION_QUALITY_FIXES.md	Production Quality Fixes — Document Workflow
Doc	2026-01-27	docs/audit/design.md	Design Document — EasySale UI Audit & Fix
Doc	2026-01-27	docs/audit/plan.md	Master Plan — EasySale UI Audit & Fix
Doc	2026-01-27	docs/audit/tasks.md	Task List — EasySale UI Audit & Fix
Doc	2026-01-27	docs/split-build/FRONTEND_SPLIT_AUDIT.md	Frontend Split Audit
Doc	2026-01-27	docs/split-build/RECOMMENDATIONS_C.md	Frontend Split Recommendations
Doc	2026-01-28	docs/BACKEND_TEST_FIXES_NEEDED.md	Backend Test Compilation Fixes Needed
Doc	2026-01-28	docs/OCR_DOCUMENT_WORKFLOW_HARDENING_SUMMARY.md	OCR + Document Intake + Vendor Bill Workflow Hardening Summary
Doc	2026-01-29	docs/INSTALL.md	EasySale Installation Guide
Doc	2026-01-29	docs/REPO_OVERVIEW.md	EasySale Repository Overview
Doc	2026-01-29	docs/RUNBOOK.md	EasySale Runbook
Doc	2026-01-29	docs/integrations/truth_sync/00_INVENTORY_OF_EXISTING_WOO_QBO.md	Inventory of Existing WooCommerce & QuickBooks Online Integration
Doc	2026-01-29	docs/integrations/truth_sync/01_GAPS_AND_DUPLICATION_MAP.md	Gaps and Duplication Map
Doc	2026-01-29	docs/integrations/truth_sync/02_CONSOLIDATION_PLAN.md	Consolidation Plan
Doc	2026-01-29	docs/integrations/truth_sync/03_SYNC_RULES_MATRIX.md	Sync Rules Matrix
Doc	2026-01-29	docs/integrations/truth_sync/04_MAPPING_SPEC_POS_TO_WOO_QBO.md	Mapping Specification: POS ↔ WooCommerce ↔ QuickBooks
Doc	2026-01-29	docs/integrations/truth_sync/05_FAILURE_MODES_AND_WORST_CASES.md	Failure Modes and Worst Cases
Doc	2026-01-29	docs/integrations/truth_sync/06_API_AND_UI_WIRING_CHECKLIST.md	API and UI Wiring Checklist
Doc	2026-01-29	docs/integrations/truth_sync/07_TEST_PLAN_OFFLINE_ONLINE_IDEMPOTENCY.md	Test Plan: Offline, Online, and Idempotency
Doc	2026-01-29	docs/integrations/truth_sync/IMPLEMENTATION_LOG.md	Implementation Log
Doc	2026-01-29	docs/integrations/truth_sync/plan.md	WooCommerce + QuickBooks Integration Consolidation Plan
Doc	2026-01-29	docs/integrations/truth_sync/task.md	Implementation Tasks
Doc	2026-01-29	docs/split-build/BUILD_MATRIX.md	EasySale Build Matrix — Quick Reference
Doc	2026-01-29	docs/split-build/BUILD_TARGETS_AUDIT.md	Build Targets Audit
Doc	2026-01-29	docs/split-build/DESIGN.md	EasySale Split Build Architecture — Design Document
Doc	2026-01-29	docs/split-build/MASTER_PLAN.md	EasySale Split Build Architecture — Master Plan
Doc	2026-01-29	docs/split-build/RECOMMENDATIONS_B.md	Recommendations: Build Targets, Profiles, Feature Flags, and Commands
Doc	2026-01-29	docs/split-build/TASKS.md	EasySale Split Build — Implementation Tasks
Doc		assets/README.md	EasySale Brand Asset Pack (v2)
Doc		docs/DATA_SOURCES_REFERENCE.md	Data Sources Reference
Doc		docs/MODULE_BOUNDARIES_QUICK_REFERENCE.md	Module Boundaries Quick Reference
Doc		docs/REPO_HYGIENE_RECOMMENDATIONS.md	Repository Hygiene Recommendations
Doc		docs/SECURITY.md	Security Guidelines - CAPS POS System
Doc		docs/SECURITY_EXCEPTIONS.md	Security Exceptions Registry
Doc		docs/VIDEO_GUIDE_SCRIPT.md	EasySale POS System - Video Guide Script
Doc		docs/api/README.md	API Documentation
Doc		docs/api/ocr_api.md	OCR API Documentation
Doc		docs/api/review_api.md	Review API Documentation
Doc		docs/architecture/data-flow.md	Data Flow Documentation
Doc		docs/architecture/database.md	Database Schema Documentation
Doc		docs/architecture/deployment.md	Deployment Guide
Doc		docs/architecture/design.md	Configurable POS Design (system rules + implementation guidance)
Doc		docs/architecture/module-boundaries.md	Module Boundary Enforcement
Doc		docs/architecture/overview.md	System Architecture Overview
Doc		docs/architecture/security.md	Security Architecture
Doc		docs/architecture/testing-coverage.md	Test Coverage Configuration
Doc		docs/assets/FAVICON_SYSTEM.md	EasySale Favicon and Logo System
Doc		docs/backup-security.md	Backup System Security Documentation
Doc		docs/brand-assets-guide.md	Brand Assets Guide
Doc		docs/build/ARCHIVE_EXCLUSION.md	Archive Directory Exclusion from Builds
Doc		docs/build/BATCH_FILES_REFERENCE.md	EasySale - Batch Files Reference
Doc		docs/build/BUILD_INSTRUCTIONS.md	Build Instructions
Doc		docs/build/FRESH_BUILD_GUIDE.md	EasySale - Fresh Build Guide
Doc		docs/build/build_matrix.md	Build Matrix Documentation
Doc		docs/deployment/BUILD_GUIDE.md	EasySale - Build Guide
Doc		docs/deployment/CI_CD_GUIDE.md	CI/CD Pipeline Guide
Doc		docs/deployment/DOCKER_BUILD_INSTRUCTIONS.md	Docker Build Instructions - EasySale
Doc		docs/deployment/DOCKER_VERIFICATION_INSTRUCTIONS.md	Docker Verification Instructions
Doc		docs/deployment/READY_FOR_DOCKER_BUILD.md	✅ READY FOR DOCKER BUILD
Doc		docs/deployment/ocr_deployment.md	OCR System Deployment Guide
Doc		docs/development/VERIFICATION_CHECKLIST.md	Vehicle Removal Verification Checklist
Doc		docs/development/kiro-guide.md	Kiro CLI Guide
Doc		docs/development/plan.md	POS UX + Workflow Plan (goals, rollout, measurement)
Doc		docs/development/task.md	POS Implementation Backlog (epics/stories/tasks)
Doc		docs/endpoint-gating.md	Endpoint Gating Implementation (Task 9.4)
Doc		docs/features/LAN_ACCESS_CONFIGURATION.md	LAN Access Configuration
Doc		docs/features/product-import.md	Product Import Feature
Doc		docs/features/theme-defaults.md	Theme Default Support
Doc		docs/frontend/ui-gating-guide.md	UI Gating Guide - Capabilities-Based Feature Display
Doc		docs/migration/snapshot_migration.md	Accounting Snapshot Migration Guide
Doc		docs/split-build/BACKEND_GRAPH.md	Backend Workspace Dependency Graph
Doc		docs/split-build/DEVELOPER_GUIDE.md	Split Build Developer Guide
Doc		docs/split-build/RECOMMENDATIONS_A.md	Backend Split Build Recommendations
Doc		docs/sync/ARCHITECTURE.md	Universal Data Sync Architecture
Doc		docs/sync/SETUP_GUIDE.md	Universal Data Sync Setup Guide
Doc		docs/sync/TROUBLESHOOTING.md	Troubleshooting Guide
Doc		docs/sync/sidecar_architecture.md	QuickBooks Sync Add-On - Sidecar Architecture
Doc		docs/task-9.4-summary.md	Task 9.4 Implementation Summary: Dev/Debug/Setup Endpoint Gating
Doc		docs/ui/INFORMATION_ARCHITECTURE.md	Information Architecture Documentation
Doc		docs/ui/LEGACY_QUARANTINE.md	Legacy Quarantine Documentation
Doc		docs/ui/NAV_CONFIG.md	Navigation Configuration Documentation
Doc		docs/ui/USED_COMPONENTS.md	Used Components Documentation
Doc		docs/ui/layout_hierarchy.md	Layout Hierarchy Documentation
Doc		docs/user-guides/ocr_review_guide.md	OCR Review User Guide
Doc		docs/user-guides/quick-start.md	Quick Start Guide
Doc		docs/ux/DCE_USER_JOURNEYS.md	Document Cleanup Engine - User Journeys
Doc		docs/ux/REVIEW_STATE_MACHINE.md	Review State Machine
Doc		docs/ux/ROLES_AND_PERMISSIONS.md	Roles and Permissions - Document Cleanup Engine
Doc		docs/vendor-bill-mapping-contract.md	Vendor Bill Mapping Contract
Memory	2026-01-08	memory-bank/MEMORY_SYSTEM.md	🧠 AI Memory System - Operating Instructions
Memory	2026-01-29	memory-bank/active-state.md	🧠 Active Session State
Memory	2026-01-29	memory-bank/system_patterns.md	⚙️ System Patterns
Memory		memory-bank/project_brief.md	EasySale System - Project Brief
Spec	2026-01-29	spec/AUTOMATION_SCRIPTS.md	EasySale — Automation Scripts
Spec	2026-01-29	spec/CHECKLISTS.md	EasySale — Checklists
Spec	2026-01-29	spec/INSTALL.md	EasySale — Installation Guide
Spec	2026-01-29	spec/USER_GUIDE.md	EasySale — User Guide
Spec	2026-01-29	spec/VIDEO_GUIDE_SCRIPT.md	EasySale — Video Guide Script
Spec	2026-01-29	spec/design.md	EasySale POS System — Design Specification
Spec	2026-01-29	spec/plan.md	EasySale POS System — Implementation Plan
Spec	2026-01-29	spec/req.md	EasySale POS System — Requirements Specification
Spec		spec/README_MASTER.md	1. Clone the repository
```

