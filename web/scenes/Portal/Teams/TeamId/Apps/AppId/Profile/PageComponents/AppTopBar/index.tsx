"use client";

import { AppStatus, StatusVariant } from "@/components/AppStatus";
import { DecoratedButton } from "@/components/DecoratedButton";
import { TYPOGRAPHY, Typography } from "@/components/Typography";
import { Role_Enum } from "@/graphql/graphql";
import { Auth0SessionUser } from "@/lib/types";
import {
  ReviewMessageDialog,
  reviewMessageDialogOpenedAtom,
} from "@/scenes/Portal/Teams/TeamId/Apps/common/ReviewMessageDialog";
import { ReviewStatus } from "@/scenes/Portal/Teams/TeamId/Apps/common/ReviewStatus";
import { useRemoveFromReview } from "@/scenes/Portal/Teams/TeamId/Apps/common/hooks/use-remove-from-review";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useAtom } from "jotai";
import ErrorComponent from "next/error";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import * as yup from "yup";
import {
  FetchAppMetadataDocument,
  FetchAppMetadataQuery,
} from "../../graphql/client/fetch-app-metadata.generated";
import { useFetchImagesLazyQuery } from "../../graphql/client/fetch-images.generated";
import { unverifiedImageAtom, viewModeAtom } from "../../layout";
import { Environment } from "./Environment";
import { LogoImageUpload } from "./LogoImageUpload";
import { SubmitAppModal } from "./SubmitAppModal";
import { VersionSwitcher } from "./VersionSwitcher";
import { useCreateEditableRowMutation } from "./graphql/client/create-editable-row.generated";

type AppTopBarProps = {
  appId: string;
  teamId: string;
  app: FetchAppMetadataQuery["app"][0];
};

