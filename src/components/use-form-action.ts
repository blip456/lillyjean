"use client";

import { type FormEvent, startTransition, useActionState } from "react";

import { type FormState, initialFormState } from "@/lib/auth/form-state";

type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Runs a Server Action from a form without React's automatic form reset, so people keep
 * what they typed when the action returns an error. Includes the clicked submit button's
 * name/value (e.g. "No goal, just reading").
 */
export function useFormAction(action: FormAction) {
  const [state, dispatch, pending] = useActionState(action, initialFormState);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };

  return { state, onSubmit, pending };
}
