"use client";

import { CircleIconContainer } from "@/components/CircleIconContainer";
import { DecoratedButton } from "@/components/DecoratedButton";
import { Dialog } from "@/components/Dialog";
import { DialogOverlay } from "@/components/DialogOverlay";
import { DialogPanel } from "@/components/DialogPanel";
import { UserAddIcon } from "@/components/Icons/UserAddIcon";
import { TYPOGRAPHY, Typography } from "@/components/Typography";
import { atom, useAtom } from "jotai";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { toast } from "react-toastify";
import { FetchInvitesDocument } from "../List/graphql/client/fetch-invites.generated";
import { useInviteTeamMembersMutation } from "../graphql/client/invite-team-members.generated";
import { EmailsInput } from "./EmailsInput";

export const inviteTeamMemberDialogAtom = atom(false);
export const emailsInputAtom = atom<string[]>([]);

export const InviteTeamMemberDialog = () => {
  const { teamId } = useParams() as { teamId: string };
  const [isOpened, setIsOpened] = useAtom(inviteTeamMemberDialogAtom);
  const [emails, setEmails] = useAtom(emailsInputAtom);

  const onClose = useCallback(() => {
    setIsOpened(false);
    setEmails([]);
  }, [setEmails, setIsOpened]);

  const [inviteTeamMembers, { loading }] = useInviteTeamMembersMutation({
    context: { headers: { team_id: teamId } },
  });

  const handleInvite = useCallback(async () => {
    try {
      await inviteTeamMembers({
        variables: { emails },
        refetchQueries: [FetchInvitesDocument],
      });

      toast.success(`Invites are sent to ${emails.join(", ")}`);
    } catch (error) {
      return toast.error("Error inviting team members");
    }

    onClose();
  }, [emails, inviteTeamMembers, onClose]);

  return (
    <Dialog open={isOpened} onClose={onClose}>
      <DialogOverlay />

      <DialogPanel className="grid max-w-[580px] justify-items-center gap-y-10">
        <div className="grid w-full justify-items-center gap-y-4">
          <CircleIconContainer variant="info">
            <UserAddIcon />
          </CircleIconContainer>

          <Typography
            as="h3"
            variant={TYPOGRAPHY.H6}
            className="mt-4 text-center"
          >
            Invite new team members
          </Typography>

          <Typography as="p" variant={TYPOGRAPHY.R3} className="text-center">
            Add multiple team members by separating them with a comma
          </Typography>
        </div>

        <EmailsInput
          placeholder="andy@example.com, lisa@example.com, etc."
          className="w-full"
        />

        <div className="grid w-full grid-cols-2 gap-x-4">
          <DecoratedButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </DecoratedButton>

          <DecoratedButton
            type="button"
            variant="primary"
            disabled={loading}
            onClick={handleInvite}
          >
            Send invite
          </DecoratedButton>
        </div>
      </DialogPanel>
    </Dialog>
  );
};