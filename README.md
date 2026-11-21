# `@svedum/mcp-yandex-metrica`

MCP-сервер для [Яндекс Метрики](https://metrika.yandex.ru): счётчики, цели, отчёты по
визитам, источникам и конверсиям. Работает по stdio — в [Сведуме](https://svedum.ru),
Cursor, Claude Desktop и любом MCP-клиенте.

Форк [askads/mcp-yandex-metrica](https://github.com/askads/mcp-yandex-metrica) под схему
OAuth Сведума (файл `PLUGIN_OAUTH_CREDENTIALS_PATH`, без in-chat login и без телеметрии
Ask Ads).

## Установка

```bash
npx -y @svedum/mcp-yandex-metrica@0.1.1
```

### Внешний MCP-клиент

```json
{
  "mcpServers": {
    "yandex-metrica": {
      "command": "npx",
      "args": ["-y", "@svedum/mcp-yandex-metrica@0.1.1"],
      "env": {
        "YANDEX_METRIKA_TOKEN": "<OAuth access token, scope metrika:read>"
      }
    }
  }
}
```

Токен: [OAuth Яндекс ID](https://yandex.ru/dev/id/doc/ru/) с доступом к Метрике
(`metrika:read` или шире). Без токена сервер стартует, но инструменты данных вернут
ошибку подключения.

### Сведум

Плагин каталога подключает Яндекс через **Персонализация → Подключения**. Платформа
хранит refresh-токен и перед каждым вызовом MCP записывает во временный файл только
`access_token` (и `expiry_date`). Путь передаётся в `PLUGIN_OAUTH_CREDENTIALS_PATH`.
Переподключение — в интерфейсе Сведума, не через инструменты MCP.

## Инструменты

| Инструмент | Назначение |
|------------|------------|
| `auth_status` | Статус токена (без сети) |
| `list_counters` | Список счётчиков |
| `list_goals` | Цели счётчика |
| `get_statistics` | Отчёт Stat API |
| `raw_request` | Произвольный запрос к API Метрики (POST/DELETE — с `confirmWrite`) |

Инструменты `start_login`, `finish_login` и `logout` из upstream **удалены** — вход только
через Сведум или `YANDEX_METRIKA_TOKEN`.

Специализированные инструменты — только чтение; запись возможна только через
`raw_request` с явным подтверждением.

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `YANDEX_METRIKA_TOKEN` | OAuth access token (внешние клиенты) |
| `PLUGIN_OAUTH_CREDENTIALS_PATH` | JSON с `access_token` / `expiry_date` (Сведум) |
| `YANDEX_METRIKA_COUNTER_ID` | Счётчик по умолчанию |
| `YANDEX_METRIKA_LANG` | Язык подписей (`ru` по умолчанию) |

## Разработка

```bash
npm install
npm run build
npm start
```

## Происхождение и лицензия

Исходный код и идея инструментов — [askads/mcp-yandex-metrica](https://github.com/askads/mcp-yandex-metrica),
автор Aleksandr Kovalko, лицензия **MIT** (см. [LICENSE](./LICENSE)).

Доработка OAuth и публикация `@svedum/*` — [Svedum](https://svedum.ru), MIT.