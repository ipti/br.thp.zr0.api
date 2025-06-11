DROP VIEW IF EXISTS zr0.users_in_same_workshops;

CREATE VIEW zr0.users_in_same_workshops AS
SELECT * FROM zr0.users u WHERE u.`role` != 'CUSTUMER'