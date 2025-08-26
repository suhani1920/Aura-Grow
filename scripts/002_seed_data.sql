-- Insert sample users (this will be handled by auth trigger in production)
-- Note: These are just for development/testing

-- Insert sample sensors
INSERT INTO public.sensors (id, user_id, name, type, location_lat, location_lng, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', auth.uid(), 'Field A - Soil Moisture', 'soil_moisture', 40.7128, -74.0060, 'active'),
  ('550e8400-e29b-41d4-a716-446655440002', auth.uid(), 'Field A - Temperature', 'temperature', 40.7129, -74.0061, 'active'),
  ('550e8400-e29b-41d4-a716-446655440003', auth.uid(), 'Field B - pH Sensor', 'ph', 40.7130, -74.0062, 'active'),
  ('550e8400-e29b-41d4-a716-446655440004', auth.uid(), 'Greenhouse - Humidity', 'humidity', 40.7131, -74.0063, 'active'),
  ('550e8400-e29b-41d4-a716-446655440005', auth.uid(), 'Field C - Light Sensor', 'light', 40.7132, -74.0064, 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample sensor readings
INSERT INTO public.sensor_readings (sensor_id, value, unit, timestamp) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 45.2, '%', NOW() - INTERVAL '1 hour'),
  ('550e8400-e29b-41d4-a716-446655440001', 42.8, '%', NOW() - INTERVAL '2 hours'),
  ('550e8400-e29b-41d4-a716-446655440001', 38.5, '%', NOW() - INTERVAL '3 hours'),
  ('550e8400-e29b-41d4-a716-446655440002', 24.5, '°C', NOW() - INTERVAL '1 hour'),
  ('550e8400-e29b-41d4-a716-446655440002', 23.8, '°C', NOW() - INTERVAL '2 hours'),
  ('550e8400-e29b-41d4-a716-446655440003', 6.8, 'pH', NOW() - INTERVAL '1 hour'),
  ('550e8400-e29b-41d4-a716-446655440004', 65.2, '%', NOW() - INTERVAL '1 hour'),
  ('550e8400-e29b-41d4-a716-446655440005', 850, 'lux', NOW() - INTERVAL '1 hour');

-- Insert sample water tanks
INSERT INTO public.water_tanks (id, user_id, name, capacity, current_level, location_lat, location_lng, status) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', auth.uid(), 'Main Water Tank', 5000.00, 3200.00, 40.7133, -74.0065, 'active'),
  ('660e8400-e29b-41d4-a716-446655440002', auth.uid(), 'Secondary Tank', 2000.00, 1800.00, 40.7134, -74.0066, 'active')
ON CONFLICT (id) DO NOTHING;

-- Insert sample AI recommendations
INSERT INTO public.ai_recommendations (user_id, sensor_id, recommendation_type, message, confidence_score, status) VALUES
  (auth.uid(), '550e8400-e29b-41d4-a716-446655440001', 'irrigation', 'Soil moisture is below optimal level. Consider irrigation for 15 minutes.', 0.85, 'pending'),
  (auth.uid(), '550e8400-e29b-41d4-a716-446655440003', 'fertilization', 'pH level is slightly acidic. Consider lime application to balance soil pH.', 0.72, 'pending');
