import { FieldWrapper } from './fieldWrapper.tsx';
import { useFieldContext } from './formContext.tsx';

interface TextAreaFieldProps {
  hint?: string;
  label: string;
  placeholder?: string;
  rows?: number;
}

export function TextAreaField({
  hint,
  label,
  placeholder,
  rows = 5,
}: TextAreaFieldProps) {
  const field = useFieldContext<string>();
  const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldWrapper hint={hint} label={label}>
      <textarea
        className={`textarea textarea-bordered w-full ${hasError ? 'textarea-error' : ''}`}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        rows={rows}
        value={field.state.value}
      />
    </FieldWrapper>
  );
}
