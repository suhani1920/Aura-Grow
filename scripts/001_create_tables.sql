-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sensors table
CREATE TABLE IF NOT EXISTS public.sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('soil_moisture', 'temperature', 'humidity', 'ph', 'light')),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sensor_readings table
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID NOT NULL REFERENCES public.sensors(id) ON DELETE CASCADE,
  value DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create water_tanks table
CREATE TABLE IF NOT EXISTS public.water_tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity DECIMAL(10, 2) NOT NULL,
  current_level DECIMAL(10, 2) DEFAULT 0,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create irrigation_logs table
CREATE TABLE IF NOT EXISTS public.irrigation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sensor_id UUID REFERENCES public.sensors(id),
  water_tank_id UUID REFERENCES public.water_tanks(id),
  duration_minutes INTEGER NOT NULL,
  water_amount DECIMAL(10, 2),
  trigger_type TEXT CHECK (trigger_type IN ('manual', 'scheduled', 'sensor_triggered', 'ai_recommended')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_recommendations table
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sensor_id UUID REFERENCES public.sensors(id),
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('irrigation', 'fertilization', 'pest_control', 'harvest')),
  message TEXT NOT NULL,
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_delete_own" ON public.users FOR DELETE USING (auth.uid() = id);

-- Create RLS policies for sensors table
CREATE POLICY "sensors_select_own" ON public.sensors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sensors_insert_own" ON public.sensors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sensors_update_own" ON public.sensors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sensors_delete_own" ON public.sensors FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for sensor_readings table
CREATE POLICY "sensor_readings_select_own" ON public.sensor_readings 
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.sensors WHERE id = sensor_id));
CREATE POLICY "sensor_readings_insert_own" ON public.sensor_readings 
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.sensors WHERE id = sensor_id));

-- Create RLS policies for water_tanks table
CREATE POLICY "water_tanks_select_own" ON public.water_tanks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "water_tanks_insert_own" ON public.water_tanks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "water_tanks_update_own" ON public.water_tanks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "water_tanks_delete_own" ON public.water_tanks FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for irrigation_logs table
CREATE POLICY "irrigation_logs_select_own" ON public.irrigation_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "irrigation_logs_insert_own" ON public.irrigation_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for ai_recommendations table
CREATE POLICY "ai_recommendations_select_own" ON public.ai_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_recommendations_insert_own" ON public.ai_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_recommendations_update_own" ON public.ai_recommendations FOR UPDATE USING (auth.uid() = user_id);
