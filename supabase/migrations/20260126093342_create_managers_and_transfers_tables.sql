/*
  # Создание таблиц для системы рандомайзера менеджеров

  ## Новые таблицы
  
  ### `managers`
  Хранит информацию о менеджерах:
  - `id` (uuid, primary key) - уникальный идентификатор
  - `name` (text) - имя менеджера
  - `is_present` (boolean) - статус явки (Да/Нет)
  - `position` (text) - должность (из столбца B)
  - `created_at` (timestamp) - дата создания записи
  - `updated_at` (timestamp) - дата последнего обновления

  ### `transfers`
  Хранит историю всех переводов:
  - `id` (uuid, primary key) - уникальный идентификатор
  - `manager_id` (uuid) - ссылка на менеджера
  - `operator_name` (text) - имя оператора, который сделал перевод
  - `is_successful` (boolean) - успешный ли был перевод (дозвон)
  - `created_at` (timestamp) - дата и время перевода
  
  ## Безопасность
  - Включен RLS для обеих таблиц
  - Публичный доступ на чтение и запись (так как у нас нет аутентификации, но система должна работать для всех операторов)
*/

-- Создание таблицы менеджеров
CREATE TABLE IF NOT EXISTS managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_present boolean DEFAULT false,
  position text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создание таблицы переводов
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES managers(id) ON DELETE CASCADE,
  operator_name text NOT NULL,
  is_successful boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы managers
CREATE POLICY "Все могут читать менеджеров"
  ON managers FOR SELECT
  USING (true);

CREATE POLICY "Все могут добавлять менеджеров"
  ON managers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Все могут обновлять менеджеров"
  ON managers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Все могут удалять менеджеров"
  ON managers FOR DELETE
  USING (true);

-- Политики для таблицы transfers
CREATE POLICY "Все могут читать переводы"
  ON transfers FOR SELECT
  USING (true);

CREATE POLICY "Все могут добавлять переводы"
  ON transfers FOR INSERT
  WITH CHECK (true);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_managers_is_present ON managers(is_present);
CREATE INDEX IF NOT EXISTS idx_transfers_manager_id ON transfers(manager_id);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_transfers_is_successful ON transfers(is_successful);
