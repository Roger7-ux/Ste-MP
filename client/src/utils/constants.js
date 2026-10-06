import { Baby, Bone, Ear, HeartPulse, Stethoscope, Sun } from 'lucide-react';

export const SITE_NAME = 'MediQ';

// Presentation details for each specialty. The names match the server's list.
export const SPECIALTIES = [
  {
    name: 'Cardiology',
    slug: 'cardiology',
    icon: HeartPulse,
    blurb: 'Heart, circulation and blood pressure.',
    about:
      'Cardiology looks after the heart and blood vessels: checking symptoms such as chest pain or palpitations, managing blood pressure and cholesterol, and helping you lower your long-term risk.',
    reasons: ['Chest pain or tightness', 'Palpitations', 'High blood pressure', 'Breathlessness on exertion', 'Family history of heart disease'],
  },
  {
    name: 'Dermatology',
    slug: 'dermatology',
    icon: Sun,
    blurb: 'Skin, hair and nails.',
    about:
      'Dermatology covers conditions of the skin, hair and nails, from acne and eczema to mole checks, for adults and children.',
    reasons: ['Acne', 'Eczema or dry, itchy skin', 'Rashes', 'Hair loss', 'A mole that has changed'],
  },
  {
    name: 'ENT',
    slug: 'ent',
    icon: Ear,
    blurb: 'Ear, nose and throat.',
    about:
      'Ear, nose and throat care for sinus and allergy problems, ear infections, hearing concerns and sore throats that keep coming back.',
    reasons: ['Blocked or painful ears', 'Sinus pressure', 'Recurring sore throat', 'Hearing changes', 'Snoring'],
  },
  {
    name: 'General Medicine',
    slug: 'general-medicine',
    icon: Stethoscope,
    blurb: 'Everyday illness and check-ups.',
    about:
      'General medicine is the first stop for most visits: fevers and infections, routine check-ups, and ongoing care for long-term conditions.',
    reasons: ['Fever or infection', 'Routine check-up', 'Diabetes or thyroid review', 'Tiredness', 'Not sure who to see'],
  },
  {
    name: 'Orthopedics',
    slug: 'orthopedics',
    icon: Bone,
    blurb: 'Bones, joints and injuries.',
    about:
      'Orthopedics treats bones, joints and muscles: sports injuries, fractures, and back, neck, knee or shoulder pain.',
    reasons: ['Knee or shoulder pain', 'Back or neck pain', 'Sports injury', 'Suspected fracture', 'Joint stiffness'],
  },
  {
    name: 'Pediatrics',
    slug: 'pediatrics',
    icon: Baby,
    blurb: 'Babies, children and teenagers.',
    about:
      'Pediatrics cares for children from birth to eighteen: growth and development checks, vaccinations, and the coughs, colds and worries in between.',
    reasons: ['Vaccinations', 'Growth and development check', 'Fever or cough', 'Feeding concerns', 'Skin rashes'],
  },
];

export const SPECIALTY_NAMES = SPECIALTIES.map((specialty) => specialty.name);
export const specialtyBySlug = (slug) => SPECIALTIES.find((specialty) => specialty.slug === slug);
export const specialtyByName = (name) => SPECIALTIES.find((specialty) => specialty.name === name);

// Label, colours and symbol for each appointment status. The symbol means a
// status is never told apart by colour alone.
export const STATUS_META = {
  BOOKED: { label: 'Booked', tone: 'booked', symbol: '●' },
  WAITING: { label: 'Waiting', tone: 'waiting', symbol: '◔' },
  CALLED: { label: 'Called', tone: 'called', symbol: '▸' },
  IN_CONSULTATION: { label: 'In consultation', tone: 'consult', symbol: '◆' },
  COMPLETED: { label: 'Completed', tone: 'completed', symbol: '✓' },
  CANCELLED: { label: 'Cancelled', tone: 'cancelled', symbol: '✕' },
  NO_SHOW: { label: 'Not arrived', tone: 'noshow', symbol: '–' },
};

export const ACTIVE_STATUSES = ['BOOKED', 'WAITING', 'CALLED', 'IN_CONSULTATION'];

// The one-click next step staff take from each status.
export const NEXT_ACTION = {
  BOOKED: { status: 'WAITING', label: 'Check in' },
  WAITING: { status: 'CALLED', label: 'Call' },
  CALLED: { status: 'IN_CONSULTATION', label: 'Start' },
  IN_CONSULTATION: { status: 'COMPLETED', label: 'Complete' },
};

// The stages a patient sees on the queue tracker, in order.
export const TRACKER_STEPS = [
  { status: 'BOOKED', label: 'Booked', timestamp: 'bookedAt' },
  { status: 'WAITING', label: 'Checked in', timestamp: 'checkedInAt' },
  { status: 'CALLED', label: 'Called', timestamp: 'calledAt' },
  { status: 'IN_CONSULTATION', label: 'In consultation', timestamp: 'startedAt' },
  { status: 'COMPLETED', label: 'Completed', timestamp: 'completedAt' },
];

export const REASON_MAX_LENGTH = 500;

// How often each live screen asks the server for changes, in milliseconds.
export const REFRESH_MS = { doctor: 5000, display: 5000 };

// 'Token 7': the day's queue number, given at check-in.
export const tokenLabel = (number) => (number ? `Token ${number}` : '');
