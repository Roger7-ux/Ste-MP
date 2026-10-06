import { LinkButton } from '../components/ui/Button.jsx';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function NotFound() {
  usePageMeta('Page not found');
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <p aria-hidden="true" className="font-display text-8xl leading-none text-primary sm:text-9xl dark:text-foreground">
        404
      </p>
      <h1 className="mt-4 text-3xl">Page not found</h1>
      <p className="mt-2 text-muted">The page you are looking for does not exist or has moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton to="/">Go home</LinkButton>
        <LinkButton to="/doctors" variant="secondary">
          Find a doctor
        </LinkButton>
      </div>
    </div>
  );
}
