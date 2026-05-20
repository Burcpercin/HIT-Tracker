# HIT Tracker

A workout tracking application built around **Mike Mentzer's High Intensity Training (HIT)** philosophy. Train brief, train hard, rest long — and let the data drive your progress.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Running Tests](#running-tests)
- [Environment Variables](#environment-variables)

---

## Overview

HIT Tracker is a full-stack single-page application that helps users plan, execute, and track workouts based on Mentzer's core principles: one set to failure, progressive overload, and mandatory rest between sessions.

---

## Features

**Authentication**
- JWT-based login and registration
- Secure password hashing with bcrypt

**Onboarding**
- 5-step profile wizard (age, gender, height, weight, activity level, goal)
- Automatic calorie and macro calculation using Mifflin-St Jeor formula

**Dashboard**
- Daily nutrition widget (target calories, protein, carbs, fat, BMR)
- Active program overview with quick-start button
- Recent session history

**Exercise Library**
- 800+ seeded exercises from a public database
- Filter by muscle group, search by name
- Custom exercise creation with Mentzer-style rest day enforcement (minimum 3 days)

**Training Programs**
- Create and manage multiple workout programs
- Assign exercises to specific days with sets and target reps
- One active program at a time

**Workout Sessions**
- Smart day detection — loads today's scheduled exercises automatically
- Previous performance pre-filled for each exercise
- Progressive overload indicator (weight increase/decrease vs last session)
- Failure tracking per exercise
- Session history with military-style log table

**AI Coach**
- Powered by Google Gemini API
- Generates a personalized HIT program based on available days, goal, experience, and equipment
- Save AI-generated programs and add exercises manually

**Calorie Tracking**
- Recalculate nutrition on the fly by updating weight or goal

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| Authentication | JWT + bcrypt |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| AI Integration | Google Gemini API (gemini-1.5-flash) |
| Testing | Jest + cross-env |
| Frontend | Vanilla JavaScript (no framework) |
| Icons | Lucide |

---

## Project Structure

```
hit-tracker/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── pool.js                  # PostgreSQL connection pool
│   │   │   ├── schema.sql               # Database schema
│   │   │   ├── seedExercises.js         # Seed script for exercise library
│   │   │   ├── exerciseRepository.js
│   │   │   ├── userRepository.js
│   │   │   ├── workoutSessionRepository.js
│   │   │   ├── programRepository.js
│   │   │   ├── profileRepository.js
│   │   │   └── quoteRepository.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js        # JWT verification
│   │   │   └── validate.js             # Input validation
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── exerciseRoutes.js
│   │   │   ├── workoutSessionRoutes.js
│   │   │   ├── programRoutes.js
│   │   │   ├── calorieRoutes.js
│   │   │   ├── quoteRoutes.js
│   │   │   └── geminiRoutes.js
│   │   └── services/
│   │       ├── authService.js
│   │       ├── exerciseService.js
│   │       ├── workoutSessionService.js
│   │       ├── programService.js
│   │       ├── calorieService.js
│   │       ├── quoteService.js
│   │       └── geminiService.js
│   ├── tests/
│   │   ├── calorieService.test.js
│   │   ├── exerciseService.test.js
│   │   └── validate.test.js
│   ├── .env
│   └── package.json
└── frontend/
    ├── index.html
    ├── style.css
    ├── app.js                           # Init, view routing
    └── js/
        ├── api.js                       # API helper, toast, confirm modal
        ├── auth.js                      # Login, register, logout
        ├── onboarding.js               # Profile wizard
        ├── dashboard.js                # Stats, nutrition widget
        ├── exercises.js                # Exercise library and CRUD
        ├── training.js                 # Programs, workout sessions, history
        └── ai.js                       # AI coach and program generation
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL 14+

### 1. Clone the repository

```bash
git clone https://github.com/your-username/hit-tracker.git
cd hit-tracker
```

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend/` folder:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hit_tracker
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Set up the database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE hit_tracker;"

# Run schema
psql -U postgres -d hit_tracker -f backend/src/db/schema.sql
```

### 5. Seed exercises

```bash
cd backend
npm run seed
```

### 6. Start the server

```bash
npm start
```

### 7. Open the app

Open `frontend/index.html` in your browser, or serve it with a static server:

```bash
npx serve frontend
```

The API will be running at `http://localhost:3000`.

---

## API Documentation

Swagger UI is available at:

```
http://localhost:3000/api-docs
```

### Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/exercises | List all exercises |
| POST | /api/exercises | Create custom exercise |
| PUT | /api/exercises/:id | Update exercise |
| DELETE | /api/exercises/:id | Delete exercise |
| GET | /api/programs | List programs |
| POST | /api/programs | Create program |
| PATCH | /api/programs/:id/activate | Set active program |
| POST | /api/programs/:id/exercises | Add exercise to program |
| DELETE | /api/programs/:id/exercises/:eid | Remove exercise from program |
| GET | /api/sessions | List workout sessions |
| POST | /api/sessions | Create session |
| POST | /api/sessions/:id/exercises | Log exercise to session |
| GET | /api/calories/profile | Get calorie report |
| POST | /api/calories/profile | Create/update profile |
| GET | /api/quotes/random | Get motivational quote |
| POST | /api/ai/workout-suggestion | Generate AI workout plan |
| POST | /api/ai/workout-suggestion/save | Save AI plan as program |

---

## Running Tests

```bash
cd backend
npm test
```

29 tests across 3 test suites:

| File | What it tests |
|---|---|
| `calorieService.test.js` | BMR calculation, TDEE multipliers, macro distribution, goal adjustments |
| `exerciseService.test.js` | Exercise CRUD, rest day validation (Mentzer minimum 3 days), muscle group filtering |
| `validate.test.js` | Input validation middleware — required fields, email format, numeric ranges |

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `GEMINI_API_KEY` | Google Gemini API key for AI workout generation |

---

## Design Philosophy

This application is built around Mike Mentzer's core belief:

> *"One set taken to failure is worth more than ten half-hearted sets."*

Every feature reflects this: mandatory rest days, failure tracking, progressive overload detection, and AI-generated programs that follow HIT principles. Quality over quantity — in training and in code.

---

# HIT Tracker — Türkçe

Mike Mentzer'in **Yüksek Yoğunluklu Antrenman (HIT)** felsefesine dayalı bir antrenman takip uygulaması. Kısa antrenmana, maksimum yoğunluğa ve uzun dinlenmeye odaklan — ilerlemeyi verilerle takip et.

---

## İçindekiler

- [Genel Bakış](#genel-bakış)
- [Özellikler](#özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Kurulum](#kurulum)
- [API Dokümantasyonu](#api-dokümantasyonu)
- [Testler](#testler)
- [Tasarım Felsefesi](#tasarım-felsefesi)

---

## Genel Bakış

HIT Tracker, kullanıcıların Mentzer'in temel prensiplerine göre antrenman planlamasına, uygulamasına ve takip etmesine yardımcı olan tam yığın bir tek sayfa uygulamasıdır. Temel prensipler: başarısızlığa kadar tek set, progresif aşırı yüklenme ve setler arası zorunlu dinlenme.

---

## Özellikler

**Kimlik Doğrulama**
- JWT tabanlı giriş ve kayıt
- bcrypt ile güvenli şifre hashleme

**İlk Kurulum Sihirbazı**
- 5 adımlı profil oluşturma (yaş, cinsiyet, boy, kilo, aktivite seviyesi, hedef)
- Mifflin-St Jeor formülüyle otomatik kalori ve makro hesaplama

**Dashboard**
- Günlük beslenme widget'ı (hedef kalori, protein, karbonhidrat, yağ, BMR)
- Aktif program özeti ile hızlı başlatma butonu
- Son seans geçmişi

**Egzersiz Kütüphanesi**
- 800+ önceden yüklenmiş egzersiz
- Kas grubuna göre filtreleme, isme göre arama
- Mentzer tarzı dinlenme günü zorunluluğuyla özel egzersiz oluşturma (minimum 3 gün)

**Antrenman Programları**
- Birden fazla antrenman programı oluşturma ve yönetme
- Egzersizleri set ve hedef tekrar sayısıyla belirli günlere atama
- Aynı anda yalnızca bir aktif program

**Antrenman Seansları**
- Akıllı gün tespiti — bugün planlanan egzersizleri otomatik yükler
- Her egzersiz için önceki performans otomatik doldurma
- Son seansa göre progresif aşırı yüklenme göstergesi
- Egzersiz başına başarısızlık takibi
- Askeri log tarzı seans geçmişi

**AI Antrenman Koçu**
- Google Gemini API ile güçlendirilmiş
- Müsait günler, hedef, deneyim ve ekipmana göre kişiselleştirilmiş HIT programı oluşturur
- AI tarafından oluşturulan programları kaydet ve egzersiz ekle

**Kalori Takibi**
- Kilo veya hedef güncellenerek beslenme anında yeniden hesaplanır

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Çalışma Ortamı | Node.js |
| Framework | Express.js |
| Veritabanı | PostgreSQL |
| Kimlik Doğrulama | JWT + bcrypt |
| API Dokümantasyonu | Swagger (swagger-jsdoc + swagger-ui-express) |
| AI Entegrasyonu | Google Gemini API (gemini-1.5-flash) |
| Test | Jest + cross-env |
| Frontend | Vanilla JavaScript (framework yok) |
| İkonlar | Lucide |

---

## Kurulum

### Gereksinimler

- Node.js v18+
- PostgreSQL 14+

### 1. Repoyu klonla

```bash
git clone https://github.com/your-username/hit-tracker.git
cd hit-tracker
```

### 2. Bağımlılıkları yükle

```bash
cd backend
npm install
```

### 3. Ortam değişkenlerini yapılandır

`backend/` klasörünün içinde `.env` dosyası oluştur:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hit_tracker
DB_USER=postgres
DB_PASSWORD=sifreniz
JWT_SECRET=jwt_gizli_anahtariniz
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=gemini_api_anahtariniz
```

### 4. Veritabanını oluştur

```bash
psql -U postgres -c "CREATE DATABASE hit_tracker;"
psql -U postgres -d hit_tracker -f backend/src/db/schema.sql
```

### 5. Egzersizleri yükle

```bash
cd backend
npm run seed
```

### 6. Sunucuyu başlat

```bash
npm start
```

### 7. Uygulamayı aç

Tarayıcıda `frontend/index.html` dosyasını açın veya statik sunucu ile çalıştırın:

```bash
npx serve frontend
```

API `http://localhost:3000` adresinde çalışacaktır.

---

## API Dokümantasyonu

Swagger UI şu adreste mevcuttur:

```
http://localhost:3000/api-docs
```

---

## Testler

```bash
cd backend
npm test
```

3 test paketinde 29 test:

| Dosya | Test Kapsamı |
|---|---|
| `calorieService.test.js` | BMR hesaplama, TDEE çarpanları, makro dağılımı, hedef ayarlamaları |
| `exerciseService.test.js` | Egzersiz CRUD, dinlenme günü validasyonu (Mentzer minimum 3 gün), kas grubu filtreleme |
| `validate.test.js` | Girdi doğrulama middleware — zorunlu alanlar, e-posta formatı, sayısal aralıklar |

---

## Tasarım Felsefesi

Bu uygulama Mike Mentzer'in temel inancı üzerine inşa edilmiştir:

> *"Başarısızlığa kadar yapılan bir set, yarım yamalak yapılan on setten daha değerlidir."*

Her özellik bunu yansıtır: zorunlu dinlenme günleri, başarısızlık takibi, progresif aşırı yüklenme tespiti ve HIT prensiplerine uyan AI tarafından oluşturulan programlar. Hem antrenmanda hem de kodda nitelik, nicelikten üstündür.