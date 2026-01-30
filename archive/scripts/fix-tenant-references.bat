@echo off
REM Fix all tenant table references in migrations
REM This script removes FOREIGN KEY constraints that reference the non-existent tenants table

powershell.exe -ExecutionPolicy Bypass -File "%~dp0fix-tenant-references.ps1"
pause
