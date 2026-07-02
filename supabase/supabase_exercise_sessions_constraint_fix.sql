-- Fix exercise_type constraint for exercise_sessions table
-- This script updates the constraint to match the values used in the application

-- Step 1: Drop the existing constraint if it exists
ALTER TABLE exercise_sessions 
DROP CONSTRAINT IF EXISTS exercise_sessions_exercise_type_check;

-- Step 2: Check what values currently exist in the table (for debugging)
-- Uncomment the next line to see current values:
-- SELECT DISTINCT exercise_type FROM exercise_sessions ORDER BY exercise_type;

-- Step 3: Update any invalid values to 'other' to prevent constraint violations
-- This maps common variations to valid values or sets them to 'other'
UPDATE exercise_sessions
SET exercise_type = CASE
  WHEN exercise_type IN ('walk', 'walking') THEN 'walk'
  WHEN exercise_type IN ('run', 'running', 'jogging') THEN 'run'
  WHEN exercise_type IN ('play', 'playing') THEN 'play'
  WHEN exercise_type IN ('swimming') THEN 'swimming'
  WHEN exercise_type IN ('agility') THEN 'agility'
  WHEN exercise_type IN ('training', 'workout', 'exercise') THEN 'training'
  WHEN exercise_type IN ('fetch') THEN 'fetch'
  WHEN exercise_type IN ('hiking') THEN 'hiking'
  WHEN exercise_type IN ('tug') THEN 'tug'
  WHEN exercise_type IN ('hide') THEN 'hide'
  WHEN exercise_type IN ('obstacle') THEN 'obstacle'
  WHEN exercise_type IN ('walk', 'run', 'play', 'swimming', 'agility', 'training', 'fetch', 'hiking', 'tug', 'hide', 'obstacle', 'other') THEN exercise_type
  ELSE 'other'  -- Set any unrecognized values to 'other'
END
WHERE exercise_type NOT IN ('walk', 'run', 'play', 'swimming', 'agility', 'training', 'fetch', 'hiking', 'tug', 'hide', 'obstacle', 'other')
   OR exercise_type IS NULL;

-- Step 4: Create the new constraint with all the exercise types used in the application
ALTER TABLE exercise_sessions
ADD CONSTRAINT exercise_sessions_exercise_type_check 
CHECK (exercise_type IN (
  'walk',           -- Caminata
  'run',            -- Carrera
  'play',           -- Juego
  'swimming',       -- Natación
  'agility',        -- Agilidad
  'training',       -- Entrenamiento
  'fetch',          -- Buscar Pelota
  'hiking',         -- Senderismo
  'tug',            -- Tirar de la Cuerda
  'hide',           -- Buscar y Encontrar
  'obstacle',       -- Carrera de Obstáculos
  'other'           -- Otro
));

-- Step 5: Verify the constraint was created successfully
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'exercise_sessions'::regclass
  AND conname = 'exercise_sessions_exercise_type_check';

-- Step 6: Verify all values in the table are now valid
SELECT DISTINCT exercise_type 
FROM exercise_sessions 
ORDER BY exercise_type;

