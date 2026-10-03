import {
  Apple,
  Briefcase,
  Building2,
  Car,
  Clapperboard,
  Drama,
  FlaskConical,
  Flag,
  Flower2,
  Gamepad2,
  Guitar,
  Hammer,
  Hash,
  HeartPulse,
  Leaf,
  Mountain,
  Music,
  PawPrint,
  Shirt,
  Sparkles,
  Star,
  Tag,
  Trophy,
  Tv,
  UserRound,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";

const MAP: [RegExp, LucideIcon][] = [
  [/stadt|städt|ort|hauptstadt/, Building2],
  [/land|länder|staat/, Flag],
  [/fluss|flüss|gewässer|see|meer/, Waves],
  [/vorname|name|person/, UserRound],
  [/tier/, PawPrint],
  [/beruf|job/, Briefcase],
  [/pflanze|baum/, Leaf],
  [/blume/, Flower2],
  [/essen|gericht|speise|lebensmittel/, UtensilsCrossed],
  [/obst|gemüse|frucht/, Apple],
  [/marke|firma|unternehmen/, Tag],
  [/sport/, Trophy],
  [/film|kino/, Clapperboard],
  [/serie|sendung|fernseh/, Tv],
  [/band|musik|song|lied|sänger/, Music],
  [/instrument/, Guitar],
  [/spiel|game/, Gamepad2],
  [/promi|star|berühmt/, Star],
  [/comic|figur|held/, Drama],
  [/krankheit|körper|organ/, HeartPulse],
  [/element|chemie/, FlaskConical],
  [/werkzeug/, Hammer],
  [/gebirge|berg/, Mountain],
  [/auto|fahrzeug/, Car],
  [/kleidung|mode/, Shirt],
  [/magie|zauber|fantasy/, Sparkles],
];

export function categoryIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  return MAP.find(([re]) => re.test(n))?.[1] ?? Hash;
}

export function CategoryIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const Icon = categoryIcon(name);
  return <Icon className={className} aria-hidden="true" strokeWidth={2.2} />;
}
