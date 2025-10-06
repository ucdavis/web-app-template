import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/(authenticated)/styles')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Homepage Link */}
      <div className="absolute top-4 left-4 z-10">
        <Link className="btn btn-ghost btn-sm" to="/">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          Home
        </Link>
      </div>

      <div className="w-full max-w-1/2 space-y-8">
        {/* Typography */}
        <section>
          <h1>Heading 1</h1>
          <h2>Heading 2</h2>
          <h3>Heading 3</h3>
          <p>This is a paragraph of base text.</p>
          <p>This is small, muted text.</p>
        </section>

        {/* Buttons */}
        <section className="space-x-2">
          <button className="btn btn-primary">Primary</button>
          <button className="btn btn-secondary">Secondary</button>
          <button className="btn btn-accent">Accent</button>
          <button className="btn btn-outline">Outline</button>
          <button className="btn btn-disabled">Disabled</button>
        </section>

        {/* Inputs */}
        <section className="space-y-2">
          <input
            className="input input-bordered w-full max-w-xs"
            placeholder="Text input"
            type="text"
          />
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Page title</legend>
            <input
              className="input"
              placeholder="My awesome page"
              type="text"
            />
            <p className="label">
              You can edit page title later on from settings
            </p>
          </fieldset>
          <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
            <legend className="fieldset-legend">Page details</legend>

            <label className="label">Title</label>
            <input
              className="input"
              placeholder="My awesome page"
              type="text"
            />

            <label className="label">Slug</label>
            <input
              className="input"
              placeholder="my-awesome-page"
              type="text"
            />

            <label className="label">Author</label>
            <input className="input" placeholder="Name" type="text" />
          </fieldset>
          <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
            <legend className="fieldset-legend">Settings</legend>
            <div className="join">
              <input
                className="input join-item"
                placeholder="Product name"
                type="text"
              />
              <button className="btn join-item">save</button>
            </div>
          </fieldset>
        </section>

        {/* Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title">Card Title</h2>
              <p>This is a card with some content and a button.</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary">Go</button>
              </div>
            </div>
          </div>
          <div className="card bg-neutral text-neutral-content">
            <div className="card-body">
              <h2 className="card-title">Dark Card</h2>
              <p>This one uses the neutral theme colors.</p>
            </div>
          </div>
        </section>

        {/* Alerts */}
        <section className="space-y-2">
          <div className="alert alert-info">
            <span>Info alert message</span>
          </div>
          <div className="alert alert-success">
            <span>Success alert message</span>
          </div>
          <div className="alert alert-warning">
            <span>Warning alert message</span>
          </div>
          <div className="alert alert-error">
            <span>Error alert message</span>
          </div>
        </section>

        {/* Badges */}
        <section className="space-x-2">
          <div className="badge badge-primary">Primary</div>
          <div className="badge badge-secondary">Secondary</div>
          <div className="badge badge-accent">Accent</div>
          <div className="badge badge-outline">Outline</div>
        </section>
      </div>
    </div>
  );
}
