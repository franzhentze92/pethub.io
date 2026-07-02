import {
  Mail, Phone, MapPin, Clock, MessageCircle, Headphones,
  Building2, HelpCircle, type LucideIcon,
} from 'lucide-react';

export interface ContactChannel {
  icon: LucideIcon;
  title: string;
  details: string[];
  gradient: string;
  href?: string;
}

export interface InquiryType {
  value: string;
  label: string;
}

export const contactChannels: ContactChannel[] = [
  {
    icon: Mail,
    title: 'Email',
    details: ['info@pethub.gt', 'soporte@pethub.gt'],
    gradient: 'from-landing-aqua to-landing-mint',
    href: 'mailto:info@pethub.gt',
  },
  {
    icon: Phone,
    title: 'Teléfono',
    details: ['+502 1234-5678', '+502 9876-5432'],
    gradient: 'from-landing-mint to-landing-aqua',
    href: 'tel:+50212345678',
  },
  {
    icon: MapPin,
    title: 'Cobertura',
    details: ['Latinoamérica', 'Operación regional'],
    gradient: 'from-landing-mango to-landing-tropical',
  },
  {
    icon: Clock,
    title: 'Horarios',
    details: ['Lun – Vie: 8:00 AM – 6:00 PM', 'Sáb: 9:00 AM – 2:00 PM'],
    gradient: 'from-landing-aqua to-landing-mango',
  },
];

export const inquiryTypes: InquiryType[] = [
  { value: 'general', label: 'Consulta general' },
  { value: 'technical', label: 'Soporte técnico' },
  { value: 'provider', label: 'Registro como proveedor' },
  { value: 'shelter', label: 'Registro como refugio' },
  { value: 'adoption', label: 'Proceso de adopción' },
  { value: 'marketplace', label: 'Marketplace y pedidos' },
  { value: 'feedback', label: 'Comentarios y sugerencias' },
  { value: 'other', label: 'Otro' },
];

export const officeHours = [
  { day: 'Lunes – Viernes', hours: '8:00 AM – 6:00 PM', open: true },
  { day: 'Sábado', hours: '9:00 AM – 2:00 PM', open: true },
  { day: 'Domingo', hours: 'Cerrado', open: false },
];

export const supportHighlights = [
  {
    icon: MessageCircle,
    title: 'Respuesta en 24h',
    description: 'Tiempo promedio de respuesta a consultas por email y formulario.',
    gradient: 'from-landing-aqua to-landing-mint',
  },
  {
    icon: Headphones,
    title: 'Soporte en español',
    description: 'Atención personalizada para dueños, proveedores y refugios.',
    gradient: 'from-landing-mango to-landing-tropical',
  },
  {
    icon: Building2,
    title: 'Enfoque latinoamericano',
    description: 'Plataforma pensada para dueños, proveedores y refugios en toda Latinoamérica.',
    gradient: 'from-landing-mint to-landing-aqua',
  },
  {
    icon: HelpCircle,
    title: 'Centro de ayuda',
    description: '35+ preguntas frecuentes organizadas por categoría y rol.',
    gradient: 'from-landing-aqua to-landing-mango',
  },
];

