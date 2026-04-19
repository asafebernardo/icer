import {
  Baby,
  BookOpen,
  Church,
  Clock,
  Coffee,
  HandHeart,
  Heart,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Mic2,
  Moon,
  Music,
  Sparkles,
  Sun,
  Users,
  UtensilsCrossed,
} from "lucide-react";

/** Opções de ícone para cada horário da programação (valor guardado na entidade). */
export const PROGRAM_ICON_OPTIONS = [
  { value: "Clock", label: "Geral / horário", Icon: Clock },
  { value: "Music", label: "Louvor", Icon: Music },
  { value: "Mic2", label: "Palavra / pregação", Icon: Mic2 },
  { value: "Users", label: "Participação", Icon: Users },
  { value: "Coffee", label: "Intervalo / café", Icon: Coffee },
  { value: "UtensilsCrossed", label: "Refeição / ceia", Icon: UtensilsCrossed },
  { value: "HandHeart", label: "Oração", Icon: HandHeart },
  { value: "HeartHandshake", label: "Comunhão / acolhimento", Icon: HeartHandshake },
  { value: "BookOpen", label: "Estudo bíblico", Icon: BookOpen },
  { value: "Baby", label: "Crianças", Icon: Baby },
  { value: "Heart", label: "Comunhão (ceia)", Icon: Heart },
  { value: "Church", label: "Culto / templo", Icon: Church },
  { value: "Sparkles", label: "Especial / abertura", Icon: Sparkles },
  { value: "Sun", label: "Manhã", Icon: Sun },
  { value: "Moon", label: "Noite", Icon: Moon },
  { value: "MessageCircle", label: "Mensagem / aviso", Icon: MessageCircle },
  { value: "MapPin", label: "Local / deslocamento", Icon: MapPin },
];

const FALLBACK = Clock;

export function ProgramIcon({ name, className = "h-4 w-4 shrink-0" }) {
  const opt = PROGRAM_ICON_OPTIONS.find((o) => o.value === name);
  const Cmp = opt?.Icon ?? FALLBACK;
  return <Cmp className={className} />;
}

export function programIconLabel(value) {
  return PROGRAM_ICON_OPTIONS.find((o) => o.value === value)?.label ?? "Geral";
}
