/** Estados de solicitud de adopción que envían correo al adoptante. */
export const ADOPTION_STATUSES_WITH_EMAIL = ['approved', 'rejected'] as const;

export type AdoptionStatusWithEmail = (typeof ADOPTION_STATUSES_WITH_EMAIL)[number];

export function shouldSendAdoptionApplicationEmail(
  newStatus: string,
  previousStatus?: string | null,
): newStatus is AdoptionStatusWithEmail {
  if (previousStatus === newStatus) return false;
  return (ADOPTION_STATUSES_WITH_EMAIL as readonly string[]).includes(newStatus);
}

/** Notifica al adoptante tras aprobar/rechazar una solicitud (no bloquea la UI). */
export async function sendAdoptionApplicationEmail(
  invoke: (
    name: string,
    options: {
      body: {
        applicationId: string;
        status: string;
        previousStatus?: string | null;
      };
    },
  ) => Promise<{ data: unknown; error: unknown }>,
  applicationId: string,
  status: string,
  previousStatus?: string | null,
): Promise<void> {
  if (!shouldSendAdoptionApplicationEmail(status, previousStatus)) return;

  try {
    const { data, error } = await invoke('send-adoption-application-email', {
      body: { applicationId, status, previousStatus: previousStatus ?? null },
    });
    if (error) {
      console.warn('Adoption application email failed:', error);
      return;
    }
    const result = data as { skipped?: boolean; success?: boolean };
    if (result?.skipped) {
      console.warn('Adoption application email skipped:', result);
    }
  } catch (err) {
    console.warn('Adoption application email error:', err);
  }
}
