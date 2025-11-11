INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES
('20251018000001', 'initial_schema', ARRAY['initial schema setup']),
('20251018000002', 'license_system', ARRAY['license system']),
('20251018000003', 'usage_events', ARRAY['usage events']),
('20251018000004', 'patterns_metadata', ARRAY['patterns metadata']),
('20251018000005', 'feedback', ARRAY['feedback system']),
('20251018000006', 'realtime_connection_status', ARRAY['realtime connection']),
('20251018000007', 'credit_system', ARRAY['credit tracking system'])
ON CONFLICT (version) DO NOTHING;
