-- S-08 FIX: Folio atómico via RPC para evitar race condition
-- La función increment_sequence usa SELECT FOR UPDATE para garantizar atomicidad.
-- Si el seq no existe, lo crea con current_value = 1.

CREATE OR REPLACE FUNCTION increment_sequence(seq_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_val INTEGER;
BEGIN
  -- Lock the row to prevent concurrent reads
  UPDATE sequences
  SET current_value = current_value + 1
  WHERE id = seq_id
  RETURNING current_value INTO new_val;

  -- If no row existed, create it
  IF NOT FOUND THEN
    INSERT INTO sequences (id, current_value)
    VALUES (seq_id, 1)
    ON CONFLICT (id) DO UPDATE SET current_value = sequences.current_value + 1
    RETURNING current_value INTO new_val;
  END IF;

  RETURN new_val;
END;
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION increment_sequence(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_sequence(TEXT) TO service_role;
