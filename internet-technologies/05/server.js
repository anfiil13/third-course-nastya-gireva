const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const books = [
  { id: 1, title: 'Мастер и Маргарита', author: 'Михаил Булгаков', genre: 'роман', year: 1967, available: true },
  { id: 2, title: 'Преступление и наказание', author: 'Фёдор Достоевский', genre: 'роман', year: 1866, available: false },
  { id: 3, title: 'Пикник на обочине', author: 'Аркадий и Борис Стругацкие', genre: 'фантастика', year: 1972, available: true },
  { id: 4, title: 'Трудно быть богом', author: 'Аркадий и Борис Стругацкие', genre: 'фантастика', year: 1964, available: true },
  { id: 5, title: 'Собачье сердце', author: 'Михаил Булгаков', genre: 'повесть', year: 1987, available: false },
  { id: 6, title: 'Чистый код', author: 'Роберт Мартин', genre: 'программирование', year: 2008, available: true },
  { id: 7, title: 'Грокаем алгоритмы', author: 'Адитья Бхаргава', genre: 'программирование', year: 2016, available: true }
];

let nextId = books.length + 1;

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Books API',
    version: '1.0.0',
    count: books.length
  });
});

app.get('/api/books', (req, res) => {
  const { genre, author, available, yearFrom, yearTo } = req.query;
  let result = books;

  if (genre) {
    result = result.filter(b => b.genre.toLowerCase() === genre.toLowerCase());
  }
  if (author) {
    result = result.filter(b => b.author.toLowerCase().includes(author.toLowerCase()));
  }
  if (available !== undefined) {
    if (available !== 'true' && available !== 'false') {
      return res.status(400).json({ error: 'Параметр available должен быть true или false' });
    }
    result = result.filter(b => b.available === (available === 'true'));
  }
  if (yearFrom !== undefined) {
    const from = Number(yearFrom);
    if (!Number.isInteger(from)) {
      return res.status(400).json({ error: 'Параметр yearFrom должен быть целым числом' });
    }
    result = result.filter(b => b.year >= from);
  }
  if (yearTo !== undefined) {
    const to = Number(yearTo);
    if (!Number.isInteger(to)) {
      return res.status(400).json({ error: 'Параметр yearTo должен быть целым числом' });
    }
    result = result.filter(b => b.year <= to);
  }

  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: `Книга с id=${req.params.id} не найдена` });
  }
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, genre, year, available } = req.body || {};
  const errors = [];

  if (typeof title !== 'string' || title.trim() === '') {
    errors.push('Поле title обязательно (непустая строка)');
  }
  if (typeof author !== 'string' || author.trim() === '') {
    errors.push('Поле author обязательно (непустая строка)');
  }
  if (typeof genre !== 'string' || genre.trim() === '') {
    errors.push('Поле genre обязательно (непустая строка)');
  }
  if (!Number.isInteger(year)) {
    errors.push('Поле year обязательно (целое число)');
  }
  if (available !== undefined && typeof available !== 'boolean') {
    errors.push('Поле available должно быть true или false');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Некорректные данные', details: errors });
  }

  const book = {
    id: nextId++,
    title: title.trim(),
    author: author.trim(),
    genre: genre.trim().toLowerCase(),
    year,
    available: available ?? true
  };
  books.push(book);

  res.status(201).json(book);
});

app.use((req, res) => {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.originalUrl} не найден` });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Тело запроса не является корректным JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
