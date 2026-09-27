-- Concede o acesso básico aos membros que foram aprovados antes
-- da definição das permissões padrão. Não altera membros com configuração própria.
UPDATE "User"
SET "permissions" = 'feed:view,bible:view,games:view,groups:view,groups:request,notifications:view'
WHERE "role" = 'MEMBER'
  AND ("permissions" IS NULL OR trim("permissions") = '');
