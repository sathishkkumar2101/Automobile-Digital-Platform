INSERT INTO permissions (id, name, description)
VALUES
    ('3c8ca579-4bec-4a27-8af1-b48cf783ab3f',
     'VIEW_VEHICLE',
     'Allows viewing vehicle information'),

    ('ccf3fbc6-8b5d-493b-9c71-1d36355fec53',
     'CREATE_USER',
     'Allows creating users'),

    ('3e37d807-6f79-4482-a20c-dc746c7babe7',
     'UPDATE_USER',
     'Allows updating users'),

    ('aecfeff2-3f90-4cf7-bc07-443d809cf3f0',
     'DELETE_USER',
     'Allows deleting users'),

    ('f4e0c2cf-6c7c-40d8-906a-6353fdff7be3',
     'CREATE_ROLE',
     'Allows creating roles'),

    ('e8509e1e-f6b6-48b3-b688-9515012b69a9',
     'UPDATE_ROLE',
     'Allows updating roles'),

    ('a2a4d5d5-a826-4fe2-af33-b6af07d15cb1',
     'DELETE_ROLE',
     'Allows deleting roles'),

    ('e3d354e3-dee0-44e0-9a89-877fbd4ef5ec',
     'CREATE_PERMISSION',
     'Allows creating permissions'),

    ('c9aff296-6745-4091-ad98-418f2549dae6',
     'UPDATE_PERMISSION',
     'Allows updating permissions'),

    ('1060fcac-dff4-46cc-ab17-3fa97d4734d0',
     'DELETE_PERMISSION',
     'Allows deleting permissions'),

    ('cdab04e3-d1da-4422-98c2-467eb1ee9a6d',
     'CREATE_VEHICLE',
     'Allows creating vehicles'),

    ('39a83850-b8aa-4673-a7df-48a798f12cde',
     'TAKE_VEHICLE',
     'Allows adding vechiles to inventory.')
    ON CONFLICT (id) DO NOTHING;