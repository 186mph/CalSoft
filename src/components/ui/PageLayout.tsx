import React, { ReactNode } from 'react';
import { Button } from './Button';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: { label: string; to?: string }[];
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  children,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="pb-12">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4">
          <ol className="flex items-center space-x-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-dark-primary/40 dark:text-dark-secondary/40">/</span>
                )}
                {crumb.to ? (
                  <a
                    href={crumb.to}
                    className="text-dark-primary/80 dark:text-dark-secondary/80 hover:text-dark-accent dark:hover:text-dark-accent"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-dark-primary dark:text-dark-secondary font-medium">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header */}
      <header className="mb-8 bg-white dark:bg-dark-200 p-6 rounded-lg border-2 border-dark-accent/20 dark:border-dark-accent/10 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-dark-primary dark:text-dark-secondary">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-dark-primary/60 dark:text-dark-secondary/60 max-w-3xl">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex gap-3 justify-end">{actions}</div>}
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
};

export default PageLayout; 