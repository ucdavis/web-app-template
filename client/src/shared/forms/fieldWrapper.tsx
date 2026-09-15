import { ReactNode } from 'react';
import { useFieldContext } from './formContext.tsx';

interface FieldWrapperProps {
  children: ReactNode;
  controlId: string;
  label: string;
}

/**
 * Common wrapper component for form fields that handles label, error display, and validation state
 */
export function FieldWrapper({
  children,
  controlId,
  label,
}: FieldWrapperProps) {
  const field = useFieldContext<string>();
  const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <div className="form-control w-full">
      <label className="label" htmlFor={controlId}>
        <span className="label-text font-medium">{label}</span>
      </label>
      {children}
      {hasError && (
        <div className="label">
          <span
            className="label-text-alt text-error"
            id={`${controlId}-error`}
            role="alert"
          >
            {field.state.meta.errors.map((err) => err.message).join(', ')}
          </span>
        </div>
      )}
      {field.state.meta.isValidating && (
        <span className="loading loading-spinner loading-xs ml-2"></span>
      )}
    </div>
  );
}
