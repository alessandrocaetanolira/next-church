UPDATE "User"
SET "permissions" = CASE
  WHEN "permissions" IS NULL OR trim("permissions") = '' THEN 'feed:share'
  WHEN lower(',' || "permissions" || ',') LIKE '%,feed:share,%' THEN "permissions"
  ELSE "permissions" || ',feed:share'
END,
"updatedAt" = CURRENT_TIMESTAMP
WHERE upper(COALESCE("role", '')) = 'MEMBER'
  AND "deletedAt" IS NULL;
