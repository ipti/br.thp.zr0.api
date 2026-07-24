INSERT INTO users (
  email,
  username,
  role,
  name,
  password,
  active,
  verify_email,
  createdAt,
  updatedAt
)
SELECT
  'admin@admin.com',
  'admin',
  'ADMIN',
  'Admin',
  '$2b$10$XjLJE96rAlvyD/9OvHLOE.q0AUF4GHdeqgq4eReDqFtnGv9gfUacG',
  true,
  true,
  NOW(),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM users
  WHERE email = 'admin@admin.com'
);