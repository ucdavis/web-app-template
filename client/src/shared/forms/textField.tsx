import { useFieldContext } from './formContext.tsx';
import { FieldWrapper } from './fieldWrapper.tsx';

interface TextFieldProps {
  label: string;
  placeholder?: string;
}

export function TextField({ label, placeholder }: TextFieldProps) {
  const field = useFieldContext<string>();
  const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldWrapper label={label}>
      <input
        className={`input input-bordered w-full ${
          hasError ? 'input-error' : ''
        }`}
        onChange={(e) => field.handleChange(e.target.value)}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        type="text"
        value={field.state.value}
      />
    </FieldWrapper>
  );
}
