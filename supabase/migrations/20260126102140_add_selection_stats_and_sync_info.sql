/*
  # Добавление статистики выборов и информации о синхронизации

  1. Новые таблицы
    - `manager_selections` - история выборов менеджеров
      - `id` (uuid, primary key)
      - `manager_name` (text) - имя выбранного менеджера
      - `selected_at` (timestamp) - когда выбран
      - `is_successful` (boolean) - успешный ли звонок (дозвонился и перевод прошел)
      - `marked_at` (timestamp) - когда отмечен результат

    - `sync_info` - информация о синхронизации с Google Sheets
      - `id` (integer, primary key)
      - `last_sync_at` (timestamp) - последняя синхронизация
      - `managers_count` (integer) - количество менеджеров

  2. Безопасность
    - RLS включен для обеих таблиц
    - Политики для анонимного доступа (приложение без авторизации пользователей)
*/

-- Таблица выборов менеджеров
CREATE TABLE IF NOT EXISTS manager_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_name text NOT NULL,
  selected_at timestamptz DEFAULT now(),
  is_successful boolean DEFAULT NULL,
  marked_at timestamptz DEFAULT NULL
);

ALTER TABLE manager_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to insert selections"
  ON manager_selections FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon to update selections"
  ON manager_selections FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to select selections"
  ON manager_selections FOR SELECT
  TO anon
  USING (true);

-- Таблица информации о синхронизации
CREATE TABLE IF NOT EXISTS sync_info (
  id integer PRIMARY KEY DEFAULT 1,
  last_sync_at timestamptz DEFAULT now(),
  managers_count integer DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE sync_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon to read sync_info"
  ON sync_info FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to update sync_info"
  ON sync_info FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon to insert sync_info"
  ON sync_info FOR INSERT
  TO anon
  WITH CHECK (true);

-- Вставляем начальную запись
INSERT INTO sync_info (id, last_sync_at, managers_count) 
VALUES (1, now(), 0)
ON CONFLICT (id) DO NOTHING;
