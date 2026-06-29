UPDATE "student_score"
SET "bac_type" = CASE "bac_type"
  WHEN 'آداب' THEN 'literature'
  WHEN 'رياضيات' THEN 'mathematics'
  WHEN 'علوم تجريبية' THEN 'experimental_sciences'
  WHEN 'إقتصاد وتصرف' THEN 'economics_and_management'
  WHEN 'العلوم التقنية' THEN 'technical_sciences'
  WHEN 'علوم الإعلامية' THEN 'computer_science'
  WHEN 'رياضة' THEN 'sport'
  ELSE "bac_type"
END;