const submitSchema = yup.object().shape({
  name: yup
    .string()
    .required("App name is required")
    .max(50, "App name cannot exceed 50 characters"),
  description_overview: yup
    .string()
    .max(1500, "Overview cannot exceed 1500 characters")
    .required("Description - Overview is required"),
  description_how_it_works: yup
    .string()
    .max(1500, "How it works cannot exceed 1500 characters")
    .required("Description - How it works is required"),
  description_connect: yup
    .string()
    .max(1500, "How to connect cannot exceed 1500 characters")
    .required("Description - How to connect is required"),
  world_app_description: yup
    .string()
    .max(50, "World app description cannot exceed 50 characters")
    .required("World app description is required"),
  logo_img_url: yup.string().required("A logo image is required"),
  hero_image_url: yup.string().optional(),
  showcase_img_urls: yup.array().optional(),
  integration_url: yup
    .string()
    .url("Try it out URL is not a valid url")
    .matches(
      /^https:\/\/(\w+-)*\w+(\.\w+)+([\/\w\-._/?%&#=]*)?$/,
      "Integration URL is not a valid url",
    )
    .required("Try it out URL is required"),
  app_website_url: yup
    .string()
    .url("Official Website URL is not a valid url")
    .matches(/^https:\/\/(\w+-)*\w+(\.\w+)+([\/\w\-._/?%&#=]*)?$/, {
      message: "Official Website URL is not a valid url",
      excludeEmptyString: true,
    })
    .optional(),
  source_code_url: yup
    .string()
    .url("Github URL is not a valid url")
    .matches(/^https:\/\/(\w+-)*\w+(\.\w+)+([\/\w\-._/?%&#=]*)?$/, {
      message: "Github URL is not a valid url",
      excludeEmptyString: true,
    })
    .optional(),
  category: yup.string().required("Category is required"),
  is_developer_allow_listing: yup.boolean(),
});

export const AppTopBar = (props: AppTopBarProps) => {
  const { appId, teamId, app } = props;
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const { user } = useUser() as Auth0SessionUser;

  const [_showReviewMessage, setShowReviewMessage] = useAtom(
    reviewMessageDialogOpenedAtom,
  );

  const appMetaData = useMemo(() => {
    if (viewMode === "verified") {
      return app.verified_app_metadata[0];
    } else {
      // Null check in case app got verified and has no unverified metadata
      return app.app_metadata?.[0] ?? app.verified_app_metadata[0];
    }
  }, [app, viewMode]);

  const { removeFromReview, loading: removeLoading } = useRemoveFromReview({
    metadataId: appMetaData.id,
  });

  const [showSubmitAppModal, setShowSubmitAppModal] = useState(false);
  const [_, setUnverifiedImages] = useAtom(unverifiedImageAtom);

  const isEnoughPermissions = useMemo(() => {
    const membership = user?.hasura.memberships.find(
      (m) => m.team?.id === teamId,
    );
    return (
      membership?.role === Role_Enum.Owner ||
      membership?.role === Role_Enum.Admin
    );
  }, [teamId, user?.hasura.memberships]);

  const isEditable = app?.app_metadata[0]?.verification_status === "unverified";
  const [createEditableRowMutation] = useCreateEditableRowMutation({});

  const hasRequiredImagesForAppStore = useMemo(() => {
    return (appMetaData?.logo_img_url && appMetaData?.hero_image_url) !== "";
  }, [appMetaData.logo_img_url, appMetaData.hero_image_url]);

  const submitForReview = useCallback(async () => {
    if (appMetaData?.verification_status !== "unverified") return;
    try {
      const description = JSON.parse(
        appMetaData.description ? appMetaData.description : "{}",
      );
      await submitSchema.validate(
        { ...appMetaData, ...description },
        { abortEarly: false },
      );
      setShowSubmitAppModal(true);
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        toast.error(error.errors[0]);
        return;
      } else {
        console.error(error);
        toast.error("Error occurred while submitting app for review");
      }
    }
  }, [appMetaData]);

  const [fetchImagesQuery] = useFetchImagesLazyQuery();

  const createNewDraft = useCallback(async () => {
    try {
      if (!app || app?.app_metadata?.length > 0) {
        throw new Error("Your app must be already verified for this action");
      }
      await createEditableRowMutation({
        variables: {
          app_id: appId,
          name: appMetaData.name,
          description: appMetaData.description,
          world_app_description: appMetaData.world_app_description,
          category: appMetaData.category,
          is_developer_allow_listing: appMetaData.is_developer_allow_listing,
          app_website_url: appMetaData.app_website_url,
          source_code_url: appMetaData.source_code_url,
          integration_url: appMetaData.integration_url,
          logo_img_url: `logo_img.${_getImageEndpoint(
            appMetaData.logo_img_url,
          )}`,
          hero_image_url: `hero_image.${_getImageEndpoint(
            appMetaData.hero_image_url,
          )}`,
          showcase_img_urls: `{${appMetaData.showcase_img_urls
            ?.map(
              (img: string, index: number) =>
                `showcase_img_${index + 1}.${_getImageEndpoint(img)}`,
            )
            .join(",")}}`,
          verification_status: "unverified",
        },
        context: { headers: { team_id: teamId } },
        refetchQueries: [FetchAppMetadataDocument],
        awaitRefetchQueries: true,
      });

      await fetchImagesQuery({
        variables: {
          id: appId,
        },
        context: { headers: { team_id: teamId } },
        onCompleted: (data) => {
          setUnverifiedImages({
            logo_img_url: data?.unverified_images?.logo_img_url ?? "",
            hero_image_url: data?.unverified_images?.hero_image_url ?? "",
            showcase_image_urls: data?.unverified_images?.showcase_img_urls,
          });
        },
      });

      setViewMode("unverified");
      toast.success("New app draft created");
    } catch (error: any) {
      console.error(error.message);
      toast.error("Error creating a new draft");
    }
  }, [
    app,
    appId,
    appMetaData.app_website_url,
    appMetaData.category,
    appMetaData.description,
    appMetaData.hero_image_url,
    appMetaData.integration_url,
    appMetaData.is_developer_allow_listing,
    appMetaData.logo_img_url,
    appMetaData.name,
    appMetaData.showcase_img_urls,
    appMetaData.source_code_url,
    appMetaData.world_app_description,
    createEditableRowMutation,
    fetchImagesQuery,
    setUnverifiedImages,
    setViewMode,
    teamId,
  ]);

  // Helper function to ensure uploaded images are png or jpg. Otherwise hasura trigger will fail
  const _getImageEndpoint = (imageType: string) => {
    const fileType = imageType.split(".").pop();
    if (fileType === "png" || fileType === "jpg") {
      return fileType;
    } else {
      throw new Error("Unsupported image file type");
    }
  };

  if (!appMetaData) return <ErrorComponent statusCode={404}></ErrorComponent>;
  return (
    <div className="grid gap-y-5">
      {["changes_requested", "verified"].includes(
        appMetaData.verification_status,
      ) && (
        <ReviewStatus
          status={
            appMetaData.verification_status as "changes_requested" | "verified"
          }
          message={appMetaData.review_message}
        />
      )}
      <SubmitAppModal
        open={showSubmitAppModal}
        setOpen={setShowSubmitAppModal}
        appMetadataId={appMetaData.id}
        canSubmitAppStore={hasRequiredImagesForAppStore}
        teamId={teamId}
        appId={appId}
        isDeveloperAllowListing={appMetaData?.is_developer_allow_listing}
      />
      <div className="grid grid-cols-auto/1fr/auto items-center gap-x-8">
        <ReviewMessageDialog
          message={appMetaData.review_message}
          metadataId={appMetaData.id}
        />
        <LogoImageUpload
          appId={appId}
          teamId={teamId}
          appMetadataId={appMetaData.id}
          editable={isEditable && isEnoughPermissions}
          logoFile={appMetaData.logo_img_url}
        />
        <div className="grid grid-cols-1 gap-y-1">
          <div className="flex flex-row items-center gap-x-3">
            <Typography variant={TYPOGRAPHY.H6}>{appMetaData.name}</Typography>
            <AppStatus
              status={appMetaData.verification_status as StatusVariant}
            />
          </div>
          <Environment
            environment={app.is_staging ? "staging" : "production"}
            engine={app.engine}
          />
        </div>
        {isEnoughPermissions && (
          <div className="grid grid-cols-auto/1fr items-center gap-x-3">
            {app.verified_app_metadata.length > 0 && (
              <VersionSwitcher app={app} />
            )}
            {isEditable ? (
              <DecoratedButton
                type="submit"
                className="h-12 px-6 py-3"
                disabled={viewMode === "verified"}
                onClick={submitForReview}
              >
                <Typography variant={TYPOGRAPHY.M3}>
                  Submit for review
                </Typography>
              </DecoratedButton>
            ) : app?.app_metadata?.length === 0 ? (
              <DecoratedButton
                type="submit"
                className="h-12 px-6 py-3"
                onClick={createNewDraft}
              >
                <Typography variant={TYPOGRAPHY.M3}>
                  Create new draft
                </Typography>
              </DecoratedButton>
            ) : (
              <DecoratedButton
                type="submit"
                className="h-12 px-6 py-3"
                disabled={removeLoading}
                onClick={removeFromReview}
              >
                <Typography variant={TYPOGRAPHY.M3}>
                  Remove from review
                </Typography>
              </DecoratedButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
};