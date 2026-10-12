import { FiClock, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import type { PublicLibrarySettings } from "@/information/librarySettings";
import { formatPublicPhone } from "@/information/librarySettings";
import { serviceInfo } from "@/shared/serviceInfo.cjs";

export default function ServiceDetails({
  settings,
}: {
  settings: PublicLibrarySettings;
}) {
  return (
    <>
      <a href={serviceInfo.openStreetMapUrl} target="_blank" rel="noopener noreferrer">
        <FiMapPin aria-hidden="true" /> <span>{settings.address}</span>
      </a>
      <span><FiClock aria-hidden="true" /> <span>{settings.serviceHours}</span></span>
      <a href={`tel:${settings.phoneE164}`}><FiPhone aria-hidden="true" /> <span>{formatPublicPhone(settings.phoneE164)}</span></a>
      <a href={`mailto:${serviceInfo.email}`}><FiMail aria-hidden="true" /> <span>{serviceInfo.email}</span></a>
    </>
  );
}
