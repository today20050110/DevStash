import { signInWithGitHub } from "@/actions/auth";
import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { Button } from "@/components/ui/button";

export function GitHubSignInButton({ callbackUrl }: { callbackUrl: string }) {
  return (
    <form action={signInWithGitHub}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Button type="submit" variant="outline" className="w-full">
        <GitHubIcon />
        Sign in with GitHub
      </Button>
    </form>
  );
}
