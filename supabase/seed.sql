-- Default Settings
INSERT INTO public.settings (id, center_name, admin_name, default_currency, default_monthly_fee, phone, address)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Maktabcha O‘quv Markazi',
  'Bosh Administrator',
  'UZS',
  350000,
  '+998 90 123 45 67',
  'Toshkent shahar, Chilonzor tumani'
) ON CONFLICT (id) DO NOTHING;

-- Initial Required Students: Temur, Asad, Akobir, Laziz
INSERT INTO public.students (id, first_name, last_name, phone, parent_name, parent_phone, birth_date, gender, address, joined_at, status, notes)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'Temur',
    'Aliyev',
    '+998 90 111 22 33',
    'Rustam Aliyev',
    '+998 90 111 00 11',
    '2008-05-14',
    'Erkak',
    'Toshkent sh., Yunusobod 4-mavze',
    '2025-01-10',
    'Faol',
    'Iqtidorli va darslarga faol qatnashadi'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Asad',
    'Karimov',
    '+998 91 222 33 44',
    'Jasur Karimov',
    '+998 91 222 00 22',
    '2009-02-20',
    'Erkak',
    'Toshkent sh., Chilonzor 9-kvartal',
    '2025-01-12',
    'Faol',
    'Matematika va mantiqqa qiziqishi yuqori'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Akobir',
    'Saidov',
    '+998 93 333 44 55',
    'Nodira Saidova',
    '+998 93 333 00 33',
    '2008-11-08',
    'Erkak',
    'Toshkent sh., Mirzo Ulug‘bek tumani',
    '2025-01-15',
    'Faol',
    'Ingliz tili darajasi yaxshi'
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'Laziz',
    'Rahmonov',
    '+998 97 444 55 66',
    'Shuhrat Rahmonov',
    '+998 97 444 00 44',
    '2009-07-25',
    'Erkak',
    'Toshkent sh., Sergeli 2-mavze',
    '2025-01-20',
    'Faol',
    'Dasturlash asoslarini o‘rganmoqda'
  )
ON CONFLICT (id) DO NOTHING;

-- Initial Sample Group
INSERT INTO public.groups (id, name, course_name, teacher_name, monthly_fee, room, start_date, status, schedule)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'Frontend-01',
  'Web Dasturlash (Frontend)',
  'Anvar Qodirov',
  400000,
  'Xona 102',
  '2025-02-01',
  'Faol',
  '[
    {"day": "Dushanba", "start_time": "14:00", "end_time": "16:00"},
    {"day": "Chorshanba", "start_time": "14:00", "end_time": "16:00"},
    {"day": "Juma", "start_time": "14:00", "end_time": "16:00"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Associate Students to Group
INSERT INTO public.group_students (group_id, student_id, joined_at, status)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2025-02-01', 'Faol'),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', '2025-02-01', 'Faol'),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', '2025-02-01', 'Faol'),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', '2025-02-01', 'Faol')
ON CONFLICT (group_id, student_id) DO NOTHING;
