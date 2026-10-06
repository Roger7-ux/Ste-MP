import { CalendarCheck, Gauge, Search, Share2, Siren, Ticket, Users } from 'lucide-react';

// Product copy that describes how this system actually behaves.

// What sets MediQ apart. Each point is a feature that exists in the app.
export const USP_POINTS = [
  {
    icon: Ticket,
    title: 'A live ticket, not just a booking',
    text: 'After check-in your appointment shows your place in line and an estimated wait, and tells you when you are next.',
  },
  {
    icon: Gauge,
    title: 'Honest pace',
    text: 'If the doctor is running behind today, you see by how much before you leave home, with the time to expect.',
  },
  {
    icon: Siren,
    title: 'Fair emergencies',
    text: 'Urgent cases go first. Everyone else is told why, and their wait is worked out again straight away.',
  },
  {
    icon: Share2,
    title: 'Share with family',
    text: 'Send a tracking link to someone waiting with you or at home. They need no account, and it shows no personal details.',
  },
];

// How a visit differs from one booked through a system that stops at booking.
export const COMPARISON = [
  {
    moment: 'After you book',
    usual: 'A confirmation with a time',
    here: 'A live ticket with its own tracking link',
  },
  {
    moment: 'On the day',
    usual: 'You arrive and wait to be called',
    here: 'Your place in line, an estimated wait, and an alert when you are next',
  },
  {
    moment: 'If the doctor runs late',
    usual: 'You find out in the waiting room',
    here: 'The delay is shown publicly, with the time to expect',
  },
  {
    moment: 'If an emergency arrives',
    usual: 'The queue changes without explanation',
    here: 'You are told, and your wait is re-estimated',
  },
  {
    moment: 'For family',
    usual: 'Phone calls to ask how long',
    here: 'A tracking link that needs no account',
  },
];

export const HOW_IT_WORKS = [
  { icon: Search, title: 'Find a doctor', text: 'Search by name or specialty and compare fees and open times.' },
  { icon: CalendarCheck, title: 'Pick a time', text: 'Choose a day and a slot that suits you, up to two weeks ahead.' },
  { icon: Ticket, title: 'Get your ID', text: 'Your appointment ID is your ticket. Quote it at the front desk.' },
  { icon: Users, title: 'Track the queue', text: 'Once checked in, see your place in line and when you are next.' },
];

export const FAQ = [
  {
    question: 'How do I book an appointment?',
    answer:
      'Find a doctor, choose a day and time, and confirm. You need a free patient account so we can keep the appointment under your name.',
  },
  {
    question: 'Can I cancel or change my appointment?',
    answer:
      'Yes. Until you check in at the clinic, you can cancel or move your appointment to another open time from My appointments. After check-in, please speak to the front desk.',
  },
  {
    question: 'When do I pay the consultation fee?',
    answer:
      'The fee shown when you book is the fee for your visit, even if the doctor’s fee changes later. No payment is taken through this website.',
  },
  {
    question: 'What should I bring?',
    answer:
      'Bring your appointment ID and quote it at the front desk when you arrive. It starts with your doctor’s initials, for example RS-261001-0042. It helps to bring any current medicines or recent test results.',
  },
  {
    question: 'How does the live queue work?',
    answer:
      'When the front desk checks you in, your appointment shows your place in the doctor’s queue and an estimated wait. It updates by itself and tells you when you are next and when you are called.',
  },
];
