INSERT INTO appointments
(id, customer_id, vehicle_id, dealer_id, appointment_date, service_type, status, estimated_cost)
VALUES
    (
        '10000000-0000-4000-8000-000000000001',
        'b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043',
        '11111111-1111-4111-8111-111111111111',
        'a1b2c3d4-e5f6-4789-a012-3456789abcde',
        '2026-09-18 10:00:00',
        'REGULAR_SERVICE',
        'REQUESTED',
        8500
    ),
    (
        '10000000-0000-4000-8000-000000000002',
        '4e91a7c3-8b26-45d0-a9f4-6c3b2e7158ad',
        '22222222-2222-4222-8222-222222222222',
        'a1b2c3d4-e5f6-4789-a012-3456789abcde',
        '2026-09-19 11:30:00',
        'OIL_CHANGE',
        'CONFIRMED',
        6500
    ),
    (
        '10000000-0000-4000-8000-000000000003',
        'd2f8b461-7a35-4c90-b1e6-9d4a2f5837ce',
        '33333333-3333-4333-8333-333333333333',
        'b2c3d4e5-f6a7-4890-b123-456789abcdef',
        '2026-09-20 09:00:00',
        'BRAKE_SERVICE',
        'REQUESTED',
        12000
    ),
    (
        '10000000-0000-4000-8000-000000000004',
        '6a3e9d72-c518-4f04-b826-1d7c5a9e34bf',
        '44444444-4444-4444-8444-444444444444',
        'b2c3d4e5-f6a7-4890-b123-456789abcdef',
        '2026-09-21 14:00:00',
        'FULL_SERVICE',
        'CONFIRMED',
        32000
    ),
    (
        '10000000-0000-4000-8000-000000000005',
        'b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043',
        '55555555-5555-4555-8555-555555555555',
        'c3d4e5f6-a7b8-4901-c234-56789abcdef0',
        '2026-09-22 10:30:00',
        'AC_SERVICE',
        'IN_PROGRESS',
        7500
    ),
    (
        '10000000-0000-4000-8000-000000000006',
        '4e91a7c3-8b26-45d0-a9f4-6c3b2e7158ad',
        '66666666-6666-4666-8666-666666666666',
        'c3d4e5f6-a7b8-4901-c234-56789abcdef0',
        '2026-09-23 15:00:00',
        'ENGINE_SERVICE',
        'COMPLETED',
        24000
    ),
    (
        '10000000-0000-4000-8000-000000000007',
        'd2f8b461-7a35-4c90-b1e6-9d4a2f5837ce',
        '77777777-7777-4777-8777-777777777777',
        'd4e5f6a7-b8c9-4012-d345-6789abcdef01',
        '2026-09-24 11:00:00',
        'TYRE_SERVICE',
        'REQUESTED',
        4500
    ),
    (
        '10000000-0000-4000-8000-000000000008',
        '6a3e9d72-c518-4f04-b826-1d7c5a9e34bf',
        '88888888-8888-4888-8888-888888888888',
        'd4e5f6a7-b8c9-4012-d345-6789abcdef01',
        '2026-09-25 13:30:00',
        'BRAKE_SERVICE',
        'CANCELLED',
        12000
    ),
    (
        '10000000-0000-4000-8000-000000000009',
        'b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043',
        '99999999-9999-4999-8999-999999999999',
        'e5f6a7b8-c9d0-4123-e456-789abcdef012',
        '2026-09-26 10:00:00',
        'REGULAR_SERVICE',
        'CONFIRMED',
        8500
    ),
    (
        '10000000-0000-4000-8000-000000000010',
        '4e91a7c3-8b26-45d0-a9f4-6c3b2e7158ad',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'e5f6a7b8-c9d0-4123-e456-789abcdef012',
        '2026-09-27 16:00:00',
        'FULL_SERVICE',
        'COMPLETED',
        32000
    )
    ON CONFLICT (id) DO NOTHING;

-- The bookable services.
--
-- These are the codes that already appear in appointments.service_type, promoted
-- from a free-text column to rows. GET /api/appointments/service-types reads them
-- and PATCH /api/appointments/{id}/service-type validates against them, so the
-- options the booking form shows and the values the API accepts are one list.
INSERT INTO service_types (code, label, description, active)
VALUES
    ('REGULAR_SERVICE', 'Regular Service', 'Routine maintenance to the manufacturer schedule.', TRUE),
    ('OIL_CHANGE', 'Oil Change', 'Engine oil and oil filter replacement.', TRUE),
    ('BRAKE_SERVICE', 'Brake Service', 'Brake pads, discs and fluid inspection.', TRUE),
    ('FULL_SERVICE', 'Full Service', 'Combined scheduled maintenance across systems.', TRUE),
    ('AC_SERVICE', 'AC Service', 'Air conditioning service and refrigerant check.', TRUE),
    ('ENGINE_SERVICE', 'Engine Service', 'Engine diagnosis and repair.', TRUE),
    ('TYRE_SERVICE', 'Tyre Service', 'Tyre inspection, repair and replacement.', TRUE)
    ON CONFLICT (code) DO NOTHING;

-- The quoted figure was added after these rows were first seeded, and the
-- insert above does nothing when a row already exists. Backfilling here keeps
-- the Est. Cost column populated on an existing database, rather than inventing
-- a figure at render time.
UPDATE appointments AS a
SET estimated_cost = v.estimated_cost
FROM (VALUES
        ('10000000-0000-4000-8000-000000000001', 8500),
        ('10000000-0000-4000-8000-000000000002', 6500),
        ('10000000-0000-4000-8000-000000000003', 12000),
        ('10000000-0000-4000-8000-000000000004', 32000),
        ('10000000-0000-4000-8000-000000000005', 7500),
        ('10000000-0000-4000-8000-000000000006', 24000),
        ('10000000-0000-4000-8000-000000000007', 4500),
        ('10000000-0000-4000-8000-000000000008', 12000),
        ('10000000-0000-4000-8000-000000000009', 8500),
        ('10000000-0000-4000-8000-000000000010', 32000)
     ) AS v(id, estimated_cost)
WHERE a.id = v.id::uuid
  AND a.estimated_cost IS NULL;
