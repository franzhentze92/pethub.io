-- Allow applicants to cancel (delete) their own pending or rejected adoption applications

DROP POLICY IF EXISTS "Applicants can delete own pending adoption applications" ON public.adoption_applications;

CREATE POLICY "Applicants can delete own pending adoption applications"
ON public.adoption_applications
FOR DELETE
USING (
  applicant_id = auth.uid()
  AND status IN ('pending', 'rejected')
);
