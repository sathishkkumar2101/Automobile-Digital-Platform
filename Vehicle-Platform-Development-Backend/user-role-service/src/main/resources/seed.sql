INSERT INTO roles (id, name, description)
VALUES
    ('00c22be3-7bdf-4bb7-ab4a-0fb77d2fe83f', 'DEALER',
     'Runs a dealership: manages its own inventory, the orders placed with it and the customers who bought from it.'),

    ('68d5fcf1-7d3d-4132-80bc-942e5439eda1', 'ADMIN',
     'Full access to the platform, including users, roles, dealers and every other module.'),

    ('eed8c871-b3ac-4e13-9241-f82c7c16f78a', 'TEST_ADMIN',
     'Placeholder left over from permission testing. Not used by any account.'),

    ('d1c0685b-f176-4f2a-b98b-216a72c7fa27', 'TEST_ADMIN1',
     'Placeholder left over from permission testing. Not used by any account.'),

    ('90c03be2-40f6-4006-94d9-6275c2f80824', 'GATEWAY_TEST_ROLE',
     'Placeholder left over from gateway authorisation testing. Not used by any account.'),

    ('f2f947ac-465b-4ec2-9c59-3d1f3a0e75f2', 'CUSTOMER',
     'Buys a vehicle, tracks the order from confirmation to delivery, and books servicing once the car is theirs.')

    ON CONFLICT (id) DO NOTHING;

-- The description was added after these rows were first seeded, and the insert
-- above does nothing when a row already exists, so existing rows would show a
-- blank description on the roles screen.
UPDATE roles
SET description = v.description
FROM (VALUES
        ('00c22be3-7bdf-4bb7-ab4a-0fb77d2fe83f', 'Runs a dealership: manages its own inventory, the orders placed with it and the customers who bought from it.'),
        ('68d5fcf1-7d3d-4132-80bc-942e5439eda1', 'Full access to the platform, including users, roles, dealers and every other module.'),
        ('eed8c871-b3ac-4e13-9241-f82c7c16f78a', 'Placeholder left over from permission testing. Not used by any account.'),
        ('d1c0685b-f176-4f2a-b98b-216a72c7fa27', 'Placeholder left over from permission testing. Not used by any account.'),
        ('90c03be2-40f6-4006-94d9-6275c2f80824', 'Placeholder left over from gateway authorisation testing. Not used by any account.'),
        ('f2f947ac-465b-4ec2-9c59-3d1f3a0e75f2', 'Buys a vehicle, tracks the order from confirmation to delivery, and books servicing once the car is theirs.')
     ) AS v(id, description)
WHERE roles.id = v.id::uuid
  AND roles.description IS NULL;

-- 2. ROLE → PERMISSION MAPPINGS

-- DEALER
INSERT INTO role_permissions (role_id, permission_id)
VALUES
    (
        '00c22be3-7bdf-4bb7-ab4a-0fb77d2fe83f',
        '39a83850-b8aa-4673-a7df-48a798f12cde'
    ),
    (
        '00c22be3-7bdf-4bb7-ab4a-0fb77d2fe83f',
        '3c8ca579-4bec-4a27-8af1-b48cf783ab3f'
    )
    ON CONFLICT DO NOTHING;


-- ADMIN
INSERT INTO role_permissions (role_id, permission_id)
VALUES
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        'e3d354e3-dee0-44e0-9a89-877fbd4ef5ec'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        'a2a4d5d5-a826-4fe2-af33-b6af07d15cb1'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        'aecfeff2-3f90-4cf7-bc07-443d809cf3f0'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        'f4e0c2cf-6c7c-40d8-906a-6353fdff7be3'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        'cdab04e3-d1da-4422-98c2-467eb1ee9a6d'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        '3e37d807-6f79-4482-a20c-dc746c7babe7'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        'e8509e1e-f6b6-48b3-b688-9515012b69a9'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        'c9aff296-6745-4091-ad98-418f2549dae6'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        '39a83850-b8aa-4673-a7df-48a798f12cde'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        'ccf3fbc6-8b5d-493b-9c71-1d36355fec53'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        '1060fcac-dff4-46cc-ab17-3fa97d4734d0'
    ),
    (
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1',
        '3c8ca579-4bec-4a27-8af1-b48cf783ab3f'
    )
    ON CONFLICT DO NOTHING;


-- TEST_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
VALUES
    (
        'eed8c871-b3ac-4e13-9241-f82c7c16f78a',
        '3c8ca579-4bec-4a27-8af1-b48cf783ab3f'
    )
    ON CONFLICT DO NOTHING;


-- TEST_ADMIN1
INSERT INTO role_permissions (role_id, permission_id)
VALUES
    (
        'd1c0685b-f176-4f2a-b98b-216a72c7fa27',
        '3c8ca579-4bec-4a27-8af1-b48cf783ab3f'
    )
    ON CONFLICT DO NOTHING;


