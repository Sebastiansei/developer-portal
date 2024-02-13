"use client";

import { CircleIconContainer } from "@/components/CircleIconContainer";
import { DecoratedButton } from "@/components/DecoratedButton";
import { Dialog, DialogProps } from "@/components/Dialog";
import { DialogOverlay } from "@/components/DialogOverlay";
import { DialogPanel } from "@/components/DialogPanel";
import { AlertIcon } from "@/components/Icons/AlertIcon";
import { Input } from "@/components/Input";
import { TYPOGRAPHY, Typography } from "@/components/Typography";
import { Auth0SessionUser } from "@/lib/types";
import { useUser } from "@auth0/nextjs-auth0/client";
import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import * as yup from "yup";
import { useDeleteAccountMutation } from "./graphql/client/delete-account.generated";

const DELETE_WORD = "DELETE";

const schema = yup.object({
  confirmation: yup
    .string()
    .oneOf([DELETE_WORD], "Please check if the input is correct")
    .required("This field is required"),
});

type FormValues = yup.InferType<typeof schema>;

export const DeleteAccountDialog = (props: DialogProps) => {
  const { user } = useUser() as Auth0SessionUser;

  const {
    register,
    handleSubmit,
    formState: { isValid, isSubmitting, errors },
    reset,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  const onClose = useCallback(() => {
    reset();
    props.onClose(false);
  }, [props, reset]);

  const [deleteAccount] = useDeleteAccountMutation({
    context: { headers: { team_id: "" } },
  });

  const submit = useCallback(async () => {
    if (!user?.hasura) return;
    try {
      await deleteAccount({
        variables: {
          user_id: user.hasura.id,
        },
      });
      toast.success("Team leaved!");
    } catch (e) {
      console.error(e);
      toast.error("Error account deleting");
    }
  }, [deleteAccount, user?.hasura]);

  return (
    <Dialog {...props} onClose={onClose}>
      <DialogOverlay />

      <DialogPanel className="grid max-w-[400px] gap-y-8">
        <CircleIconContainer variant="error">
          <AlertIcon />
        </CircleIconContainer>

        <div className="grid gap-y-4">
          <Typography as="h3" variant={TYPOGRAPHY.H6} className="text-center">
            Are you sure?
          </Typography>

          <Typography
            variant={TYPOGRAPHY.R3}
            className="text-center text-grey-500"
          >
            Your account will be deleted, along with all apps and data. You will
            be removed from teams.
          </Typography>

          <div className="grid grid-cols-auto/1fr items-center gap-x-1 justify-self-center rounded-lg bg-system-error-50 px-3 py-2 text-system-error-600">
            <AlertIcon />

            <Typography variant={TYPOGRAPHY.B4}>
              This action cannot be undone.
            </Typography>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(submit)}
          className="mt-2 grid w-full gap-y-10"
        >
          <Input
            register={register("confirmation")}
            errors={errors.confirmation}
            label="To verify, type DELETE below"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-x-4">
            <DecoratedButton
              disabled={!isValid || isSubmitting}
              type="submit"
              variant="danger"
              className="py-3"
            >
              Delete profile
            </DecoratedButton>

            <DecoratedButton
              type="button"
              onClick={onClose}
              variant="primary"
              className="py-3"
              disabled={isSubmitting}
            >
              Keep profile
            </DecoratedButton>
          </div>
        </form>
      </DialogPanel>
    </Dialog>
  );
};