# 💳 Secure Credit Card Issuer Back Office System

This repository contains the full implementation and documentation of the **Secure Credit Card Issuer Back Office System**, developed by **Lew Yu Tian** as part of the UTAR Final Year Project (FYP).

---

## 1. 🏗️ Project Overview

The system provides a secure and efficient platform for managing **credit card issuing operations** through role-based access control (RBAC) and maker-checker approval workflows.

### Key Features
- **Role-Based Access Control (RBAC)** — Three distinct roles: Admin, Manager (Checker), and Staff (Maker)
- **Maker-Checker Workflow** — Two-step approval for critical operations such as account creation and card issuance
- **Customer, Account & Card Modules** — Complete CRUD functionality for managing issuer operations
- **Dashboard & Reports** — Overview dashboard and reporting capabilities
- **AI Chat Assistant** — Integrated chat widget powered by Groq AI (LLaMA 3.3 70B)
- **Email Notifications** — Automated emails via MailerSend API
- **Field-Level Encryption** — Sensitive data (card number, CVV, ID number, phone) encrypted at rest using AES-256-GCM
- **User Profile Management** — View and update user profile

---

## 2. 🧩 Technology Stack

| Layer              | Technology                                                    |
|--------------------|---------------------------------------------------------------|
| **Frontend**       | Angular 17, Angular Material 17, TypeScript 5.4               |
| **Backend**        | Java 17, Spring Boot 3.2.4, Spring Security, Spring Data JPA  |
| **Database**       | PostgreSQL 15                                                 |
| **Build Tools**    | Maven (backend), Angular CLI (frontend)                       |
| **Containerization** | Docker & Docker Compose (for database)                      |
| **AI Integration** | Groq API (LLaMA 3.3 70B)                                     |
| **Email Service**  | MailerSend HTTP API                                           |
| **Encryption**     | AES-256-GCM for field-level encryption                        |
| **Version Control**| Git & GitLab                                                  |

---

## 3. 📋 Prerequisites and Required Software

Ensure the following are installed on your machine:

| Software        | Version      | Download Link                                                  |
|-----------------|--------------|----------------------------------------------------------------|
| **Java JDK**    | 17 or above  | [Adoptium](https://adoptium.net/)                              |
| **Maven**       | 3.8+         | [Maven](https://maven.apache.org/download.cgi)                 |
| **Node.js**     | 18 or above  | [Node.js](https://nodejs.org/)                                 |
| **npm**         | 9+           | Comes with Node.js                                             |
| **Angular CLI** | 17           | `npm install -g @angular/cli@17`                               |
| **Docker**      | Latest       | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **Git**         | Latest       | [Git](https://git-scm.com/)                                   |

---

## 4. 🚀 Setup and Installation Steps

### 4.1 Clone the Repository

```bash
git clone <your-gitlab-repo-url>
cd Secure-CreditCard-Issuer-BackOffice_LewYuTian
```

### 4.2 Backend Setup

```bash
cd spring-backend
```

#### Configure Secrets

1. Copy the secret properties template:
   ```bash
   cp src/main/resources/application-secret.properties.example src/main/resources/application-secret.properties
   ```
2. Open `application-secret.properties` and fill in your actual values:
   ```properties
   # Database
   DB_URL=jdbc:postgresql://localhost:5432/issuerdb
   DB_USERNAME=postgres
   DB_PASSWORD=<your-db-password>

   # MailerSend
   MAILERSEND_API_TOKEN=<your-mailersend-api-token>

   # Groq AI
   GROQ_API_KEY=<your-groq-api-key>

   # AES-256 encryption key (64 hex characters)
   ENCRYPTION_AES_KEY=<your-64-hex-char-key>
   ```

> ⚠️ **Important:** `application-secret.properties` is git-ignored. **Never commit real secrets.**

#### Install Dependencies & Build

```bash
mvn clean install -DskipTests
```

### 4.3 Frontend Setup

```bash
cd issuer-frontend
npm install
```

---

## 5. 🗄️ Database Setup

The project uses **PostgreSQL 15**. The easiest way to set it up is via Docker Compose.

### Option A: Using Docker Compose (Recommended)

```bash
cd spring-backend
docker-compose up -d
```

This will start a PostgreSQL container with:
| Parameter     | Value       |
|---------------|-------------|
| Database name | `issuerdb`  |
| Username      | `postgres`  |
| Password      | `postgres`  |
| Port          | `5432`      |

### Option B: Manual PostgreSQL Installation

If you have PostgreSQL installed locally:

1. Create a database named `issuerdb`:
   ```sql
   CREATE DATABASE issuerdb;
   ```
2. Update the credentials in `application-secret.properties` accordingly.

> **Note:** The application uses `spring.jpa.hibernate.ddl-auto=update`, so all tables will be **created/updated automatically** on startup.

---

## 6. ▶️ How to Run the Application

### Step 1: Start the Database

```bash
cd spring-backend
docker-compose up -d
```

### Step 2: Start the Backend

```bash
cd spring-backend
mvn spring-boot:run
```

The backend will start on **http://localhost:8080**.

### Step 3: Start the Frontend

Open a **new terminal**:

```bash
cd issuer-frontend
npm start
```

The frontend will start on **http://localhost:4200** with a proxy to the backend API.

### 🌐 Accessing the Application

Open your browser and navigate to: **http://localhost:4200**

---

## 7. ⚠️ Important Notes and Known Limitations

### Important Notes
- The frontend proxies all `/api` requests to the backend at `http://localhost:8080` (configured in `proxy.conf.json`).
- Sensitive fields (card number, CVV, ID number, phone number) are encrypted at rest using **AES-256-GCM**. Ensure the `ENCRYPTION_AES_KEY` is set before creating any data.
- The AI Chat feature requires a valid **Groq API key**. The chat will not function without it.
- Email notifications require a valid **MailerSend API token**.

### Known Limitations
- The application is designed for development/demo purposes and has not been hardened for production deployment.
- The Docker Compose file only covers the database; the backend and frontend are run locally.
- H2 in-memory database configuration is included but disabled by default (can be enabled in `application.properties` for quick testing without PostgreSQL).
