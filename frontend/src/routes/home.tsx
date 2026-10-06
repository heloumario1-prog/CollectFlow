import {
  Form,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
} from "react-router";

export async function homeLoader() {
  return { loadedAt: new Date().toLocaleTimeString() };
}

export async function homeAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Please enter a name." };
  }

  return { message: `Hello, ${name}!` };
}

export function HomePage() {
  const { loadedAt } = useLoaderData<typeof homeLoader>();
  const actionData = useActionData<typeof homeAction>();

  return (
    <section className="card">
      <p className="eyebrow">React Router Data Mode</p>
      <h1>Loaders, actions, and route errors</h1>
      <p>The loader rendered this route at {loadedAt}.</p>

      <Form method="post">
        <label htmlFor="name">Test the route action</label>
        <div className="form-row">
          <input id="name" name="name" placeholder="Your name" />
          <button type="submit">Submit</button>
        </div>
      </Form>

      {actionData && "error" in actionData && (
        <p className="feedback error">{actionData.error}</p>
      )}
      {actionData && "message" in actionData && (
        <p className="feedback success">{actionData.message}</p>
      )}
    </section>
  );
}
