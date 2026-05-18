CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  muscle_group VARCHAR(50) NOT NULL,
  description TEXT,
  required_rest_days INTEGER NOT NULL DEFAULT 5,
  gif_url TEXT,
  image_url TEXT,
  equipment VARCHAR(50),
  is_custom BOOLEAN DEFAULT FALSE,
  level VARCHAR(20),
  force VARCHAR(20),
  mechanic VARCHAR(20),
  secondary_muscles TEXT[],
  instructions TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id SERIAL PRIMARY KEY,
  session_date DATE NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2) NOT NULL,
  reps INTEGER NOT NULL,
  reached_failure BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);