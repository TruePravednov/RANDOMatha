/*
  # Добавление системы очереди для рандомайзера

  ## Изменения
  
  1. Добавляем поля в таблицу managers:
    - `selection_count_today` (integer) - количество выборов сегодня
    - `last_reset_date` (date) - дата последнего сброса счетчика
    
  2. Логика работы:
    - При выборе менеджера выбирается случайный из тех, у кого минимальный selection_count_today
    - После отметки результата selection_count_today увеличивается
    - Каждый день в 6:00 МСК счетчики сбрасываются
*/

-- Добавляем поля для отслеживания очереди
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'managers' AND column_name = 'selection_count_today'
  ) THEN
    ALTER TABLE managers ADD COLUMN selection_count_today integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'managers' AND column_name = 'last_reset_date'
  ) THEN
    ALTER TABLE managers ADD COLUMN last_reset_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;