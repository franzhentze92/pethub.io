import { formatSpeciesLabel } from '@/utils/petLabels';
import { buildChatGreeting, getMascotDashboardForRole } from '@/lib/blueprint/blueprintMascots';
import type { AiModuleDefinition } from './types';
import { aiRegistry } from './registry';

function formatPrice(price: number, currency?: string) {
  const sym = currency === 'GTQ' || !currency ? 'Q.' : '$';
  return `${sym}${Number(price).toFixed(2)}`;
}

export function formatToolResult(
  toolName: string,
  result: unknown,
  module?: AiModuleDefinition
): { message: string; actionLink?: { label: string; path: string } } {
  const basePath = module?.basePath;
  const data = result as Record<string, unknown>;

  if (data?.error === 'NO_PROVIDER_PROFILE') {
    return {
      message: String(data.message),
      actionLink: data.actionPath ? { label: 'Ir a proveedor', path: String(data.actionPath) } : undefined,
    };
  }

  if (data?.success && data?.message) {
    return {
      message: String(data.message),
      actionLink: data.actionPath
        ? { label: 'Ver en PetHub', path: String(data.actionPath) }
        : basePath
          ? { label: 'Abrir módulo', path: basePath }
          : undefined,
    };
  }

  if (data?.error && data?.message) {
    return {
      message: String(data.message),
      actionLink: data.actionPath
        ? { label: 'Continuar', path: String(data.actionPath) }
        : undefined,
    };
  }

  if (data?.error) {
    return { message: String(data.error) };
  }

  switch (toolName) {
    case 'marketplace_search_products': {
      const products = (data.products as Array<Record<string, unknown>>) ?? [];
      if (products.length === 0) {
        return {
          message: 'No encontré productos con ese criterio. ¿Quieres buscar otra cosa o ver toda la tienda?',
          actionLink: basePath ? { label: 'Ver tienda', path: basePath } : undefined,
        };
      }
      const lines = products.slice(0, 20).map(
        (p) =>
          `• **${p.name}** (${p.category}) — ${formatPrice(p.price as number, p.currency as string)}${p.stock ? ` · ${p.stock} en stock` : ''}${p.provider ? ` · ${p.provider}` : ''}`
      );
      const extra = products.length > 20 ? `\n\n…y ${products.length - 20} más en la tienda.` : '';
      return {
        message: `Encontré **${products.length} producto(s)**:\n\n${lines.join('\n')}${extra}`,
        actionLink: basePath ? { label: 'Ir a la tienda', path: basePath } : undefined,
      };
    }

    case 'marketplace_search_services': {
      const services = (data.services as Array<Record<string, unknown>>) ?? [];
      if (services.length === 0) {
        return {
          message: 'No encontré servicios con ese criterio.',
          actionLink: { label: 'Ver servicios', path: '/marketplace/services' },
        };
      }
      const lines = services.slice(0, 20).map(
        (s) =>
          `• **${s.name}** (${s.category}) — ${formatPrice(s.price as number, s.currency as string)} · ${s.durationMinutes} min${s.provider ? ` · ${s.provider}` : ''}`
      );
      const extra = services.length > 20 ? `\n\n…y ${services.length - 20} más en la tienda.` : '';
      return {
        message: `Encontré **${services.length} servicio(s)**:\n\n${lines.join('\n')}${extra}`,
        actionLink: { label: 'Ver servicios', path: '/marketplace/services' },
      };
    }

    case 'marketplace_count_catalog':
      return {
        message: `En el marketplace hay **${data.products} productos** y **${data.services} servicios** disponibles ahora mismo. 🛍️`,
        actionLink: basePath ? { label: 'Explorar tienda', path: basePath } : undefined,
      };

    case 'adoption_list_pets': {
      const pets = (data.pets as Array<Record<string, unknown>>) ?? [];
      const breeds = (data.breeds as string[]) ?? [];
      if (pets.length === 0) {
        return {
          message: 'No hay mascotas en adopción que coincidan con tu búsqueda en este momento.',
          actionLink: basePath ? { label: 'Ver adopción', path: basePath } : undefined,
        };
      }
      if (pets.length === 1) {
        const p = pets[0];
        const sexLabel = p.sex === 'M' ? 'Macho' : p.sex === 'F' ? 'Hembra' : null;
        return {
          message:
            `**${p.name}** — ${p.breed ?? formatSpeciesLabel(String(p.species ?? ''))}${p.age ? `, ${p.age}` : ''}` +
            `${sexLabel ? ` · ${sexLabel}` : ''}${p.size ? ` · ${p.size}` : ''}` +
            `${p.shelter ? `\n🏠 Albergue: ${p.shelter}` : ''}` +
            `${p.location ? `\n📍 ${p.location}` : ''}` +
            `${p.fee ? `\n💰 Cuota de adopción: Q.${Number(p.fee).toFixed(2)}` : ''}` +
            `\n\n¿Quieres iniciar el proceso de adopción o saber más sobre ${p.name}?`,
          actionLink: basePath ? { label: 'Ver en adopción', path: basePath } : undefined,
        };
      }
      const lines = pets.slice(0, 8).map(
        (p) =>
          `• **${p.name}** — ${p.breed ?? formatSpeciesLabel(String(p.species ?? ''))}${p.age ? `, ${p.age}` : ''}${p.shelter ? ` · ${p.shelter}` : ''}${p.location ? ` · ${p.location}` : ''}`
      );
      const breedLine = breeds.length > 0 ? `\n\n**Razas disponibles:** ${breeds.slice(0, 10).join(', ')}` : '';
      return {
        message: `Hay **${pets.length} mascota(s)** en adopción:\n\n${lines.join('\n')}${breedLine}`,
        actionLink: basePath ? { label: 'Ver en adopción', path: basePath } : undefined,
      };
    }

    case 'adoption_count_available': {
      const bySpecies = data.bySpecies as Record<string, number> | undefined;
      if (bySpecies && Object.keys(bySpecies).length > 0) {
        const parts = Object.entries(bySpecies).map(([s, n]) => `${n} ${s}`);
        return {
          message: `Hay **${data.total} mascota(s)** disponibles para adopción: ${parts.join(', ')}. 🐾`,
          actionLink: basePath ? { label: 'Ver adopción', path: basePath } : undefined,
        };
      }
      return {
        message: `Hay **${data.total} mascota(s)** disponibles para adopción.`,
        actionLink: basePath ? { label: 'Ver adopción', path: basePath } : undefined,
      };
    }

    case 'lost_pets_list': {
      const lost = (data.lostPets as Array<Record<string, unknown>>) ?? [];
      if (lost.length === 0) {
        return {
          message: '¡Buenas noticias! No hay reportes activos de mascotas perdidas que coincidan.',
          actionLink: { label: 'Ver mapa', path: '/mascotas-perdidas' },
        };
      }
      const lines = lost.slice(0, 8).map(
        (p) =>
          `• **${p.name ?? 'Sin nombre'}** (${formatSpeciesLabel(String(p.species ?? ''))}${p.breed ? `, ${p.breed}` : ''}) — 📍 ${p.location ?? 'ubicación no indicada'}${p.lastSeen ? ` · visto: ${p.lastSeen}` : ''}`
      );
      return {
        message: `Hay **${lost.length} reporte(s)** de mascotas perdidas:\n\n${lines.join('\n')}`,
        actionLink: { label: 'Ver en mapa', path: '/mascotas-perdidas' },
      };
    }

    case 'lost_pets_count':
      return {
        message:
          (data.total as number) > 0
            ? `Actualmente hay **${data.total} mascota(s)** reportadas como perdidas. Puedo mostrarte los detalles si quieres.`
            : 'No hay mascotas reportadas como perdidas en este momento. 🎉',
        actionLink: { label: 'Mascotas perdidas', path: '/mascotas-perdidas' },
      };

    case 'pets_list_mine': {
      const pets = (data.pets as Array<Record<string, unknown>>) ?? [];
      if (pets.length === 0) {
        return { message: 'Aún no tienes mascotas registradas. ¿Quieres agregar una en Ajustes?' };
      }
      const lines = pets.map((p) => `• **${p.name}** — ${p.breed ?? formatSpeciesLabel(String(p.species ?? ''))}${p.age ? `, ${p.age}` : ''}`);
      return {
        message: `Tienes **${pets.length} mascota(s)** registrada(s):\n\n${lines.join('\n')}`,
        actionLink: { label: 'Mis mascotas', path: '/ajustes' },
      };
    }

    case 'shelters_list': {
      const shelters = (data.shelters as Array<Record<string, unknown>>) ?? [];
      if (shelters.length === 0) return { message: 'No encontré albergues registrados.' };
      const lines = shelters.map((s) => `• **${s.name}** — ${s.location ?? 'sin ubicación'}${s.phone ? ` · ${s.phone}` : ''}`);
      return {
        message: `Encontré **${shelters.length} albergue(s)**:\n\n${lines.join('\n')}`,
        actionLink: { label: 'Ver albergues', path: '/adopcion' },
      };
    }

    case 'orders_list_mine': {
      const orders = (data.orders as Array<Record<string, unknown>>) ?? [];
      if (orders.length === 0) return { message: 'No tienes pedidos recientes.' };
      const lines = orders.map(
        (o) => `• Pedido **${o.number}** — ${o.status} · ${formatPrice(o.total as number, o.currency as string)}`
      );
      return {
        message: `Tus pedidos recientes:\n\n${lines.join('\n')}`,
        actionLink: { label: 'Mis órdenes', path: '/client-orders' },
      };
    }

    case 'orders_track': {
      if (data?.error === 'AUTH_REQUIRED' || data?.error === 'NOT_FOUND') {
        return {
          message: String(data.message),
          actionLink: data.actionPath
            ? { label: 'Mis órdenes', path: String(data.actionPath) }
            : undefined,
        };
      }
      const order = data.order as Record<string, unknown>;
      const items = (order.items as Array<Record<string, unknown>>) ?? [];
      const appts = (data.service_appointments as Array<Record<string, unknown>>) ?? [];
      const itemLines = items.map(
        (i) => `• ${i.name} ×${i.quantity} (${i.type})`,
      );
      const apptLines = appts.map(
        (a) =>
          `• **${a.service}** — ${a.date}${a.time ? ` ${a.time}` : ''} · ${a.status}`,
      );
      return {
        message:
          `**Pedido ${order.number}** — ${order.status}\n` +
          `Total: ${formatPrice(order.total as number, order.currency as string)}\n` +
          `Creado: ${String(order.created_at).slice(0, 10)}\n\n` +
          (itemLines.length ? `**Artículos:**\n${itemLines.join('\n')}\n\n` : '') +
          (apptLines.length ? `**Citas de servicio:**\n${apptLines.join('\n')}` : 'Sin citas vinculadas a este pedido.'),
        actionLink: { label: 'Ver pedido', path: '/client-orders' },
      };
    }

    case 'cart_add_item': {
      if (data?.error) {
        return { message: String(data.message ?? 'No pude agregar el producto al carrito.') };
      }
      return {
        message:
          `¡Listo! Agregué **${data.product_name}** (×${data.quantity}) al carrito. ` +
          `Precio: ${formatPrice(data.price as number, data.currency as string)}`,
        actionLink: { label: 'Ver carrito', path: '/cart' },
      };
    }

    case 'bookings_search_availability': {
      if (data?.error) {
        return { message: String(data.message ?? 'No encontré disponibilidad.') };
      }
      const service = data.service as Record<string, unknown>;
      if (data.slots) {
        const slots = (data.slots as Array<{ start_time: string; end_time: string }>) ?? [];
        const slotLines = slots.map((s) => `• ${s.start_time} – ${s.end_time}`).join('\n');
        return {
          message:
            `**${service.name}** (${service.provider})\n` +
            `Fecha: ${data.date}\n` +
            (slotLines ? `Horarios libres:\n${slotLines}` : 'No hay horarios disponibles ese día.'),
          actionLink: { label: 'Ver servicios', path: '/marketplace/services' },
        };
      }
      const schedule = (data.availability as Array<{ date: string; slots: Array<{ start_time: string }> }>) ?? [];
      const lines = schedule
        .filter((d) => d.slots.length > 0)
        .slice(0, 5)
        .map((d) => `• ${d.date}: ${d.slots.map((s) => s.start_time).join(', ')}`);
      return {
        message:
          `**${service.name}** (${service.provider})\n` +
          (lines.length
            ? `Próximos horarios disponibles:\n${lines.join('\n')}`
            : `No hay horarios libres en los próximos ${data.days_searched} días.`),
        actionLink: { label: 'Ver servicios', path: '/marketplace/services' },
      };
    }

    case 'bookings_add_to_cart': {
      if (data?.error) {
        return { message: String(data.message ?? 'No pude preparar la reserva.') };
      }
      return {
        message: String(data.message ?? 'Reserva agregada al carrito. Completa el checkout para confirmar.'),
        actionLink: { label: 'Ver carrito', path: '/cart' },
      };
    }

    case 'marketplace_search_semantic': {
      const products = (data.products as Array<Record<string, unknown>>) ?? [];
      if (products.length === 0) {
        return {
          message: data.message
            ? String(data.message)
            : 'No encontré productos con esa descripción. Prueba con otras palabras.',
        };
      }
      const lines = products.map(
        (p, i) =>
          `${i + 1}. **${p.name}**${p.brand ? ` (${p.brand})` : ''} — ${formatPrice(p.price as number, p.currency as string)} · stock ${p.stock}`,
      );
      return {
        message: `Encontré ${products.length} producto(s) relevante(s):\n\n${lines.join('\n')}`,
        actionLink: { label: 'Ir a la tienda', path: '/marketplace/products' },
      };
    }

    case 'pet_briefing': {
      if (data?.error) {
        return {
          message: String(data.message),
          actionLink: data.actionPath
            ? { label: 'Ir', path: String(data.actionPath) }
            : undefined,
        };
      }
      const pets = (data.pets as Array<Record<string, unknown>>) ?? [];
      const appts = (data.upcoming_appointments as Array<Record<string, unknown>>) ?? [];
      const reminders = (data.upcoming_reminders as Array<Record<string, unknown>>) ?? [];
      const petLines = pets.map((p) => {
        const insights = (p.insights as Array<{ message: string }>) ?? [];
        const alert = insights.length ? `\n  ⚠ ${insights[0].message}` : '';
        return `• **${p.pet_name}** — ${p.exercise_minutes_7d} min ejercicio (7d)${alert}`;
      });
      const apptLines = appts.map(
        (a) => `• ${a.date}${a.time ? ` ${a.time}` : ''} — ${a.service} (${a.status})`,
      );
      const reminderLines = reminders.map(
        (r) => `• ${r.date}${r.time ? ` ${r.time}` : ''} — ${r.title}${r.pet ? ` (${r.pet})` : ''}`,
      );
      return {
        message:
          `**Briefing del ${data.date}**\n\n` +
          `**Mascotas:**\n${petLines.join('\n') || '—'}\n\n` +
          `**Citas próximas:**\n${apptLines.join('\n') || 'Ninguna'}\n\n` +
          `**Recordatorios:**\n${reminderLines.join('\n') || 'Ninguno'}` +
          (data.total_alerts ? `\n\n🔔 ${data.total_alerts} alerta(s) de salud detectada(s).` : ''),
        actionLink: { label: 'Ver salud', path: '/health-journal' },
      };
    }

    case 'veterinary_query_document': {
      if (data?.error) {
        return {
          message: String(data.message ?? 'No pude consultar el documento.'),
          actionLink: data.actionPath
            ? { label: 'Veterinaria', path: String(data.actionPath) }
            : undefined,
        };
      }
      return {
        message: `${data.answer}\n\n_${data.disclaimer ?? ''}_`,
        actionLink: { label: 'Ver visita', path: '/veterinaria' },
      };
    }

    case 'breeding_count_available':
      return {
        message: `Hay **${data.total} mascota(s)** disponibles para parejas/cruza.`,
        actionLink: { label: 'Ver Parejas', path: '/parejas' },
      };

    case 'exercise_register_session': {
      if (data?.error === 'NO_PETS') {
        return {
          message: String(data.message ?? 'Primero registra una mascota en PetHub.'),
          actionLink: { label: 'Registrar mascota', path: '/pet-creation' },
        };
      }
      if (data?.error === 'PET_REQUIRED' || data?.error === 'PET_NOT_FOUND') {
        return { message: String(data.message) };
      }
      if (data?.error === 'INVALID_DURATION') {
        return { message: String(data.message) };
      }
      if (data?.error === 'REGISTER_FAILED') {
        return { message: String(data.message) };
      }
      if (!data?.success) {
        return { message: 'No se pudo registrar la sesión de ejercicio.' };
      }

      const multi = (data.sessions as Array<Record<string, unknown>>) ?? [];
      if (multi.length > 1) {
        const lines = multi.map(
          (s) =>
            `• **${s.pet_name}** — ${s.exercise_label} · ${s.duration_minutes} min · ${s.calories_burned} cal`,
        );
        const partial = data.partial_errors as string[] | undefined;
        return {
          message:
            `¡Listo! Registré la sesión para **${multi.length} mascotas**. ✅\n\n${lines.join('\n')}` +
            (partial?.length ? `\n\n⚠️ ${partial.join(' ')}` : ''),
          actionLink: { label: 'Ver historial', path: '/trazabilidad' },
        };
      }

      if (!data?.session) {
        return { message: 'No se pudo registrar la sesión de ejercicio.' };
      }
      const s = data.session as Record<string, unknown>;
      return {
        message:
          `¡Listo! Registré la sesión en tu historial. ✅\n\n` +
          `• **${s.pet_name}** — ${s.exercise_label}\n` +
          `• ${s.duration_minutes} min · Intensidad ${s.intensity} · ${s.calories_burned} cal\n` +
          `• Fecha: ${s.date}` +
          (s.notes ? `\n• Notas: ${s.notes}` : ''),
        actionLink: { label: 'Ver historial', path: '/trazabilidad' },
      };
    }

    case 'pet_health_summary': {
      if (
        data?.error === 'AUTH_REQUIRED' ||
        data?.error === 'NO_PETS' ||
        data?.error === 'PET_REQUIRED' ||
        data?.error === 'PET_NOT_FOUND'
      ) {
        return {
          message: String(data.message),
          actionLink: data.actionPath
            ? { label: 'Ir a Ajustes', path: String(data.actionPath) }
            : undefined,
        };
      }

      const pets = (data.pets as Array<Record<string, unknown>>) ?? [];
      if (pets.length === 0) {
        return {
          message: 'No encontré datos de salud para tus mascotas.',
          actionLink: { label: 'Ver diario de salud', path: '/health-journal' },
        };
      }

      const statusEmoji = (status: unknown) => {
        if (status === 'ok') return '✅';
        if (status === 'low') return '⚠️';
        if (status === 'high') return '📈';
        return 'ℹ️';
      };

      const sections = pets.map((pet) => {
        const nutrition = pet.nutrition as Record<string, unknown>;
        const calories = nutrition?.calories as Record<string, unknown>;
        const protein = nutrition?.protein as Record<string, unknown>;
        const exercise = pet.exercise as Record<string, unknown>;
        const veterinary = pet.veterinary as Record<string, unknown>;
        const lastVisit = veterinary?.last_visit as Record<string, unknown> | null;
        const vaccinations = pet.vaccinations as Record<string, unknown>;
        const overdue = (vaccinations?.overdue as Array<Record<string, unknown>>) ?? [];
        const dueSoon = (vaccinations?.due_soon as Array<Record<string, unknown>>) ?? [];
        const reminders = (pet.upcoming_reminders as Array<Record<string, unknown>>) ?? [];

        const lines: string[] = [`## ${pet.pet_name}`];

        const calPct = calories?.compliance_pct;
        const protPct = protein?.compliance_pct;
        lines.push(
          `**🍽 Nutrición (${nutrition?.month_label})** — objetivo: ${nutrition?.expected_source_label}`,
        );
        if (calPct != null) {
          lines.push(
            `${statusEmoji(calories?.status)} Calorías: **${calories?.actual}** / ${calories?.expected} kcal (${calPct}%)`,
          );
        } else {
          lines.push(`ℹ️ Calorías consumidas: **${calories?.actual ?? 0}** kcal (sin objetivo definido)`);
        }
        if (protPct != null) {
          lines.push(
            `${statusEmoji(protein?.status)} Proteína: **${protein?.actual}** / ${protein?.expected} g (${protPct}%)`,
          );
        }
        lines.push(`• ${nutrition?.meals_logged ?? 0} comidas registradas este mes`);

        lines.push(`\n**🏃 Ejercicio (últimos ${pet.period_days} días)**`);
        if ((exercise?.sessions_count as number) > 0) {
          lines.push(
            `• ${exercise.sessions_count} sesiones · **${exercise.total_minutes}** min total (${exercise.weekly_compliance_pct}% del objetivo semanal)`,
          );
          const recent = (exercise.recent_sessions as Array<Record<string, unknown>>)?.[0];
          if (recent) {
            lines.push(`• Última: ${recent.type} · ${recent.duration_minutes} min (${recent.date})`);
          }
        } else {
          lines.push('• Sin actividad registrada recientemente');
        }

        lines.push(`\n**🏥 Veterinaria**`);
        if (lastVisit) {
          lines.push(
            `• Última visita (${lastVisit.date}): ${lastVisit.appointment_label}`,
          );
          if (lastVisit.diagnosis) lines.push(`  Diagnóstico: ${lastVisit.diagnosis}`);
          if (lastVisit.treatment) lines.push(`  Tratamiento: ${lastVisit.treatment}`);
          if (lastVisit.prescription) lines.push(`  Receta: ${lastVisit.prescription}`);
          if (lastVisit.follow_up_pending) {
            lines.push(`  ⚠️ Seguimiento pendiente: ${lastVisit.follow_up_date}`);
          }
        } else {
          lines.push('• Sin visitas veterinarias registradas');
        }

        if (overdue.length > 0) {
          lines.push(`\n**💉 Vacunas vencidas:** ${overdue.map((v) => v.vaccine_name).join(', ')}`);
        } else if (dueSoon.length > 0) {
          lines.push(
            `\n**💉 Próximas vacunas:** ${dueSoon.map((v) => `${v.vaccine_name} (${v.next_due_date})`).join(', ')}`,
          );
        }

        if (reminders.length > 0) {
          lines.push(
            `\n**🔔 Próximos recordatorios:**\n${reminders
              .slice(0, 3)
              .map((r) => `• ${r.title} — ${r.date}${r.time ? ` ${r.time}` : ''}`)
              .join('\n')}`,
          );
        }

        const trends = pet.trends_30d as Record<string, unknown> | undefined;
        const comparison = trends?.comparison as Record<string, unknown> | undefined;
        if (comparison) {
          lines.push(`\n**📈 Tendencias (30 días)**`);
          const calChange = comparison.calories_change_pct;
          const exChange = comparison.exercise_change_pct;
          if (calChange != null) {
            const calDir = Number(calChange) > 0 ? '↑' : Number(calChange) < 0 ? '↓' : '→';
            lines.push(
              `• Calorías semana actual vs anterior: ${calDir} ${Math.abs(Number(calChange))}% (${comparison.calories_current_week} vs ${comparison.calories_previous_week} kcal)`,
            );
          }
          if (exChange != null) {
            const exDir = Number(exChange) > 0 ? '↑' : Number(exChange) < 0 ? '↓' : '→';
            lines.push(
              `• Ejercicio semana actual vs anterior: ${exDir} ${Math.abs(Number(exChange))}% (${comparison.exercise_minutes_current_week} vs ${comparison.exercise_minutes_previous_week} min)`,
            );
          }
          const weekly = (trends?.exercise_weekly as Array<Record<string, unknown>>) ?? [];
          if (weekly.length > 0) {
            const weekSummary = weekly
              .slice(-4)
              .map(
                (w) =>
                  `${w.week_label}: ${w.meals_count} comidas, ${w.calories_total} kcal, ${w.exercise_minutes} min ejercicio`,
              )
              .join(' · ');
            lines.push(`• Por semana: ${weekSummary}`);
          }
        }

        return lines.join('\n');
      });

      const disclaimer = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
      return {
        message: `**Resumen de salud**\n\n${sections.join('\n\n')}${disclaimer}`,
        actionLink: { label: 'Ver diario de salud', path: '/health-journal' },
      };
    }

    case 'pet_timeline': {
      if (
        data?.error === 'AUTH_REQUIRED' ||
        data?.error === 'NO_PETS' ||
        data?.error === 'PET_REQUIRED' ||
        data?.error === 'PET_NOT_FOUND'
      ) {
        return {
          message: String(data.message),
          actionLink: data.actionPath
            ? { label: 'Ir a Ajustes', path: String(data.actionPath) }
            : undefined,
        };
      }

      const events = (data.events as Array<Record<string, unknown>>) ?? [];
      const periodDays = data.period_days ?? 30;
      const pets = (data.pets as string[]) ?? [];

      if (events.length === 0) {
        return {
          message: `No hay eventos registrados en los últimos **${periodDays} días**${pets.length ? ` para ${pets.join(', ')}` : ''}.`,
          actionLink: { label: 'Ver diario de salud', path: '/health-journal' },
        };
      }

      const typeEmoji: Record<string, string> = {
        meal: '🍽',
        exercise: '🏃',
        vet_visit: '🏥',
        vaccination: '💉',
        reminder: '🔔',
        reminder_completed: '✅',
        document_parsed: '📄',
      };

      const lines = events.map((e) => {
        const emoji = typeEmoji[String(e.type)] ?? '•';
        const petLabel = pets.length > 1 ? `**${e.pet_name}** — ` : '';
        return `${emoji} ${e.date} · ${petLabel}${e.summary}`;
      });

      const header =
        pets.length > 1
          ? `**Línea de tiempo** (${periodDays} días) — ${pets.join(', ')}`
          : `**Línea de tiempo de ${pets[0] ?? 'tu mascota'}** (${periodDays} días)`;

      return {
        message: `${header}\n\n${lines.join('\n')}\n\n_${events.length} evento(s) mostrado(s)._`,
        actionLink: { label: 'Ver diario de salud', path: '/health-journal' },
      };
    }

    case 'pet_insights': {
      if (
        data?.error === 'AUTH_REQUIRED' ||
        data?.error === 'NO_PETS' ||
        data?.error === 'PET_REQUIRED' ||
        data?.error === 'PET_NOT_FOUND'
      ) {
        return {
          message: String(data.message),
          actionLink: data.actionPath
            ? { label: 'Ir a Ajustes', path: String(data.actionPath) }
            : undefined,
        };
      }

      const pets = (data.pets as Array<Record<string, unknown>>) ?? [];
      const severityEmoji: Record<string, string> = {
        high: '🔴',
        medium: '🟠',
        low: '🟡',
        info: 'ℹ️',
      };

      const sections = pets.map((pet) => {
        const insights = (pet.insights as Array<Record<string, unknown>>) ?? [];
        const lines: string[] = [`## ${pet.pet_name}`];
        if (insights.length === 0) {
          lines.push('✅ Sin alertas detectadas. Todo parece en orden según los datos registrados.');
        } else {
          for (const insight of insights) {
            const emoji = severityEmoji[String(insight.severity)] ?? '•';
            lines.push(`${emoji} ${insight.message}`);
            if (insight.recommendation) {
              lines.push(`   _→ ${insight.recommendation}_`);
            }
          }
        }
        const docs = pet.documents_analyzed as number;
        if (docs > 0) {
          lines.push(`\n📄 ${docs} documento(s) veterinario(s) analizado(s) en el grafo de datos.`);
        }
        return lines.join('\n');
      });

      const total = (data.total_insights as number) ?? 0;
      const disclaimer = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
      const header =
        total > 0
          ? `**Insights de salud** — ${total} observación(es) detectada(s)`
          : '**Insights de salud** — sin alertas relevantes';

      return {
        message: `${header}\n\n${sections.join('\n\n')}${disclaimer}`,
        actionLink: { label: 'Ver diario de salud', path: '/health-journal' },
      };
    }

    case 'pets_compare': {
      if (
        data?.error === 'AUTH_REQUIRED' ||
        data?.error === 'NO_PETS' ||
        data?.error === 'PET_NOT_FOUND' ||
        data?.error === 'NEED_MULTIPLE_PETS'
      ) {
        return {
          message: String(data.message),
          actionLink: data.actionPath
            ? { label: 'Ir a Ajustes', path: String(data.actionPath) }
            : undefined,
        };
      }

      const rows = (data.comparison as Array<Record<string, unknown>>) ?? [];
      const highlights = data.highlights as Record<string, unknown> | undefined;

      const lines = rows.map((row) => {
        const calPct = row.calorie_compliance_pct;
        const calStr = calPct != null ? `${calPct}% calorías` : 'sin objetivo calórico';
        return (
          `### ${row.pet_name}\n` +
          `• Nutrición: ${calStr} · ${row.meals_this_month} comidas este mes\n` +
          `• Ejercicio (7d): ${row.exercise_sessions_7d} sesiones · ${row.exercise_minutes_7d} min\n` +
          `• Vacunas: ${row.overdue_vaccines} vencida(s) · ${row.due_soon_vaccines} próxima(s)\n` +
          `• Última visita vet: ${row.last_vet_visit ?? 'sin registro'}\n` +
          (row.top_insight ? `• ⚠️ ${row.top_insight}` : '• ✅ Sin alertas prioritarias')
        );
      });

      const highlightLines: string[] = [];
      if (highlights?.most_exercise) {
        highlightLines.push(`🏃 Más ejercicio: **${highlights.most_exercise}**`);
      }
      if (highlights?.most_insights) {
        highlightLines.push(`🔔 Más alertas: **${highlights.most_insights}**`);
      }

      const disclaimer = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
      const highlightBlock =
        highlightLines.length > 0 ? `\n\n**Destacados**\n${highlightLines.join('\n')}` : '';

      return {
        message: `**Comparación de mascotas**\n\n${lines.join('\n\n')}${highlightBlock}${disclaimer}`,
        actionLink: { label: 'Ver diario de salud', path: '/health-journal' },
      };
    }

    case 'memory_list_facts': {
      const facts = (data.facts as Array<Record<string, unknown>>) ?? [];
      if (facts.length === 0) {
        return {
          message: 'Aún no tengo hechos guardados en mi memoria. Dime "recuerda que..." para guardar algo.',
        };
      }
      const lines = facts.map((f) => {
        const who = f.pet_name ? `**${f.pet_name}**` : 'General';
        return `• ${who} (${f.category}): ${f.fact_text}`;
      });
      return { message: `**Memoria guardada**\n\n${lines.join('\n')}` };
    }

    case 'memory_save_fact': {
      if (data?.error) {
        return { message: String(data.message ?? 'No pude guardar el hecho.') };
      }
      const who = data.pet_name ? ` sobre **${data.pet_name}**` : '';
      return {
        message: `¡Listo! Recordaré${who}: _${data.fact_text}_`,
      };
    }

    case 'memory_delete_fact': {
      if (data?.error) {
        return { message: String(data.message ?? 'No pude eliminar el hecho.') };
      }
      return {
        message: `Hecho eliminado de mi memoria: _${data.deleted_fact}_`,
      };
    }

    case 'exercise_list_recent': {
      const sessions = (data.sessions as Array<Record<string, unknown>>) ?? [];
      if (sessions.length === 0) {
        return {
          message: 'No tienes sesiones de ejercicio registradas todavía. ¿Quieres que registre una ahora?',
          actionLink: { label: 'Ir a Ejercicio', path: '/trazabilidad' },
        };
      }
      const lines = sessions.map(
        (s) =>
          `• **${s.pet_name}** — ${s.exercise_label} · ${s.duration_minutes} min · ${s.date}`,
      );
      return {
        message: `Tus sesiones recientes:\n\n${lines.join('\n')}`,
        actionLink: { label: 'Ver historial', path: '/trazabilidad' },
      };
    }

    case 'veterinary_list_sessions': {
      const sessions = (data.sessions as Array<Record<string, unknown>>) ?? [];
      if (sessions.length === 0) {
        return {
          message:
            'No encontré visitas veterinarias registradas con esos criterios. Puedes agregar una en Veterinaria Digital.',
          actionLink: { label: 'Ir a Veterinaria', path: '/veterinaria' },
        };
      }
      const lines = sessions.map((s) => {
        const costStr = s.cost != null ? ` · Q.${Number(s.cost).toFixed(2)}` : '';
        const docsStr = s.has_documents ? ' · 📄 documentos' : '';
        return `• **${s.pet_name}** — ${s.appointment_label} · ${s.date}${costStr}${docsStr}\n  ${s.diagnosis ?? 'Sin diagnóstico'}`;
      });
      const disclaimer = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
      return {
        message: `Historial veterinario — **${sessions.length}** visita(s):\n\n${lines.join('\n\n')}${disclaimer}`,
        actionLink: { label: 'Ver Veterinaria', path: '/veterinaria' },
      };
    }

    case 'veterinary_get_session': {
      if (data?.error === 'NO_SESSIONS' || data?.error === 'SESSION_NOT_FOUND') {
        return {
          message: String(data.message ?? 'No encontré esa visita veterinaria.'),
          actionLink: data.actionPath ? { label: 'Ir a Veterinaria', path: String(data.actionPath) } : undefined,
        };
      }
      if (data?.error === 'PET_REQUIRED' || data?.error === 'PET_NOT_FOUND' || data?.error === 'NO_PETS') {
        return {
          message: String(data.message),
          actionLink: data.actionPath ? { label: 'Registrar mascota', path: String(data.actionPath) } : undefined,
        };
      }
      const s = data.session as Record<string, unknown>;
      if (!s) return { message: 'No encontré detalles de esa visita.' };

      const parts = [
        `**${s.pet_name}** — ${s.appointment_label} · ${s.date}`,
        `• Veterinario: ${s.veterinarian_name}${s.veterinary_clinic ? ` (${s.veterinary_clinic})` : ''}`,
        `• Diagnóstico: ${s.diagnosis ?? 'No registrado'}`,
      ];
      if (s.treatment) parts.push(`• Tratamiento: ${s.treatment}`);
      if (s.prescription) parts.push(`• Receta: ${s.prescription}`);
      if (s.notes) parts.push(`• Notas: ${s.notes}`);
      if (s.follow_up_date) {
        parts.push(
          `• Seguimiento: ${s.follow_up_date}${s.follow_up_completed ? ' (completado)' : ' (pendiente)'}`,
        );
      }
      if (s.cost != null) parts.push(`• Costo: Q.${Number(s.cost).toFixed(2)}`);
      if (s.has_documents) parts.push('• Hay documentos adjuntos (PDF/factura) en el registro.');

      const disclaimer = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
      return {
        message: `Detalle de la visita:\n\n${parts.join('\n')}${disclaimer}`,
        actionLink: { label: 'Ver en Veterinaria', path: '/veterinaria' },
      };
    }

    case 'veterinary_vaccination_status': {
      if (data?.error === 'PET_REQUIRED' || data?.error === 'PET_NOT_FOUND' || data?.error === 'NO_PETS') {
        return {
          message: String(data.message),
          actionLink: data.actionPath ? { label: 'Registrar mascota', path: String(data.actionPath) } : undefined,
        };
      }
      const pets = (data.pets as Array<Record<string, unknown>>) ?? [];
      if (pets.length === 0) {
        return {
          message: 'No hay información de vacunación disponible.',
          actionLink: { label: 'Ir a Veterinaria', path: '/veterinaria' },
        };
      }

      const statusLabel: Record<string, string> = {
        current: 'Al día',
        due_soon: 'Próxima pronto',
        overdue: 'Vencida',
        unknown: 'Sin fecha programada',
      };

      const lines = pets.flatMap((p) => {
        if (!p.has_vaccination_records) {
          return [`• **${p.pet_name}**: sin vacunas registradas.`];
        }
        const vaccinations = (p.vaccinations as Array<Record<string, unknown>>) ?? [];
        if (vaccinations.length === 0) {
          return [`• **${p.pet_name}**: sin vacunas registradas.`];
        }
        return vaccinations.map((v) => {
          const status = statusLabel[String(v.status)] ?? String(v.status);
          const next = v.next_due_date ? ` · Próxima: ${v.next_due_date}` : '';
          return `• **${p.pet_name}** — ${v.vaccine_name} · Última: ${v.last_vaccination_date}${next} · **${status}**`;
        });
      });

      const disclaimer = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
      return {
        message: `Estado de vacunación:\n\n${lines.join('\n')}${disclaimer}`,
        actionLink: { label: 'Ver Veterinaria', path: '/veterinaria' },
      };
    }

    case 'veterinary_spending_summary': {
      const total = Number(data.total_cost ?? 0);
      const months = data.period_months ?? 12;
      const visitCount = data.visit_count ?? 0;
      if (visitCount === 0) {
        return {
          message: `No hay gastos veterinarios registrados en los últimos **${months}** meses.`,
          actionLink: { label: 'Ir a Veterinaria', path: '/veterinaria' },
        };
      }
      const byPet = (data.by_pet as Array<Record<string, unknown>>) ?? [];
      const petLines =
        byPet.length > 1
          ? `\n\nPor mascota:\n${byPet.map((p) => `• **${p.pet_name}**: Q.${Number(p.total_cost).toFixed(2)} (${p.visit_count} visitas)`).join('\n')}`
          : '';
      return {
        message:
          `Gastos veterinarios (últimos **${months}** meses):\n\n` +
          `• Total: **Q.${total.toFixed(2)}**\n` +
          `• Promedio por visita: Q.${Number(data.average_cost).toFixed(2)}\n` +
          `• Visitas con costo: **${visitCount}**${petLines}`,
        actionLink: { label: 'Ver Veterinaria', path: '/veterinaria' },
      };
    }

    case 'veterinary_register_visit': {
      if (
        data?.error === 'PET_REQUIRED' ||
        data?.error === 'PET_NOT_FOUND' ||
        data?.error === 'NO_PETS' ||
        data?.error === 'VET_REQUIRED' ||
        data?.error === 'DIAGNOSIS_REQUIRED' ||
        data?.error === 'SINGLE_PET_REQUIRED'
      ) {
        return {
          message: String(data.message),
          actionLink: data.actionPath ? { label: 'Continuar', path: String(data.actionPath) } : undefined,
        };
      }
      if (!data?.success) {
        return { message: 'No se pudo registrar la visita veterinaria.' };
      }
      const s = data.session as Record<string, unknown>;
      const parts = [
        `**${s.pet_name}** — ${s.appointment_label} · ${s.date}`,
        `• Veterinario: ${s.veterinarian_name}${s.veterinary_clinic ? ` (${s.veterinary_clinic})` : ''}`,
        `• Diagnóstico: ${s.diagnosis}`,
      ];
      if (s.treatment) parts.push(`• Tratamiento: ${s.treatment}`);
      if (s.prescription) parts.push(`• Receta: ${s.prescription}`);
      if (s.cost != null) parts.push(`• Costo: Q.${Number(s.cost).toFixed(2)}`);
      if (s.follow_up_date) parts.push(`• Seguimiento: ${s.follow_up_date}`);
      return {
        message: `¡Visita veterinaria registrada! ✅\n\n${parts.join('\n')}`,
        actionLink: { label: 'Ver Veterinaria', path: '/veterinaria' },
      };
    }

    case 'veterinary_set_follow_up': {
      if (
        data?.error === 'PET_REQUIRED' ||
        data?.error === 'PET_NOT_FOUND' ||
        data?.error === 'NO_PETS' ||
        data?.error === 'NO_SESSIONS' ||
        data?.error === 'FOLLOW_UP_DATE_REQUIRED'
      ) {
        return {
          message: String(data.message),
          actionLink: data.actionPath ? { label: 'Ir a Veterinaria', path: String(data.actionPath) } : undefined,
        };
      }
      if (!data?.success) {
        return { message: 'No se pudo programar el seguimiento.' };
      }
      const s = data.session as Record<string, unknown>;
      return {
        message:
          `¡Seguimiento programado! ✅\n\n` +
          `• **${s.pet_name}** — ${s.appointment_label}\n` +
          `• Próxima fecha: **${s.follow_up_date}**\n\n` +
          `Aparecerá en tus recordatorios.`,
        actionLink: { label: 'Ver Recordatorios', path: '/recordatorios' },
      };
    }

    case 'veterinary_vaccination_schedule': {
      if (data?.error === 'PET_REQUIRED' || data?.error === 'PET_NOT_FOUND' || data?.error === 'NO_PETS') {
        return {
          message: String(data.message),
          actionLink: data.actionPath ? { label: 'Registrar mascota', path: String(data.actionPath) } : undefined,
        };
      }

      const statusLabel: Record<string, string> = {
        current: 'Al día',
        due_soon: 'Próxima pronto',
        overdue: 'Vencida',
        unknown: 'Pendiente',
      };

      const pets = (data.pets as Array<Record<string, unknown>>) ?? [];
      const lines = pets.flatMap((pet) => {
        const schedule = (pet.schedule as Array<Record<string, unknown>>) ?? [];
        const header = [`**${pet.pet_name}**`];
        const items = schedule.map((item) => {
          const status = statusLabel[String(item.status)] ?? String(item.status);
          const last = item.last_administered_at ? ` · Última: ${item.last_administered_at}` : '';
          const next = item.next_due_date ? ` · Próxima: ${item.next_due_date}` : '';
          const core = item.is_core ? '' : ' (opcional)';
          return `• ${item.vaccine_name}${core}${last}${next} — **${status}**`;
        });
        return [...header, ...items];
      });

      const disclaimer = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
      return {
        message: `Calendario de vacunación:\n\n${lines.join('\n')}${disclaimer}`,
        actionLink: { label: 'Ver Veterinaria', path: '/veterinaria' },
      };
    }

    case 'veterinary_register_vaccination': {
      if (
        data?.error === 'PET_REQUIRED' ||
        data?.error === 'PET_NOT_FOUND' ||
        data?.error === 'NO_PETS'
      ) {
        return {
          message: String(data.message),
          actionLink: data.actionPath ? { label: 'Registrar mascota', path: String(data.actionPath) } : undefined,
        };
      }
      if (!data?.success) {
        return { message: 'No se pudo registrar la vacuna.' };
      }
      return {
        message:
          `¡Vacuna registrada! ✅\n\n` +
          `• **${data.pet_name}** — ${data.vaccine_name}\n` +
          `• Aplicada: ${data.administered_at}\n` +
          `• Próxima: ${data.next_due_date ?? 'Sin fecha programada'}\n\n` +
          `Aparecerá en tus recordatorios.`,
        actionLink: { label: 'Ver Recordatorios', path: '/recordatorios' },
      };
    }

    case 'veterinary_analyze_document': {
      if (data?.error === 'NO_DOCUMENT' || data?.error === 'PARSE_FAILED' || data?.error === 'NO_PETS') {
        return {
          message: String(data.message ?? 'No se pudo analizar el documento.'),
          actionLink: data.actionPath ? { label: 'Ir a Veterinaria', path: String(data.actionPath) } : undefined,
        };
      }

      const session = data.session as Record<string, unknown> | undefined;
      const extraction = data.extraction as Record<string, unknown> | undefined;
      const structured = (extraction?.structured_data as Record<string, unknown>) ?? {};
      const highlights = (structured.abnormal_highlights as string[]) ?? [];
      const findings = (structured.findings as Array<Record<string, unknown>>) ?? [];

      const lines = [
        session?.pet_name ? `**${session.pet_name}** — ${session.appointment_label ?? 'Visita veterinaria'}` : null,
        extraction?.summary ? String(extraction.summary) : null,
      ].filter(Boolean);

      if (highlights.length > 0) {
        lines.push('', '**A revisar con tu veterinario:**', ...highlights.map((h) => `• ${h}`));
      } else if (findings.length > 0) {
        lines.push(
          '',
          '**Algunos valores del documento:**',
          ...findings.slice(0, 8).map((f) => {
            const flag = f.flag && f.flag !== 'normal' ? ` (${f.flag})` : '';
            return `• ${f.name}: ${f.value ?? '—'} ${f.unit ?? ''}${flag}`.trim();
          }),
        );
      }

      const disclaimer = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
      return {
        message: `${lines.join('\n')}${disclaimer}`,
        actionLink: { label: 'Ver en Veterinaria', path: '/veterinaria' },
      };
    }

    case 'nutrition_list_foods': {
      const foods = (data.foods as Array<Record<string, unknown>>) ?? [];
      if (foods.length === 0) {
        return {
          message: 'No hay alimentos en el catálogo de Nutrición todavía.',
          actionLink: { label: 'Ir a Nutrición', path: '/feeding-schedules' },
        };
      }
      const lines = foods.map((f, i) => `• ${i + 1}. ${f.label}`);
      return {
        message:
          `Alimentos disponibles para registrar comidas (catálogo Nutrición):\n\n${lines.join('\n')}\n\n` +
          `Dime cuál quieres y cuántos gramos.`,
        actionLink: { label: 'Ir a Nutrición', path: '/feeding-schedules' },
      };
    }

    case 'nutrition_register_meal': {
      if (data?.error === 'NO_PETS') {
        return {
          message: String(data.message ?? 'Primero registra una mascota en PetHub.'),
          actionLink: { label: 'Registrar mascota', path: '/pet-creation' },
        };
      }
      if (data?.error === 'PET_REQUIRED' || data?.error === 'PET_NOT_FOUND') {
        return { message: String(data.message) };
      }
      if (data?.error === 'FOOD_REQUIRED' || data?.error === 'FOOD_NOT_FOUND' || data?.error === 'NO_FOODS') {
        return { message: String(data.message) };
      }
      if (data?.error === 'INVALID_QUANTITY') {
        return { message: String(data.message) };
      }
      if (data?.error === 'REGISTER_FAILED') {
        return { message: String(data.message) };
      }
      if (!data?.success) {
        return { message: 'No se pudo registrar la comida.' };
      }

      const multi = (data.sessions as Array<Record<string, unknown>>) ?? [];
      if (multi.length > 1) {
        const lines = multi.map(
          (s) =>
            `• **${s.pet_name}** — ${s.food_name} · ${s.quantity_grams}g` +
            (s.total_calories ? ` · ${s.total_calories} cal` : ''),
        );
        const partial = data.partial_errors as string[] | undefined;
        return {
          message:
            `¡Listo! Registré la comida para **${multi.length} mascotas**. ✅\n\n${lines.join('\n')}` +
            (partial?.length ? `\n\n⚠️ ${partial.join(' ')}` : ''),
          actionLink: { label: 'Ver Nutrición', path: '/feeding-schedules' },
        };
      }

      if (!data?.session) {
        return { message: 'No se pudo registrar la comida.' };
      }
      const s = data.session as Record<string, unknown>;
      return {
        message:
          `¡Listo! Registré la comida en Nutrición. ✅\n\n` +
          `• **${s.pet_name}** — ${s.meal_label}\n` +
          `• ${s.food_name} · ${s.quantity_grams}g` +
          (s.total_calories ? ` · ${s.total_calories} cal` : '') +
          `\n• Fecha: ${s.date}` +
          (s.feeding_time ? ` · ${s.feeding_time}` : ''),
        actionLink: { label: 'Ver Nutrición', path: '/feeding-schedules' },
      };
    }

    case 'nutrition_create_schedule': {
      if (data?.error === 'NO_PETS') {
        return {
          message: String(data.message ?? 'Primero registra una mascota en PetHub.'),
          actionLink: { label: 'Registrar mascota', path: '/pet-creation' },
        };
      }
      if (
        data?.error === 'PET_REQUIRED' ||
        data?.error === 'PET_NOT_FOUND' ||
        data?.error === 'TIMES_REQUIRED' ||
        data?.error === 'FOOD_REQUIRED' ||
        data?.error === 'FOOD_NOT_FOUND' ||
        data?.error === 'NO_FOODS' ||
        data?.error === 'INVALID_QUANTITY' ||
        data?.error === 'SCHEDULE_FAILED'
      ) {
        return { message: String(data.message) };
      }
      if (!data?.success) {
        return { message: 'No se pudo crear el horario de alimentación.' };
      }

      const multi = (data.schedules as Array<Record<string, unknown>>) ?? [];
      if (multi.length > 1) {
        const lines = multi.map(
          (s) =>
            `• **${s.pet_name}** — ${s.schedule_name} · ${s.times} · ${s.food_name} · ${s.quantity_grams}g`,
        );
        const partial = data.partial_errors as string[] | undefined;
        return {
          message:
            `¡Listo! Creé horarios recurrentes para **${multi.length} mascotas**. ✅\n\n${lines.join('\n')}\n\n` +
            `Las comidas se generarán automáticamente en Nutrición.` +
            (partial?.length ? `\n\n⚠️ ${partial.join(' ')}` : ''),
          actionLink: { label: 'Ver horarios', path: '/feeding-schedules' },
        };
      }

      if (!data?.schedule) {
        return { message: 'No se pudo crear el horario.' };
      }
      const s = data.schedule as Record<string, unknown>;
      return {
        message:
          `¡Listo! Creé el horario recurrente **${s.schedule_name}** para **${s.pet_name}**. ✅\n\n` +
          `• Horas: ${s.times}\n` +
          `• ${s.food_name} · ${s.quantity_grams}g por comida\n` +
          `• Todos los días de la semana\n\n` +
          `Las comidas aparecerán automáticamente en la pestaña Comidas de Nutrición.`,
        actionLink: { label: 'Ver horarios', path: '/feeding-schedules' },
      };
    }

    case 'nutrition_list_scheduled': {
      if (data?.error === 'PET_NOT_FOUND' || data?.error === 'PET_REQUIRED') {
        return { message: String(data.message) };
      }
      const meals = (data.meals as Array<Record<string, unknown>>) ?? [];
      const days = (data.days as number) ?? 7;

      if (meals.length === 0) {
        const schedules = (data.schedules as Array<Record<string, unknown>>) ?? [];
        if (schedules.length > 0) {
          return {
            message:
              `No hay comidas generadas en el calendario para los próximos **${days} días**, pero tienes **${schedules.length}** horario(s) activo(s). ` +
              `Puedo generarlas o revisar duplicados si hace falta.`,
            actionLink: { label: 'Ver Nutrición', path: '/feeding-schedules' },
          };
        }
        return {
          message: `No tienes comidas programadas en los próximos **${days} días**. ¿Quieres crear un horario recurrente?`,
          actionLink: { label: 'Ir a Nutrición', path: '/feeding-schedules' },
        };
      }

      const formatDate = (iso: string) => {
        const [y, m, d] = iso.split('-');
        return `${Number(d)}/${Number(m)}/${y}`;
      };

      const lines = meals.map(
        (m) =>
          `• **${m.pet_name}** — ${formatDate(String(m.scheduled_date))} · ${m.scheduled_time} · ${m.meal_label} · ${m.food_name} · ${m.quantity_grams}g`,
      );

      return {
        message:
          `Comidas programadas (próximos **${days} días**) — **${meals.length}** en calendario:\n\n${lines.join('\n')}`,
        actionLink: { label: 'Ver calendario', path: '/feeding-schedules' },
      };
    }

    case 'nutrition_deduplicate_scheduled': {
      if (!data?.success) {
        return { message: 'No se pudieron revisar las comidas duplicadas.' };
      }
      return {
        message: String(data.message),
        actionLink: { label: 'Ver Nutrición', path: '/feeding-schedules' },
      };
    }

    case 'nutrition_complete_scheduled': {
      if (data?.error === 'PET_NOT_FOUND' || data?.error === 'PET_REQUIRED') {
        return { message: String(data.message) };
      }
      if (data?.error === 'NO_MEALS' || data?.completed === 0) {
        return {
          message: String(data.message ?? 'No encontré comidas programadas pendientes para completar.'),
          actionLink: { label: 'Ver calendario', path: '/feeding-schedules' },
        };
      }
      if (!data?.success) {
        return { message: 'No se pudieron completar las comidas programadas.' };
      }

      const completed = Number(data.completed ?? 0);
      const byPet = (data.by_pet as Record<string, number>) ?? {};
      const petLines = Object.entries(byPet).map(([pet, count]) => `• **${pet}**: ${count} comida(s)`);
      const date = data.date as string | undefined;
      const days = data.days as number | undefined;
      const scope = date
        ? `del **${date.split('-').reverse().join('/')}**`
        : `de los próximos **${days ?? 7} días**`;
      const partial = data.partial_errors as string[] | undefined;

      return {
        message:
          `¡Listo! Marqué **${completed}** comida(s) programada(s) como completadas ${scope}. ✅\n\n` +
          `${petLines.join('\n')}` +
          (partial?.length ? `\n\n⚠️ Algunas no se pudieron: ${partial.slice(0, 3).join('; ')}` : ''),
        actionLink: { label: 'Ver Nutrición', path: '/feeding-schedules' },
      };
    }

    case 'nutrition_list_recent': {
      const sessions = (data.sessions as Array<Record<string, unknown>>) ?? [];
      if (sessions.length === 0) {
        const period = data.period_hours ? ` en las últimas ${data.period_hours} horas` : '';
        return {
          message: `No tienes comidas registradas${period}. ¿Quieres que registre una ahora?`,
          actionLink: { label: 'Ir a Nutrición', path: '/feeding-schedules' },
        };
      }

      const periodHours = data.period_hours as number | undefined;
      const header = periodHours
        ? `Historial de alimentación (últimas ${periodHours} horas) — **${sessions.length}** registro(s):`
        : `Tus comidas recientes — **${sessions.length}** registro(s):`;

      const formatDate = (iso: string) => {
        const [y, m, d] = iso.split('-');
        return `${Number(d)}/${Number(m)}/${y}`;
      };

      const lines = sessions.map((s) => {
        const dateStr = s.date ? formatDate(String(s.date)) : '';
        const timeStr = s.feeding_time ? ` · ${s.feeding_time}` : '';
        const calStr = s.total_calories ? ` · ${s.total_calories} cal` : '';
        return `• **${s.pet_name}** — ${dateStr}${timeStr} · ${s.meal_label} · ${s.food_name} · ${s.quantity_grams}g${calStr}`;
      });

      const truncated = data.truncated as boolean | undefined;
      const tail = truncated
        ? '\n\n⚠️ Hay más registros en ese período. Abre Nutrición para ver el historial completo.'
        : '';

      return {
        message: `${header}\n\n${lines.join('\n')}${tail}`,
        actionLink: { label: 'Ver Nutrición', path: '/feeding-schedules' },
      };
    }

    case 'catalog_import_from_url': {
      if (data?.error === 'IMPORT_FAILED') {
        return { message: String(data.message ?? 'No se pudo importar el producto.') };
      }
      if (data?.error === 'STOCK_REQUIRED' && data?.extracted) {
        const e = data.extracted as Record<string, unknown>;
        return {
          message:
            `Extraje el producto de la URL:\n\n` +
            `• **${e.product_name}** (${e.product_category})\n` +
            `• Precio: Q.${Number(e.price).toFixed(2)}\n` +
            `• ${e.description}\n\n` +
            `¿Cuántas unidades quieres tener en **stock inicial**? (ej. 10, 50, 100)`,
        };
      }
      if (data?.created && data?.product) {
        const p = data.product as Record<string, unknown>;
        const source = data.source_url as string | undefined;
        return {
          message:
            `¡Producto importado y creado! 🎉\n\n` +
            `• **${p.name}** (${p.category})${p.brand ? ` · ${p.brand}` : ''}\n` +
            `• Precio: Q.${Number(p.price).toFixed(2)} · Stock: ${p.stock ?? 0}\n` +
            (source ? `\n• Fuente: ${source}\n` : '\n') +
            `\nRevisa los detalles en tu catálogo de proveedor.`,
          actionLink: { label: 'Ver catálogo', path: '/provider' },
        };
      }
      if (data?.extracted) {
        const e = data.extracted as Record<string, unknown>;
        return {
          message:
            `Extraje el producto de la URL:\n\n` +
            `• **${e.product_name}** (${e.product_category})\n` +
            `• Precio: Q.${Number(e.price).toFixed(2)}\n` +
            `• ${e.description}`,
        };
      }
      return { message: 'Importación completada.' };
    }

    case 'catalog_create_product': {
      if (data?.error === 'STOCK_REQUIRED') {
        return {
          message: String(
            data.message ??
              '¿Cuántas unidades quieres tener en **stock inicial** antes de crear el producto?'
          ),
        };
      }
      if (!data.success) {
        return { message: 'No se pudo crear el producto. Intenta de nuevo.' };
      }
      const p = data.product as Record<string, unknown>;
      return {
        message:
          `¡Producto creado! 🎉\n\n` +
          `• **${p.name}** (${p.category})\n` +
          `• Precio: Q.${Number(p.price).toFixed(2)} · Stock: ${p.stock}\n\n` +
          `Ya está en tu catálogo. Puedes editarlo en el dashboard de proveedor.`,
        actionLink: { label: 'Ver catálogo', path: '/provider' },
      };
    }

    case 'catalog_create_service': {
      if (!data.success) {
        const err = data.error as string | undefined;
        return { message: err ?? 'No se pudo crear el servicio. Intenta de nuevo.' };
      }
      const s = data.service as Record<string, unknown>;
      const priceLines: string[] = [];
      if (s.priceSmall != null) priceLines.push(`Pequeño: Q.${Number(s.priceSmall).toFixed(2)}`);
      if (s.priceMedium != null) priceLines.push(`Mediano: Q.${Number(s.priceMedium).toFixed(2)}`);
      if (s.priceLarge != null) priceLines.push(`Grande: Q.${Number(s.priceLarge).toFixed(2)}`);
      if (s.priceExtraLarge != null) {
        priceLines.push(`Extra grande: Q.${Number(s.priceExtraLarge).toFixed(2)}`);
      }
      const pricingText =
        priceLines.length > 0
          ? priceLines.join(' · ')
          : `Precio: Q.${Number(s.price).toFixed(2)}`;
      const catNote =
        typeof s.detailedDescription === 'string' && s.detailedDescription.includes('gato')
          ? `\n• ${s.detailedDescription}`
          : '';
      return {
        message:
          `¡Servicio creado! 🎉\n\n` +
          `• **${s.name}** (${s.category})\n` +
          `• ${pricingText} · Duración: ${s.durationMinutes} min${catNote}\n\n` +
          `Ya está en tu catálogo. Configura horarios en el dashboard de proveedor.`,
        actionLink: { label: 'Ver servicios', path: '/provider' },
      };
    }

    default:
      return { message: JSON.stringify(data, null, 2).slice(0, 500) };
  }
}

