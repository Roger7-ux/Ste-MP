import { Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../../utils/constants.js';
import { cn } from '../../utils/cn.js';

export default function Logo({ to = '/', className }) {
  return (
    <Link to={to} className={cn('group flex shrink-0 items-center gap-2 rounded-button sm:gap-2.5', className)} aria-label={`${SITE_NAME} home`}>
      <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-[10px] bg-primary text-primary-foreground transition-transform duration-300 ease-soft group-hover:-rotate-6 group-hover:scale-105">
        <Stethoscope className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight whitespace-nowrap sm:text-xl">{SITE_NAME}</span>
    </Link>
  );
}
