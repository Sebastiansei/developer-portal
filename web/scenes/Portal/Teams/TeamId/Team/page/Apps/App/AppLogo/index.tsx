import { StatusVariant } from "@/components/AppStatus";
import { getCDNImageUrl } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

export const AppLogo = (props: {
  src: string | undefined | null;
  appId: string;
  name: string;
  verification_status: StatusVariant;
}) => {
  const [src, setSrc] = useState<typeof props.src>(
    props.verification_status === "verified" && props.src
      ? getCDNImageUrl(props.appId, props.src)
      : null,
  );

  return (
    <div>
      {src && props.verification_status === "verified" && (
        <Image
          className="size-16"
          src={src}
          alt="team logo"
          onError={() => setSrc(null)}
        />
      )}

      {!src && (
        <div className="flex size-16 items-center justify-center rounded-lg bg-grey-100">
          <span className="text-14 uppercase text-grey-400">
            {props.name[0]}
          </span>
        </div>
      )}
    </div>
  );
};