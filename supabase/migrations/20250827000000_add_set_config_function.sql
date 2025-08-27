-- Add set_config function for Row Level Security
CREATE OR REPLACE FUNCTION public.set_config(setting_name text, setting_value text)
RETURNS text AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;