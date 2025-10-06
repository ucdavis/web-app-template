import { useFieldContext } from './formContext.tsx';
import { FieldWrapper } from './fieldWrapper.tsx';

interface SelectFieldProps {
  label: string;
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
}

export function SelectField({ label, options, placeholder }: SelectFieldProps) {
  const field = useFieldContext<string>();
  const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldWrapper label={label}>
      <select
        className={`select select-bordered w-full ${
          hasError ? 'select-error' : ''
        }`}
        onChange={(e) => field.handleChange(e.target.value)}
        value={field.state.value || ''}
      >
        <option disabled value="">
          {placeholder ?? `Pick a ${label.toLowerCase()}`}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
