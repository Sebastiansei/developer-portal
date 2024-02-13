"use client";
import ErrorComponent from "next/error";
import Skeleton from "react-loading-skeleton";
import { ActionsHeader } from "../../Common/ActionsHeader";
import { Debugger } from "../Debugger";
import { useDebuggerQuery } from "./graphql/client/debugger.generated";

type ActionIdSettingsPageProps = {
  params: Record<string, string> | null | undefined;
  searchParams: Record<string, string> | null | undefined;
};

export const ActionIdProofDebugingPage = ({
  params,
}: ActionIdSettingsPageProps) => {
  const appId = params?.appId;
  const teamId = params?.teamId;
  const actionID = params?.actionId;

  const { data, loading } = useDebuggerQuery({
    variables: {
      action_id: actionID ?? "",
    },
    context: { headers: { team_id: teamId } },
  });

  const action = data?.action[0];

  if (!loading && !action) {
    return (
      <ErrorComponent
        statusCode={404}
        title="Action not found"
      ></ErrorComponent>
    );
  } else {
    return (
      <div className="flex size-full flex-col items-center ">
        <div className="grid w-full max-w-[1180px] gap-y-2 py-10">
          <ActionsHeader actionId={actionID} teamId={teamId} appId={appId} />
          <hr className="my-5 w-full border-dashed text-grey-200" />
          {loading ? (
            <div className="grid grid-cols-1fr/auto gap-x-16">
              <Skeleton count={5} />
              <Skeleton height={250} className="md:w-[480px]" />
            </div>
          ) : (
            <Debugger action={action!} appID={appId ?? ""} />
          )}
        </div>
      </div>
    );
  }
};