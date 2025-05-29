DROP VIEW IF EXISTS zr0.users_in_same_workshops;

CREATE VIEW zr0.users_in_same_workshops AS
SELECT 
  twu1.user_fk AS reference_user_id,
  u2.id AS user_id,
  u2.name,
  u2.email,
  u2.role,
  twu1.transformation_workshop_fk AS workshop_id
FROM zr0.transformation_workshop_user twu1
JOIN zr0.transformation_workshop_user twu2 
  ON twu1.transformation_workshop_fk = twu2.transformation_workshop_fk
JOIN zr0.users u2 
  ON twu2.user_fk = u2.id;