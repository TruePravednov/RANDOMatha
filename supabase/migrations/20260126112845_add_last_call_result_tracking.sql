/*
  # Добавление отслеживания результата последнего звонка

  1. Изменения
    - Добавлена колонка `last_call_successful` в таблицу `managers`
      - Хранит результат последнего звонка (true - дозвон, false - недозвон)
      - NULL означает что звонков еще не было
    - Это позволит реализовать систему приоритетов при выборе менеджеров:
      * Приоритет 1: Менеджеры без звонков (last_call_successful IS NULL)
      * Приоритет 2: Менеджеры с недозвоном (last_call_successful = false)
      * Приоритет 3: Менеджеры с дозвоном (last_call_successful = true)
*/

-- Добавляем колонку для отслеживания последнего результата звонка
ALTER TABLE managers 
ADD COLUMN IF NOT EXISTS last_call_successful boolean DEFAULT NULL;