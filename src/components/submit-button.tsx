"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = ComponentProps<typeof Button> & { pending?: boolean };

/** Submit button that disables itself while its form is being sent. */
export function SubmitButton({
  disabled,
  pending = false,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      block
      disabled={pending || disabled}
      aria-busy={pending}
      {...props}
    />
  );
}
