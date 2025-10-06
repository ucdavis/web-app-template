import { useFormContext } from './formContext.tsx';

export function SubscribeButton({ label }: { label: string }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <button
          className="btn btn-primary w-full"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-xs mr-2"></span>
              Submitting...
            </>
          ) : (
            label
          )}
        </button>
      )}
    </form.Subscribe>
  );
}
