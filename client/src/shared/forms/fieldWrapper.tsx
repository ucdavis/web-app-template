import { ReactNode } from 'react';
import { useFieldContext } from './formContext.tsx';

interface FieldWrapperProps {
  children: ReactNode;
  hint?: string;
  label: string;
}

/**
 * Common wrapper component for form fields that handles label, error display, and validation state
 */
export function FieldWrapper({ children, hint, label }: FieldWrapperProps) {
  const field = useFieldContext<unknown>();
  const hasError = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorMessage = getFieldErrorMessage(field.state.meta.errors);

  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text font-medium">{label}</span>
      </label>
      {children}
      {hasError && (
        <label className="label">
          <span className="label-text-alt text-error" role="alert">
            {errorMessage}
          </span>
        </label>
      )}
      {!hasError && hint ? (
        <label className="label">
          <span className="label-text-alt text-base-content/60">{hint}</span>
        </label>
      ) : null}
      {field.state.meta.isValidating && (
        <span className="loading loading-spinner loading-xs ml-2"></span>
      )}
    </div>
  );
}

export function getFieldErrorMessage(errors: unknown[]) {
  const messages = errors
    .map((error) => {
      if (typeof error === 'string') {
        return error;
      }

      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
      ) {
        return error.message;
      }

      return '';
    })
    .filter(Boolean);

  return [...new Set(messages)]
    .join(', ');
}
