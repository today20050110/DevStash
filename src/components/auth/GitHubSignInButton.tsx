import { signInWithGitHub } from "@/actions/auth";
import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { Button } from "@/components/ui/button";

interface GitHubSignInButtonProps {
  callbackUrl: string;
  label?: string;
}

export function GitHubSignInButton({
  callbackUrl,
  label = "Sign in with GitHub",
}: GitHubSignInButtonProps) {
  return (
    <form action={signInWithGitHub}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Button type="submit" variant="outline" className="w-full">
        <GitHubIcon />
        {label}
      </Button>
    </form>
  );
}
