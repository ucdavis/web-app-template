import { getFieldErrorMessage } from './fieldWrapper.tsx';
import { useFieldContext } from './formContext.tsx';

interface CheckboxFieldProps {
  description?: string;
  label: string;
}

export function CheckboxField({ description, label }: CheckboxFieldProps) {
  const field = useFieldContext<boolean>();
  const hasError = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <div className="form-control">
      <label className="label cursor-pointer justify-start gap-3">
        <input
          checked={field.state.value}
          className={`checkbox checkbox-primary ${hasError ? 'checkbox-error' : ''}`}
          onChange={(event) => field.handleChange(event.target.checked)}
          type="checkbox"
        />
        <span className="label-text font-medium">{label}</span>
      </label>
      {description ? (
        <p className="ml-9 text-sm text-base-content/60">{description}</p>
      ) : null}
      {hasError ? (
        <p className="ml-9 text-sm text-error" role="alert">
          {getFieldErrorMessage(field.state.meta.errors)}
        </p>
      ) : null}
    </div>
  );
}
