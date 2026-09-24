import { useFieldContext } from './formContext.tsx';
import { FieldWrapper } from './fieldWrapper.tsx';
import { useId } from 'react';

interface TextFieldProps {
  label: string;
  placeholder?: string;
}

export function TextField({ label, placeholder }: TextFieldProps) {
  const controlId = useId();
  const field = useFieldContext<string>();
  const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldWrapper controlId={controlId} label={label}>
      <input
        aria-describedby={hasError ? `${controlId}-error` : undefined}
        aria-invalid={hasError || undefined}
        className={`input input-bordered w-full ${
          hasError ? 'input-error' : ''
        }`}
        id={controlId}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        type="text"
        value={field.state.value}
      />
    </FieldWrapper>
  );
}