-- GATEWAY_TEST_ROLE
INSERT INTO role_permissions (role_id, permission_id)
VALUES
    (
        '90c03be2-40f6-4006-94d9-6275c2f80824',
        '3c8ca579-4bec-4a27-8af1-b48cf783ab3f'
    )
    ON CONFLICT DO NOTHING;


-- CUSTOMER
INSERT INTO role_permissions (role_id, permission_id)
VALUES
    (
        'f2f947ac-465b-4ec2-9c59-3d1f3a0e75f2',
        '3c8ca579-4bec-4a27-8af1-b48cf783ab3f'
    )
    ON CONFLICT DO NOTHING;

INSERT INTO users
(id, username, name, email, password, role_id)
VALUES
    (
        'f0da20b4-bcd6-4947-96ff-fa2070bfd33c',
        'admin',
        'Admin',
        'admin@bmwtechworks.com',
          '$2b$10$2m1nrNuT/DJBhiYYcTebC.7Vn7WM0cWDxchSEGCa7MaJZdXkJCyEG',
        '68d5fcf1-7d3d-4132-80bc-942e5439eda1'
    ),

    (
        '6683e0c9-cf0e-4963-acae-12020540b8ba',
        'customer1',
        'Customer1',
        'customer1@bmwtechworks.com',
          '$2a$10$4GsNO91pHexPO9.fJsajJ.KsnTrFxwMjvKgfVLvAc8q2GdSeOKPdO',
        'f2f947ac-465b-4ec2-9c59-3d1f3a0e75f2'
    ),

    (
        '27aee71f-5655-40c5-a7e8-1bf2ec5752bc',
        'customer2',
        'Customer2',
        'customer2@bmwtechworks.com',
        '$2a$10$4GsNO91pHexPO9.fJsajJ.KsnTrFxwMjvKgfVLvAc8q2GdSeOKPdO',
        'f2f947ac-465b-4ec2-9c59-3d1f3a0e75f2'
    ),

    (
        'ddc6ca6e-9eeb-40a0-ad9f-0df5324072f6',
        'customer3',
        'Customer3',
        'customer3@bmwtechworks.com',
        '$2a$10$4GsNO91pHexPO9.fJsajJ.KsnTrFxwMjvKgfVLvAc8q2GdSeOKPdO',
        'f2f947ac-465b-4ec2-9c59-3d1f3a0e75f2'
    ),

    (
        'c1928824-b7a1-4c0a-88dc-89f77f141f03',
        'customer4',
        'Customer4',
        'customer4@bmwtechworks.com',
        '$2a$10$4GsNO91pHexPO9.fJsajJ.KsnTrFxwMjvKgfVLvAc8q2GdSeOKPdO',
        'f2f947ac-465b-4ec2-9c59-3d1f3a0e75f2'
    ),

    (
        '00f89c8f-34e1-4dad-bbb4-8857ddd155e1',
        'dealer1',
        'Dealer1',
        'dealer1@bmwtechworks.com',
          '$2a$10$TVQXxi00lwNfHYE97V.2meOK5W3OGodUaKPh9r1fzqMSUMAv2JCFu',
        '00c22be3-7bdf-4bb7-ab4a-0fb77d2fe83f'
    ),

    (
        '40b238b1-6960-40af-b2dd-3dbfc8996e09',
        'dealer2',
        'Dealer2',
        'dealer2@bmwtechworks.com',
        '$2a$10$TVQXxi00lwNfHYE97V.2meOK5W3OGodUaKPh9r1fzqMSUMAv2JCFu',
        '00c22be3-7bdf-4bb7-ab4a-0fb77d2fe83f'
    ),

    (
        '439cc520-9181-4ea2-a233-bf9383374255',
        'dealer3',
        'Dealer3',
        'dealer3@bmwtechworks.com',
        '$2a$10$TVQXxi00lwNfHYE97V.2meOK5W3OGodUaKPh9r1fzqMSUMAv2JCFu',
        '00c22be3-7bdf-4bb7-ab4a-0fb77d2fe83f'
    ),

    (
        '9867133d-930d-4b39-b21e-0f891b81d657',
        'dealer4',
        'Dealer4',
        'dealer4@bmwtechworks.com',
        '$2a$10$TVQXxi00lwNfHYE97V.2meOK5W3OGodUaKPh9r1fzqMSUMAv2JCFu',
        '00c22be3-7bdf-4bb7-ab4a-0fb77d2fe83f'
    ),

    (
        '52d15021-93d4-4779-b17e-5ea3abd10028',
        'dealer5',
        'Dealer5',
        'dealer5@bmwtechworks.com',
        '$2a$10$TVQXxi00lwNfHYE97V.2meOK5W3OGodUaKPh9r1fzqMSUMAv2JCFu',
        '00c22be3-7bdf-4bb7-ab4a-0fb77d2fe83f'
    )
    ON CONFLICT (id) DO NOTHING;
