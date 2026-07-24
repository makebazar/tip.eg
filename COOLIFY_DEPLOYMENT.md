# Руководство по деплою TIp на Coolify (с PostgreSQL)

Данный документ содержит пошаговую инструкцию по созданию сервиса **PostgreSQL** в Coolify и развертыванию веб-приложения **TIp** (Next.js 16 + PostgreSQL).

---

## 🛠 Архитектура в Coolify

В Coolify создаются **два связанных сервиса**:
1. **PostgreSQL Database** — отдельная полноценная баз данных (в 1 клик).
2. **TIp Application** — контейнер Next.js, подключающийся к PostgreSQL через переменную `DATABASE_URL`.

---

## 🚀 Пошаговая настройка в панели Coolify

### Шаг 1: Создание базы данных PostgreSQL в Coolify

1. В вашей панели **Coolify** перейдите в ваш проект/окружение (например, `production`).
2. Нажмите **+ Add New Resource**.
3. Выберите **Databases** -> **PostgreSQL**.
4. Задайте имя ресурса (например, `tip-postgres`) и нажмите **Save**.
5. Нажмите **Start / Deploy** для запуска базы данных.
6. Скопируйте строку подключения из поля **Internal Database URL** или **Connection String** (выглядит как `postgres://postgres:password@tip-postgres:5432/postgres` или подобное).

---

### Шаг 2: Создание веб-приложения TIp

1. В том же окружении Coolify нажмите **+ Add New Resource** -> **Public / Private Repository** (GitHub / GitLab).
2. Укажите ссылку на ваш репозиторий проекта TIp и выбранную ветку (например, `main` или `master`).
3. В разделе **Build Pack** выберите **Dockerfile**.

---

### Шаг 3: Переменные окружения (Environment Variables)

Перейдите во вкладку **Environment Variables** веб-приложения в Coolify и добавьте переменные:

| Ключ | Значение | Описание |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Окружение Node.js |
| `PORT` | `3000` | Порт приложения |
| `DATABASE_URL` | `postgres://postgres:...@tip-postgres:5432/postgres` | Внутренняя ссылка подключения к созданной БД PostgreSQL |
| `NEXT_PUBLIC_BASE_URL` | `https://tip.yourdomain.com` | Публичный URL вашего сайта |

*(Опционально, при использовании ИИ-перевода):*
- `OPENAI_API_KEY`: ваш ключ API OpenAI
- `GROQ_API_KEY`: ваш ключ API Groq

---

### Шаг 4: Настройка Домена и SSL (FQDN)

1. В поле **Domains / FQDN** укажите ваш домен с протоколом `https://`:
   `https://tip.yourdomain.com`
2. Coolify автоматически выставит бесплатный SSL-сертификат Let's Encrypt.

---

### Шаг 5: Запуск (Deploy)

1. Нажмите кнопку **Deploy** в правом верхнем углу.
2. При первом старте приложение автоматически создаст все необходимые таблицы PostgreSQL и заполнит их стартовыми данными (Self-Seeding).
3. Готово! Теперь сайт работает на полноценном сервере PostgreSQL.

---

## 🔍 Бэкапы PostgreSQL в Coolify

Coolify умеет делать **автоматические ежедневные бэкапы** PostgreSQL:
1. Откройте сервис **PostgreSQL** в Coolify.
2. Перейдите во вкладку **Backups**.
3. Включите **Automated Backups** и выберите расписание.
