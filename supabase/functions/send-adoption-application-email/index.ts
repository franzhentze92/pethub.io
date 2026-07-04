import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildAdoptionApplicationHtml,
  buildAdoptionApplicationSubject,
  buildAdoptionApplicationText,
  type AdoptionApplicationEmailData,
} from '../send-order-confirmation/template.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTIFY_STATUSES = new Set(['approved', 'rejected']);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function canNotifyAdoptionStatus(
  admin: ReturnType<typeof createClient>,
  userId: string,
  applicationId: string,
): Promise<boolean> {
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.role === 'admin') {
    return true;
  }

  const { data: application } = await admin
    .from('adoption_applications')
    .select(`
      id,
      adoption_pets (
        owner_id,
        shelter_id,
        shelters ( owner_id )
      )
    `)
    .eq('id', applicationId)
    .maybeSingle();

  if (!application?.adoption_pets) {
    return false;
  }

  const pet = application.adoption_pets as {
    owner_id?: string | null;
    shelter_id?: string | null;
    shelters?: { owner_id?: string | null } | null;
  };

  if (pet.owner_id === userId) {
    return true;
  }

  if (pet.shelters?.owner_id === userId) {
    return true;
  }

  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('ORDER_EMAIL_FROM') || 'PetHub <onboarding@resend.dev>';
    const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://pethubgt.com';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Missing Supabase configuration' }, 500);
    }

    if (!resendApiKey) {
      return jsonResponse({
        success: false,
        skipped: true,
        reason: 'RESEND_API_KEY not configured',
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const applicationId = body?.applicationId as string | undefined;
    const status = body?.status as string | undefined;
    const previousStatus = (body?.previousStatus as string | undefined) ?? null;

    if (!applicationId || !status) {
      return jsonResponse({ error: 'applicationId and status are required' }, 400);
    }

    if (!NOTIFY_STATUSES.has(status)) {
      return jsonResponse({
        success: false,
        skipped: true,
        reason: `Status "${status}" does not trigger applicant email`,
      });
    }

    if (previousStatus === status) {
      return jsonResponse({
        success: false,
        skipped: true,
        reason: 'Status unchanged',
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const allowed = await canNotifyAdoptionStatus(admin, user.id, applicationId);
    if (!allowed) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const { data: application, error: appError } = await admin
      .from('adoption_applications')
      .select(`
        *,
        adoption_pets (
          name,
          species,
          breed,
          image_url,
          owner_id,
          shelter_id,
          shelters ( name, owner_id )
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return jsonResponse({ error: 'Application not found' }, 404);
    }

    if (application.status !== status) {
      return jsonResponse({ error: 'Application status mismatch' }, 409);
    }

    const { data: prefs } = await admin
      .from('user_notification_preferences')
      .select('notify_adoption')
      .eq('user_id', application.applicant_id)
      .maybeSingle();

    if (prefs?.notify_adoption === false) {
      return jsonResponse({
        success: false,
        skipped: true,
        reason: 'Applicant disabled adoption notifications',
      });
    }

    const { data: applicantUser } = await admin.auth.admin.getUserById(application.applicant_id);
    const { data: applicantProfile } = await admin
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', application.applicant_id)
      .maybeSingle();

    const recipientEmail = applicantUser?.user?.email;
    if (!recipientEmail) {
      return jsonResponse({ error: 'No email address for applicant' }, 400);
    }

    const pet = application.adoption_pets as {
      name?: string;
      species?: string | null;
      breed?: string | null;
      image_url?: string | null;
      owner_id?: string | null;
      shelter_id?: string | null;
      shelters?: { name?: string | null; owner_id?: string | null } | null;
    } | null;

    let reviewerName = 'PetHub';
    if (pet?.shelters?.name) {
      reviewerName = pet.shelters.name;
    } else if (pet?.owner_id) {
      const { data: ownerProfile } = await admin
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', pet.owner_id)
        .maybeSingle();
      reviewerName = ownerProfile?.full_name || 'Dueño de la mascota';
    }

    const applicantName =
      applicantProfile?.full_name ||
      applicantUser?.user?.user_metadata?.full_name ||
      recipientEmail.split('@')[0] ||
      'Adoptante';

    const emailData: AdoptionApplicationEmailData = {
      applicant_name: applicantName,
      applicant_email: recipientEmail,
      pet_name: pet?.name || 'Mascota en adopción',
      pet_species: pet?.species,
      pet_breed: pet?.breed,
      pet_image_url: pet?.image_url,
      reviewer_name: reviewerName,
      status: status as 'approved' | 'rejected',
      application_message: application.message,
      updated_at: application.updated_at || new Date().toISOString(),
      app_url: appUrl,
    };

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: buildAdoptionApplicationSubject(emailData),
        html: buildAdoptionApplicationHtml(emailData),
        text: buildAdoptionApplicationText(emailData),
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend error:', resendResult);
      return jsonResponse(
        {
          success: false,
          error: 'Failed to send email',
          details: resendResult,
        },
        502,
      );
    }

    return jsonResponse({
      success: true,
      emailId: resendResult.id,
      sentTo: recipientEmail,
      status,
    });
  } catch (error) {
    console.error('send-adoption-application-email error:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      500,
    );
  }
});
