import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { parseDate } from '../utils/format.js';

const ClinicContext = createContext(null);

// Loads the clinic's details and opening hours once. The footer, contact page
// and the booking date strip all read the same hours, so they cannot disagree.
export function ClinicProvider({ children }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = (attempt = 0) =>
      api
        .get('/clinic')
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch(() => {
          if (!cancelled && attempt < 3) setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
        });
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => {
    const clinic = data?.clinic || null;
    return {
      clinic,
      bookingWindowDays: data?.bookingWindowDays || 14,
      staffSignupEnabled: Boolean(data?.staffSignupEnabled),
      // Opening hours for a 'YYYY-MM-DD' date; null when closed or not loaded.
      hoursOn(date) {
        const entry = clinic?.hours[parseDate(date).getDay()];
        return entry?.open ? entry : null;
      },
    };
  }, [data]);

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
}

export function useClinic() {
  return useContext(ClinicContext);
}

// 'Mon–Sat 09:00–18:00' style summary: consecutive days with the same hours
// are grouped.
export function summariseHours(hours) {
  const ordered = [...hours.slice(1), hours[0]]; // start the week on Monday
  const groups = [];
  for (const entry of ordered) {
    const text = entry.open ? `${entry.open}–${entry.close}` : 'Closed';
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.to = entry.label;
    else groups.push({ from: entry.label, to: entry.label, text });
  }
  return groups.map((group) => ({
    days: group.from === group.to ? group.from.slice(0, 3) : `${group.from.slice(0, 3)}–${group.to.slice(0, 3)}`,
    text: group.text,
    closed: group.text === 'Closed',
  }));
}
