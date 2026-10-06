import { FiClock, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { serviceInfo } from "@/shared/serviceInfo.cjs";

export default function ServiceDetails() {
  return (
    <>
      <a href={serviceInfo.openStreetMapUrl} target="_blank" rel="noopener noreferrer">
        <FiMapPin aria-hidden="true" /> <span>{serviceInfo.address}</span>
      </a>
      <span><FiClock aria-hidden="true" /> <span>{serviceInfo.hours}</span></span>
      <a href={serviceInfo.phoneUrl}><FiPhone aria-hidden="true" /> <span>{serviceInfo.phone}</span></a>
      <a href={`mailto:${serviceInfo.email}`}><FiMail aria-hidden="true" /> <span>{serviceInfo.email}</span></a>
    </>
  );
}