export function getGreeting(userName?: string, voiceMode?: boolean, userRole?: string): string {
  return buildChatGreeting(getMascotDashboardForRole(userRole), userName, voiceMode);
}

export function getHelpMessage(ctx?: { providerId?: string }): string {
  const modules = ctx?.providerId
    ? aiRegistry.getModulesForContext({ providerId: ctx.providerId })
    : aiRegistry.getAllModules();
  const examples = ctx?.providerId
    ? [
        '¿Qué productos de alimento hay?',
        'Crea un producto: collar nylon Q.45 stock 10',
        'Importa producto desde URL de tienda online',
        'Agrega servicio grooming: pequeño Q.50 mediano Q.100 grande Q.150 gatos Q.75, 60 min',
        '¿Cuántos perros hay en adopción?',
        '¿Hay mascotas perdidas?',
      ]
    : [
        '¿Cómo están mis mascotas?',
        '¿Tengo recordatorios pendientes?',
        'Recomiéndame productos en el marketplace',
        'Agrégalo al carrito',
        '¿Cuándo puedo agendar grooming?',
        '¿Dónde está mi pedido?',
        'Dame mi briefing de hoy',
        '¿Hay mascotas en adopción?',
        'Registra 30 min de caminata para mi perro',
        '¿Cuándo fue la última visita al veterinario?',
        '¿Qué horarios de comida tiene mi mascota?',
        'Recuérdame dar medicamento mañana a las 8am',
        'Agrega un perro llamado Rocky, mestizo, 2 años',
        'Quiero adoptar a Simba',
        'Reporta que Luna se perdió en zona 10, mi teléfono 5555-5555',
        'Activa a Max para parejas',
        'Actualiza mi teléfono a 4444-4444',
      ];
  return (
    `Puedo consultar datos en tiempo real de:\n\n${modules.map((m) => `• **${m.name}** — ${m.description}`).join('\n')}\n\n` +
    `**Ejemplos:**\n${examples.map((e) => `• "${e}"`).join('\n')}`
  );
}
