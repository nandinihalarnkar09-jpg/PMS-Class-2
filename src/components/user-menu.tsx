import { Show, UserButton } from "@clerk/nextjs";

export function UserMenu() {
  return (
    <Show when="signed-in">
      <UserButton />
    </Show>
  );
}
