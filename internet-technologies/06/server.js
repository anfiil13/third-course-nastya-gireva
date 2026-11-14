const express = require('express');
const Database = require('better-sqlite3');

const db = new Database('data.db');
db.pragma('journal_mode = WAL');

db.prepare(`
  CREATE TABLE IF NOT EXISTS books (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT    NOT NULL,
    author    TEXT    NOT NULL,
    genre     TEXT    NOT NULL,
    year      INTEGER NOT NULL,
    available INTEGER NOT NULL DEFAULT 1
  )
`).run();

const app = express();
app.use(express.json());

const toBook = (row) => row && { ...row, available: Boolean(row.available) };

const SELECT_ALL = 'SELECT id, title, author, genre, year, available FROM books';
const SELECT_ONE = 'SELECT id, title, author, genre, year, available FROM books WHERE id = ?';

function validateBookInput(body, { partial = false } = {}) {
  const errors = [];
  const has = (k) => body[k] !== undefined;

  if (!partial || has('title')) {
    if (typeof body.title !== 'string' || !body.title.trim())
      errors.push('Поле title обязательно (непустая строка)');
  }
  if (!partial || has('author')) {
    if (typeof body.author !== 'string' || !body.author.trim())
      errors.push('Поле author обязательно (непустая строка)');
  }
  if (!partial || has('genre')) {
    if (typeof body.genre !== 'string' || !body.genre.trim())
      errors.push('Поле genre обязательно (непустая строка)');
  }
  if (!partial || has('year')) {
    if (!Number.isInteger(body.year))
      errors.push('Поле year обязательно (целое число)');
  }
  if (has('available') && typeof body.available !== 'boolean') {
    errors.push('Поле available должно быть boolean');
  }
  return errors;
}


app.get('/api/info', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM books').get();
  res.json({ name: 'Books API', version: '6.0.0', entity: 'books', count });
});

app.get('/api/books', (req, res, next) => {
  try {
    const where = [];
    const params = [];
    
    if (req.query.genre !== undefined) {
      where.push('genre = ? COLLATE NOCASE');
      params.push(String(req.query.genre));
    }
    
    if (req.query.q !== undefined) {
      const q = `%${String(req.query.q)}%`;
      where.push('(title LIKE ? OR author LIKE ?)');
      params.push(q, q);
    }

    if (req.query.available !== undefined) {
      const v = String(req.query.available).toLowerCase();
      if (v !== 'true' && v !== 'false' && v !== '1' && v !== '0') {
        return res.status(400).json({ error: 'available должен быть true/false' });
      }
      where.push('available = ?');
      params.push(v === 'true' || v === '1' ? 1 : 0);
    }

    if (req.query.yearFrom !== undefined) {
      const y = Number(req.query.yearFrom);
      if (!Number.isInteger(y)) return res.status(400).json({ error: 'yearFrom должен быть целым' });
      where.push('year >= ?');
      params.push(y);
    }
    if (req.query.yearTo !== undefined) {
      const y = Number(req.query.yearTo);
      if (!Number.isInteger(y)) return res.status(400).json({ error: 'yearTo должен быть целым' });
      where.push('year <= ?');
      params.push(y);
    }

    const sql = SELECT_ALL + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY id';
    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(toBook));
  } catch (e) { next(e); }
});

app.get('/api/books/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id должен быть целым' });
    const row = db.prepare(SELECT_ONE).get(id);
    if (!row) return res.status(404).json({ error: 'Book not found' });
    res.json(toBook(row));
  } catch (e) { next(e); }
});

app.post('/api/books', (req, res, next) => {
  try {
    const body = req.body ?? {};
    const errors = validateBookInput(body);
    if (errors.length) return res.status(400).json({ error: 'Некорректные данные', details: errors });

    const title = body.title.trim();
    const author = body.author.trim();
    const genre = body.genre.trim();
    const year = body.year;
    const available = body.available === undefined ? true : body.available;

    const info = db.prepare(
      'INSERT INTO books (title, author, genre, year, available) VALUES (?, ?, ?, ?, ?)'
    ).run(title, author, genre, year, available ? 1 : 0);

    const row = db.prepare(SELECT_ONE).get(info.lastInsertRowid);
    res.status(201).json(toBook(row));
  } catch (e) { next(e); }
});

app.patch('/api/books/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id должен быть целым' });

    const current = db.prepare(SELECT_ONE).get(id);
    if (!current) return res.status(404).json({ error: 'Book not found' });

    const body = req.body ?? {};
    const errors = validateBookInput(body, { partial: true });
    if (errors.length) return res.status(400).json({ error: 'Некорректные данные', details: errors });

    const title = body.title !== undefined ? String(body.title).trim() : current.title;
    const author = body.author !== undefined ? String(body.author).trim() : current.author;
    const genre = body.genre !== undefined ? String(body.genre).trim() : current.genre;
    const year = body.year !== undefined ? body.year : current.year;
    const available = body.available !== undefined ? (body.available ? 1 : 0) : current.available;

    db.prepare(
      'UPDATE books SET title = ?, author = ?, genre = ?, year = ?, available = ? WHERE id = ?'
    ).run(title, author, genre, year, available, id);

    const row = db.prepare(SELECT_ONE).get(id);
    res.json(toBook(row));
  } catch (e) { next(e); }
});

app.delete('/api/books/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id должен быть целым' });
    const info = db.prepare('DELETE FROM books WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Book not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`Books API (SQLite) on http://localhost:${PORT}`));