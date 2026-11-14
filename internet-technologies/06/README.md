# ПР6. REST API каталога книг на Express + SQLite

## Установка и запуск

```bash
cd internet-technologies/06
npm install            # express + better-sqlite3
npm start              # http://localhost:3000
```

Порт: `PORT`, по умолчанию `3000`.
Если `npm install better-sqlite3` падает на нативной сборке:

```
npm install --build-from-source better-sqlite3
```

## Схема таблицы

```
CREATE TABLE IF NOT EXISTS books (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT    NOT NULL,
  author    TEXT    NOT NULL,
  genre     TEXT    NOT NULL,
  year      INTEGER NOT NULL,
  available INTEGER NOT NULL DEFAULT 1   -- 0/1, наружу — boolean
);
```

Таблица создаётся автоматически при старте `server.js`.

## Маршруты

| Метод | URL | SQL | Успешный код | Ошибки |
|---|---|---|---|---|
| GET | `/api/info` | `SELECT COUNT(*) FROM books` | 200 | 500 |
| GET | `/api/books` | `SELECT … FROM books WHERE …` | 200 | 400, 500 |
| GET | `/api/books/:id` | `SELECT … FROM books WHERE id = ?` | 200 | 400, 404 |
| POST | `/api/books` | `INSERT INTO books … VALUES (?,…,?)` | 201 | 400, 500 |
| PATCH | `/api/books/:id` | `UPDATE books SET … WHERE id = ?` | 200 | 400, 404 |
| DELETE | `/api/books/:id` | `DELETE FROM books WHERE id = ?` | 204 | 400, 404 |
| * | любой другой | — | — | 404 |

## Query-параметры `GET /api/books`

Все фильтры выполняются **в SQL** через `WHERE` (параметризованно).

| Параметр ↕▾ | Пример ↕▾ | SQL-фрагмент ↕▾ |
|---|---|---|
| −`genre` | `genre=фантастика` | `genre = ? COLLATE NOCASE` |
| −`q` | `q=булгаков` | `(title LIKE ? OR author LIKE ?)` |
| `available` | `available=true` | `available = ?` |
| `yearFrom` | `yearFrom=2000` | `year >= ?` |
| `yearTo` | `yearTo=2020` | `year <= ?` |
⚙

Фильтры комбинируются через `AND`.

## Правила валидации

**POST** — обязательны:

- `title`, `author`, `genre` — непустые строки;
- `year` — целое число;
- `available` — boolean (необязательно, по умолчанию `true`).

**PATCH** — частичное обновление: проверяются только переданные поля.
Пустое обязательное поле или неверный тип → `400`.

Все значения клиента передаются в SQL **только** через `?` (prepared statements).

## Примеры

### POST

```
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Улитка на склоне","author":"Стругацкие","genre":"фантастика","year":1966}'
```

`201 Created`:

```
{"id":1,"title":"Улитка на склоне","author":"Стругацкие","genre":"фантастика","year":1966,"available":true}
```

### PATCH

```
curl -X PATCH http://localhost:3000/api/books/1 \
  -H "Content-Type: application/json" \
  -d '{"available":false}'
```

`200 OK`: та же книга, но `"available": false`.

### DELETE

```
curl -i -X DELETE http://localhost:3000/api/books/1
# HTTP/1.1 204 No Content
```

### Фильтры

```
curl "http://localhost:3000/api/books?genre=%D1%84%D0%B0%D0%BD%D1%82%D0%B0%D1%81%D1%82%D0%B8%D0%BA%D0%B0"
curl "http://localhost:3000/api/books?q=%D0%B1%D1%83%D0%BB%D0%B3%D0%B0%D0%BA%D0%BE%D0%B2"
curl "http://localhost:3000/api/books?available=true&yearFrom=2000&yearTo=2020"
```

## Ошибочные случаи

| Запрос | Ожидаемо |
|---|---|
| `GET /api/books/999` | 404 |
| `POST /api/books` без `author` | 400 |
| `PATCH /api/books/999` | 404 |
| `DELETE /api/books/999` | 404 |
| `GET /api/unknown` | 404 |
| `GET /api/books?available=maybe` | 400 |

## Проверка сохранения после перезапуска (Часть 6)

1. `npm start` → сервер поднят.
2. `POST /api/books` → создана книга с `id = N`. Записать `id`.
3. `GET /api/books/N` → 200, книга на месте.
4. `Ctrl+C` — остановить сервер.
5. `npm start` — запустить заново.
6. `GET /api/books/N` → **200, та же книга**.

Результат:  данные сохраняются в `data.db`.

</BDS:create_file>

<BDS:create_file fileName="06/.gitignore">

```gitignore
node_modules/
data.db
data.db-shm
data.db-wal

