INSERT INTO customers
(id, user_id, name, email, phone, created_at)
VALUES
    (
        'b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043',
        '6683e0c9-cf0e-4963-acae-12020540b8ba',
        'Customer1',
        'customer1@bmwtechworks.com',
        '9876543210',
        '2026-09-01 08:30:00'
    ),
    (
        '4e91a7c3-8b26-45d0-a9f4-6c3b2e7158ad',
        '27aee71f-5655-40c5-a7e8-1bf2ec5752bc',
        'Customer2',
        'customer2@bmwtechworks.com',
        '9876543211',
        '2026-09-02 09:00:00'
    ),
    (
        'd2f8b461-7a35-4c90-b1e6-9d4a2f5837ce',
        'ddc6ca6e-9eeb-40a0-ad9f-0df5324072f6',
        'Customer3',
        'customer3@bmwtechworks.com',
        '9876543212',
        '2026-09-03 08:45:00'
    ),
    (
        '6a3e9d72-c518-4f04-b826-1d7c5a9e34bf',
        'c1928824-b7a1-4c0a-88dc-89f77f141f03',
        'Customer4',
        'customer4@bmwtechworks.com',
        '9876543213',
        '2026-09-04 11:10:00'
    )
    ON CONFLICT (id) DO NOTHING;


-- Scoped to the four seeded customers on purpose. This file runs on every
-- start (spring.sql.init.mode=always), so an unscoped DELETE FROM
-- customers_address would erase the address of every account that entered one
-- through the API, and the onboarding form is where those come from. Only the
-- rows this file is about to re-insert are cleared, so re-seeding stays
-- idempotent without touching anything a user typed.
DELETE FROM customers_address
WHERE customers_id IN (
    'b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043',
    '4e91a7c3-8b26-45d0-a9f4-6c3b2e7158ad',
    'd2f8b461-7a35-4c90-b1e6-9d4a2f5837ce',
    '6a3e9d72-c518-4f04-b826-1d7c5a9e34bf'
);


INSERT INTO customers_address
(customers_id, address)
VALUES
    ('b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043', 'Chennai, Tamil Nadu'),
    ('b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043', 'India'),

    ('4e91a7c3-8b26-45d0-a9f4-6c3b2e7158ad', 'Bangalore, Karnataka'),
    ('4e91a7c3-8b26-45d0-a9f4-6c3b2e7158ad', 'India'),

    ('d2f8b461-7a35-4c90-b1e6-9d4a2f5837ce', 'Hyderabad, Telangana'),
    ('d2f8b461-7a35-4c90-b1e6-9d4a2f5837ce', 'India'),

    ('6a3e9d72-c518-4f04-b826-1d7c5a9e34bf', 'Mumbai, Maharashtra'),
    ('6a3e9d72-c518-4f04-b826-1d7c5a9e34bf', 'India');

-- The join date was added after these rows were first seeded, and the insert
-- above does nothing when a row already exists. Backfilling keeps the "Joined"
-- column populated on an existing database rather than showing a blank. Rows
-- that already carry a date are left alone, so this never overwrites a real
-- value with a seeded one.
UPDATE customers AS c
SET created_at = v.created_at
FROM (VALUES
        ('b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043', '2026-09-01 08:30:00'::timestamp),
        ('4e91a7c3-8b26-45d0-a9f4-6c3b2e7158ad', '2026-09-02 09:00:00'::timestamp),
        ('d2f8b461-7a35-4c90-b1e6-9d4a2f5837ce', '2026-09-03 08:45:00'::timestamp),
        ('6a3e9d72-c518-4f04-b826-1d7c5a9e34bf', '2026-09-04 11:10:00'::timestamp)
     ) AS v(id, created_at)
WHERE c.id = v.id::uuid
  AND c.created_at IS NULL;
