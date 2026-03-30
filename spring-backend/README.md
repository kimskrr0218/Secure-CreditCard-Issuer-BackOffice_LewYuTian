# Spring Backend Application

## Prerequisites
- Java 17
- Maven
- (Optional) Docker for PostgreSQL database

## How to Run

### Option 1: Using PostgreSQL with Docker (Recommended)
1. Start the database:
   ```bash
   docker-compose up -d
   ```
2. Run the application:
   ```bash
   mvn spring-boot:run
   ```

### Option 2: Using H2 Database (In-Memory) - RECOMMENDED FOR QUICK START
1. Open `src/main/resources/application.properties`.
2. Ensure the **PostgreSQL** section is commented out and **H2** is uncommented.
3. Run the application with the custom settings to bypass build errors:
   ```bash
   mvn spring-boot:run -s settings.xml "-Dmaven.repo.local=./local-repo"
   ```
   *Note: If port 8080 is in use, add `-Dserver.port=8081` to the command.*

## Troubleshooting
If you see "Could not create local repository" or "403 Forbidden" errors, always use the command above which uses the local `settings.xml` and `local-repo`.

## Initial Data
The application starts with the following default users:
- **Admin**: `admin` / `admin123`
- **Manager**: `manager` / `manager123`
- **Staff**: `staff` / `staff123`

## API Access
- Backend runs on: `http://localhost:8080`
- H2 Console (if enabled): `http://localhost:8080/h2-console`

