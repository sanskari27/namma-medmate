-- Align gst_percent with Hibernate integer mapping
ALTER TABLE expense
    ALTER COLUMN gst_percent TYPE INTEGER USING gst_percent::integer;
