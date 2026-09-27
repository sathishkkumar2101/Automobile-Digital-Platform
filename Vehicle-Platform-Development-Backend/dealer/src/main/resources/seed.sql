INSERT INTO dealer
(dealer_id, user_id, name, location)
VALUES
    (
        'a1b2c3d4-e5f6-4789-a012-3456789abcde',
        '00f89c8f-34e1-4dad-bbb4-8857ddd155e1',
        'BMW Chennai',
        'Chennai'
    ),
    (
        'b2c3d4e5-f6a7-4890-b123-456789abcdef',
        '40b238b1-6960-40af-b2dd-3dbfc8996e09',
        'BMW Bangalore',
        'Bangalore'
    ),
    (
        'c3d4e5f6-a7b8-4901-c234-56789abcdef0',
        '439cc520-9181-4ea2-a233-bf9383374255',
        'BMW Hyderabad',
        'Hyderabad'
    ),
    (
        'd4e5f6a7-b8c9-4012-d345-6789abcdef01',
        '9867133d-930d-4b39-b21e-0f891b81d657',
        'BMW Mumbai',
        'Mumbai'
    ),
    (
        'e5f6a7b8-c9d0-4123-e456-789abcdef012',
        '52d15021-93d4-4779-b17e-5ea3abd10028',
        'BMW Delhi',
        'Delhi'
    )
    ON CONFLICT (dealer_id) DO NOTHING;