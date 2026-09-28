import { safeNextPath } from "@/lib/redirect";
import { sendMagicLink } from "./actions";

const ERRORS: Record<string, string> = {
  email: "Enter a valid email address.",
  send: "We couldn't send the link. Wait a minute and try again.",
  link: "That sign-in link is invalid or has expired. Request a new one.",
};

type Props = {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next, sent, error } = await searchParams;
  const nextPath = safeNextPath(next);
  const joining = nextPath.startsWith("/invite/");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Sign in to Chore-App</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {joining
            ? "Sign in to join the household you were invited to."
            : "We'll email you a link. No password needed."}
        </p>
      </div>

      {sent ? (
        <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          Check your email for a sign-in link. You can close this tab.
        </p>
      ) : (
        <form action={sendMagicLink} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={nextPath} />
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded-md bg-black px-3 py-2 text-white">
            Email me a sign-in link
          </button>
        </form>
      )}

      {error && ERRORS[error] && (
        <p role="alert" className="text-sm text-red-600">
          {ERRORS[error]}
        </p>
      )}
    </main>
  );
}
