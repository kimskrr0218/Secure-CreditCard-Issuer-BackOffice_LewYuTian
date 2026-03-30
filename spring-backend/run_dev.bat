@echo off
echo ==========================================================
echo Starting Spring Backend with Local Repository Settings
echo (Fixes "LocalRepositoryNotAccessibleException" error)
echo ==========================================================

REM Use the local settings.xml and the local-repo folder created in the project
mvn spring-boot:run -s settings.xml "-Dmaven.repo.local=%~dp0local-repo"

pause
